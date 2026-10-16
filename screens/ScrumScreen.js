import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getScrumRecents, saveScrumRecents } from '../lib/store';
import { AppButton } from './Button';
import { colors, fonts, styles } from './theme';

const ACTIVITIES = [
  { key: 'story-start', label: 'Start story testing', fields: ['story'] },
  { key: 'story-continue', label: 'Continue story testing', fields: ['story'] },
  { key: 'story-finish', label: 'Finish story testing', fields: ['story'] },
  { key: 'bugfix', label: 'Verify bug fixes', fields: ['story'] },
  { key: 'e2e-improvements', label: 'Work on E2E improvements', fields: [] },
  { key: 'task', label: 'Work on a task', fields: ['task'] },
  { key: 'build', label: 'Test a build', fields: ['platform', 'release', 'story'] },
  { key: 'release-start', label: 'Start release testing', fields: ['release'] },
  { key: 'release-continue', label: 'Continue release testing', fields: ['release'] },
  { key: 'release-finish', label: 'Finish release testing', fields: ['release'] },
];

const ACTIVITY_GROUPS = [
  { title: 'Story testing', keys: ['story-start', 'story-continue', 'story-finish', 'bugfix'] },
  { title: 'Builds & releases', keys: ['build', 'release-start', 'release-continue', 'release-finish'] },
  { title: 'Other work', keys: ['e2e-improvements', 'task'] },
];

const EMPTY_VALUES = { story: '', release: '', task: '', platform: 'Mobile' };

function sentenceFor(row, period, pastPrefix = 'Gestern') {
  const { story, release, task, platform } = row.values;
  const yesterday = period === 'yesterday';
  switch (row.key) {
    case 'task':
      return yesterday
        ? `${pastPrefix} habe ich an der Aufgabe ${task} gearbeitet.`
        : `Heute werde ich an der Aufgabe ${task} arbeiten.`;
    case 'story-start':
      return yesterday
        ? `${pastPrefix} habe ich mit den Tests für ${story} begonnen.`
        : `Heute werde ich mit den Tests für ${story} beginnen.`;
    case 'story-continue':
      return yesterday
        ? `${pastPrefix} habe ich mit den Tests für ${story} weitergemacht.`
        : `Heute werde ich mit den Tests für ${story} weitermachen.`;
    case 'story-finish':
      return yesterday
        ? `${pastPrefix} habe ich die Tests für ${story} abgeschlossen.`
        : `Heute werde ich die Tests für ${story} abschließen.`;
    case 'bugfix':
      return yesterday
        ? `${pastPrefix} habe ich die Bugfixes für ${story} verifiziert.`
        : `Heute werde ich die Bugfixes für ${story} verifizieren.`;
    case 'e2e-improvements':
      return yesterday
        ? `${pastPrefix} habe ich an E2E-Verbesserungen gearbeitet.`
        : 'Heute werde ich an E2E-Verbesserungen arbeiten.';
    case 'build':
      if (story) {
        return yesterday
          ? `${pastPrefix} habe ich ${story} im ${platform} Build für Release ${release} getestet.`
          : `Heute werde ich ${story} im ${platform} Build für Release ${release} testen.`;
      }
      return yesterday
        ? `${pastPrefix} habe ich den ${platform} Build für Release ${release} getestet.`
        : `Heute werde ich den ${platform} Build für Release ${release} testen.`;
    case 'release-start':
      return yesterday
        ? `${pastPrefix} habe ich mit den Tests für Release ${release} begonnen.`
        : `Heute werde ich mit den Tests für Release ${release} beginnen.`;
    case 'release-continue':
      return yesterday
        ? `${pastPrefix} habe ich mit den Release-Tests für ${release} weitergemacht.`
        : `Heute werde ich mit den Release-Tests für ${release} weitermachen.`;
    case 'release-finish':
      return yesterday
        ? `${pastPrefix} habe ich die Release-Tests für ${release} abgeschlossen.`
        : `Heute werde ich die Release-Tests für ${release} abschließen.`;
    default:
      return '';
  }
}

function isComplete(row) {
  if (!row.selected) return false;
  return row.fields
    .filter((field) => field !== 'platform' && !(row.key === 'build' && field === 'story'))
    .every((field) => row.values[field].trim());
}

function joinPeriod(rows, period, pastPrefix = 'Gestern') {
  return rows.filter(isComplete).map((row, index) => {
    const sentence = sentenceFor(row, period, pastPrefix);
    if (index === 0) return sentence;
    return period === 'yesterday'
      ? sentence.replace(`${pastPrefix} habe ich `, 'Außerdem habe ich ')
      : sentence.replace(/^Heute /, 'Außerdem ');
  });
}

function sameValue(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function joinToday(rows, yesterdayRows) {
  const completedYesterday = yesterdayRows.filter(isComplete);
  return rows.filter(isComplete).map((row, index) => {
    const repeatsStory =
      row.key === 'story-continue' &&
      completedYesterday.some(
        (previous) =>
          ['story-start', 'story-continue'].includes(previous.key) &&
          sameValue(previous.values.story, row.values.story)
      );
    const repeatsRelease =
      row.key === 'release-continue' &&
      completedYesterday.some(
        (previous) =>
          ['release-start', 'release-continue'].includes(previous.key) &&
          sameValue(previous.values.release, row.values.release)
      );
    const continuesE2e =
      row.key === 'e2e-improvements' &&
      completedYesterday.some((previous) => previous.key === 'e2e-improvements');

    if (repeatsStory || repeatsRelease || continuesE2e) {
      return index === 0
        ? continuesE2e
          ? 'Heute werde ich weiter daran arbeiten.'
          : 'Heute werde ich damit weitermachen.'
        : continuesE2e
          ? 'Außerdem werde ich weiter daran arbeiten.'
          : 'Außerdem werde ich damit weitermachen.';
    }

    const sentence = sentenceFor(row, 'today');
    return index === 0 ? sentence : sentence.replace(/^Heute /, 'Außerdem ');
  });
}

export default function ScrumScreen() {
  const [yesterday, setYesterday] = useState([]);
  const [today, setToday] = useState([]);
  const [recents, setRecents] = useState({ stories: [], releases: [], tasks: [] });
  const [pickerPeriod, setPickerPeriod] = useState(null);
  const nextRowId = useRef(0);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [fridayKurzarbeit, setFridayKurzarbeit] = useState(false);
  const isMonday = new Date().getDay() === 1;
  const previousTitle = isMonday
    ? (fridayKurzarbeit ? 'Previous work · Thursday' : 'Previous work · Friday')
    : 'Yesterday';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getScrumRecents().then((values) => {
        if (active) setRecents(values);
      }).catch(() => {});
      return () => { active = false; };
    }, [])
  );

  const liveValues = useMemo(() => {
    const all = [...yesterday, ...today].filter((row) => row.selected);
    const unique = (values) => [...new Set(values.filter(Boolean))];
    return {
      stories: unique(all.map((row) => row.values.story.trim())),
      releases: unique(all.map((row) => row.values.release.trim())),
      tasks: unique(all.map((row) => row.values.task).filter((task) => task.trim())),
    };
  }, [yesterday, today]);

  function updateRows(setRows, rowIndex, patch) {
    setOutput('');
    setError('');
    setRows((rows) =>
      rows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              ...patch,
              values: patch.values ? { ...row.values, ...patch.values } : row.values,
            }
          : row
      )
    );
  }

  function addActivity(activity) {
    const setRows = pickerPeriod === 'yesterday' ? setYesterday : setToday;
    const row = {
      ...activity,
      id: nextRowId.current++,
      selected: true,
      values: { ...EMPTY_VALUES },
    };
    setRows((rows) => [...rows, row]);
    setPickerPeriod(null);
    setOutput('');
    setError('');
  }

  function removeActivity(setRows, rowIndex) {
    setRows((rows) => rows.filter((_, index) => index !== rowIndex));
    setOutput('');
    setError('');
  }

  function openPicker(period) {
    Keyboard.dismiss();
    setPickerPeriod(period);
  }

  async function buildUpdate() {
    const selected = [...yesterday, ...today].filter((row) => row.selected);
    if (!selected.length) {
      setError('Select at least one activity.');
      return;
    }
    const incomplete = selected.some((row) => !isComplete(row));
    if (incomplete) {
      setError('Add the required task, story or release names.');
      return;
    }
    const pastPrefix = isMonday
      ? fridayKurzarbeit
        ? 'Am Donnerstag'
        : 'Am Freitag'
      : 'Gestern';
    const sentences = [
      ...(isMonday && fridayKurzarbeit ? ['Am Freitag hatte ich Kurzarbeit.'] : []),
      ...joinPeriod(yesterday, 'yesterday', pastPrefix),
      ...joinToday(today, yesterday),
    ];
    setError('');
    setOutput(sentences.join(' '));
    try {
      setRecents(await saveScrumRecents(liveValues));
    } catch {
      setError('Your update is ready, but recent names could not be saved.');
    }
  }

  async function shareUpdate() {
    if (!output.trim()) return;
    await Share.share({ message: output.trim() });
  }

  function clearAll() {
    setYesterday([]);
    setToday([]);
    setOutput('');
    setError('');
    setFridayKurzarbeit(false);
  }

  return (
    <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.body, { color: colors.muted, marginBottom: 4 }]}>
        Select what you did and what you plan to do.
      </Text>

      <ActivitySection
        title={previousTitle}
        icon="clock"
        rows={yesterday}
        setRows={setYesterday}
        updateRows={updateRows}
        onAdd={() => openPicker('yesterday')}
        onRemove={(index) => removeActivity(setYesterday, index)}
        recents={recents}
        liveValues={liveValues}
      />
      {isMonday ? (
        <Pressable
          onPress={() => {
            setFridayKurzarbeit((value) => !value);
            setOutput('');
          }}
          style={[
            styles.card,
            {
              padding: 13,
              borderColor: fridayKurzarbeit ? colors.accentOutline : colors.border,
            },
          ]}
        >
          <View style={[styles.row, { gap: 10 }]}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: fridayKurzarbeit ? colors.primary : colors.elevated,
              }}
            >
              <Feather
                name={fridayKurzarbeit ? 'check' : 'plus'}
                size={15}
                color={fridayKurzarbeit ? colors.onPrimary : colors.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeading}>Friday was Kurzarbeit</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 }}>
                Previous work will refer to Thursday.
              </Text>
            </View>
          </View>
        </Pressable>
      ) : null}
      <ActivitySection
        title="Today"
        icon="sun"
        rows={today}
        setRows={setToday}
        updateRows={updateRows}
        onAdd={() => openPicker('today')}
        onRemove={(index) => removeActivity(setToday, index)}
        recents={recents}
        liveValues={liveValues}
      />

      {error ? (
        <View style={[styles.errorBox, { marginTop: 14 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <AppButton title="Build update" onPress={buildUpdate} style={{ marginTop: 16 }} />

      {output ? (
        <View style={[styles.card, { marginTop: 14 }]}>
          <Text style={styles.sectionLabel}>Your update</Text>
          <TextInput
            style={[styles.input, styles.multiline, { backgroundColor: colors.bg }]}
            value={output}
            onChangeText={setOutput}
            multiline
          />
          <AppButton
            title="Share / copy"
            icon="share-2"
            variant="outline"
            onPress={shareUpdate}
            style={{ marginTop: 10 }}
          />
          <AppButton
            title="Clear"
            icon="trash-2"
            variant="outline"
            onPress={clearAll}
            style={{ marginTop: 10 }}
          />
        </View>
      ) : null}
    </ScrollView>
    <ActivityPicker
      period={pickerPeriod}
      title={pickerPeriod === 'yesterday' ? previousTitle : 'Today'}
      onClose={() => setPickerPeriod(null)}
      onSelect={addActivity}
    />
    </>
  );
}

function ActivitySection({ title, icon, rows, setRows, updateRows, recents, liveValues, onAdd, onRemove }) {
  return (
    <View style={{ marginTop: 20 }}>
      <View style={[styles.row, { gap: 7, marginBottom: 8 }]}>
        <Feather name={icon} size={15} color={colors.ok} />
        <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>{title}</Text>
      </View>
      {rows.map((row, index) => (
        <ActivityRow
          key={row.id}
          row={row}
          onRemove={() => onRemove(index)}
          onValue={(field, value) => updateRows(setRows, index, { values: { [field]: value } })}
          suggestions={{
            stories: [...liveValues.stories, ...recents.stories],
            releases: [...liveValues.releases, ...recents.releases],
            tasks: [...liveValues.tasks, ...recents.tasks],
          }}
        />
      ))}
      <AppButton title="Add activity" icon="plus" variant="outline" onPress={onAdd} />
    </View>
  );
}

function ActivityRow({ row, onRemove, onValue, suggestions }) {
  return (
    <View
      style={[
        styles.card,
        {
          padding: 13,
          marginBottom: 8,
          borderColor: row.selected ? colors.accentOutline : colors.border,
        },
      ]}
    >
      <View style={[styles.row, { gap: 10, minHeight: 30 }]}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: row.selected ? colors.primary : colors.elevated,
          }}
        >
          <Feather
            name={row.selected ? 'check' : 'plus'}
            size={15}
            color={row.selected ? colors.onPrimary : colors.muted}
          />
        </View>
        <Text style={[styles.cardHeading, { flex: 1 }]}>{row.label}</Text>
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${row.label}`}
          style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="x" size={16} color={colors.muted} />
        </Pressable>
      </View>

      {row.selected ? (
        <View style={{ marginTop: 10, gap: 9 }}>
          {row.fields.includes('task') ? (
            <View>
              <ValueField
                label="Task name"
                value={row.values.task}
                onChange={(value) => onValue('task', value)}
                suggestions={suggestions.tasks}
                preserveCase
              />
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 }}>
                Task name is kept exactly as entered.
              </Text>
            </View>
          ) : null}
          {row.fields.includes('platform') ? (
            <View style={styles.segmentWrap}>
              {['Mobile', 'Web'].map((platform) => {
                const active = row.values.platform === platform;
                return (
                  <Pressable
                    key={platform}
                    onPress={() => onValue('platform', platform)}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text style={active ? styles.segmentTextActive : styles.segmentText}>
                      {platform}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {row.fields.includes('story') ? (
            <ValueField
              label={row.key === 'build' ? 'Story name (optional)' : 'Story name'}
              value={row.values.story}
              onChange={(value) => onValue('story', value)}
              suggestions={suggestions.stories}
            />
          ) : null}
          {row.fields.includes('release') ? (
            <ValueField
              label="Release"
              value={row.values.release}
              onChange={(value) => onValue('release', value)}
              suggestions={suggestions.releases}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ValueField({ label, value, onChange, suggestions, preserveCase = false }) {
  const unique = [...new Set(suggestions.filter((item) => item && item !== value))].slice(0, 4);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={colors.faint}
        autoCapitalize={preserveCase ? 'none' : 'sentences'}
        autoCorrect={preserveCase ? false : undefined}
      />
      {unique.length ? (
        <View style={[styles.row, { flexWrap: 'wrap', gap: 6, marginTop: 7 }]}>
          {unique.map((item) => (
            <Pressable
              key={item}
              onPress={() => onChange(item)}
              style={{
                paddingHorizontal: 9,
                paddingVertical: 6,
                borderRadius: 9,
                backgroundColor: colors.elevated,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ActivityPicker({ period, title, onClose, onSelect }) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState('Other work');

  return (
    <Modal
      visible={period !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setExpanded('Other work')}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)', paddingTop: insets.top + 20 }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close activity picker"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{ backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16), maxHeight: '100%' }}
        >
          <View style={{ width: 36, height: 4, borderRadius: 4, backgroundColor: colors.muted, alignSelf: 'center', marginBottom: 16 }} />
          <View style={[styles.row, { gap: 8 }]}>
            <Text accessibilityRole="header" style={[styles.cardHeading, { fontSize: 20, flex: 1 }]}>
              Add activity · {title}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close activity picker" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
            {ACTIVITY_GROUPS.map((group) => (
              <View key={group.title} style={{ borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 10 }}>
                <Pressable
                  onPress={() => setExpanded(expanded === group.title ? null : group.title)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expanded === group.title }}
                  style={[styles.row, { minHeight: 44, gap: 10 }]}
                >
                  <Text style={[styles.cardHeading, { flex: 1 }]}>{group.title}</Text>
                  <Feather name={expanded === group.title ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                </Pressable>
                {expanded === group.title ? group.keys.map((key) => {
                  const activity = ACTIVITIES.find((item) => item.key === key);
                  return (
                    <Pressable key={key} onPress={() => onSelect(activity)} accessibilityRole="button" style={[styles.row, { minHeight: 48, gap: 10, paddingHorizontal: 8, paddingVertical: 10 }]}>
                      <Feather name="plus" size={15} color={colors.muted} />
                      <Text style={[styles.body, { flex: 1 }]}>{activity.label}</Text>
                    </Pressable>
                  );
                }) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
