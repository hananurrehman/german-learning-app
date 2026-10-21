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

const TESTING_ACTIVITIES = [
  { key: 'story', label: 'Story testing', fields: ['platform', 'story'] },
  { key: 'build', label: 'Build testing', fields: ['platform', 'release', 'story'] },
  { key: 'release', label: 'Release testing', fields: ['platform', 'release'] },
];
const STAGES = ['start', 'continue', 'finish'];
const ACTIVITIES = [
  ...TESTING_ACTIVITIES.flatMap((activity) => STAGES.map((stage) => ({
    ...activity,
    key: `${activity.key}-${stage}`,
  }))),
  { key: 'bugfix', label: 'Verify bug fixes', fields: ['story'] },
  { key: 'e2e-improvements', label: 'Work on E2E improvements', fields: [] },
  { key: 'task', label: 'Work on a task', fields: ['task'] },
];

const ACTIVITY_GROUPS = [
  { title: 'Testing', keys: ['story-start', 'build-start', 'release-start'] },
  { title: 'Other work', keys: ['bugfix', 'e2e-improvements', 'task'] },
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
    case 'build-start':
    case 'build-continue':
    case 'build-finish': {
      const target = `die Tests ${story.trim() ? `für ${story.trim()} im ${platform}-Build` : `des ${platform}-Builds`}${release.trim() ? ` für Release ${release.trim()}` : ''}`;
      const stage = row.key.split('-')[1];
      const verb = stage === 'start'
        ? (yesterday ? 'begonnen' : 'beginnen')
        : stage === 'finish'
          ? (yesterday ? 'abgeschlossen' : 'abschließen')
          : (yesterday ? 'fortgesetzt' : 'fortsetzen');
      return yesterday
        ? `${pastPrefix} habe ich ${target} ${verb}.`
        : `Heute werde ich ${target} ${verb}.`;
    }
    case 'release-start':
      return yesterday
        ? `${pastPrefix} habe ich mit den ${platform}-Release-Tests für ${release} begonnen.`
        : `Heute werde ich mit den ${platform}-Release-Tests für ${release} beginnen.`;
    case 'release-continue':
      return yesterday
        ? `${pastPrefix} habe ich mit den ${platform}-Release-Tests für ${release} weitergemacht.`
        : `Heute werde ich mit den ${platform}-Release-Tests für ${release} weitermachen.`;
    case 'release-finish':
      return yesterday
        ? `${pastPrefix} habe ich die ${platform}-Release-Tests für ${release} abgeschlossen.`
        : `Heute werde ich die ${platform}-Release-Tests für ${release} abschließen.`;
    default:
      return '';
  }
}

function isComplete(row) {
  if (!row.selected) return false;
  return row.fields
    .filter((field) => field !== 'platform' && !row.key.startsWith('build-'))
    .every((field) => row.values[field].trim());
}

function englishSentenceFor(row, period, pastPrefix = 'Gestern') {
  const { story, release, task, platform } = row.values;
  const past = period === 'yesterday';
  const prefix = past
    ? ({ 'Am Donnerstag': 'On Thursday', 'Am Freitag': 'On Friday' }[pastPrefix] || 'Yesterday')
    : 'Today';
  const subject = `${prefix} I${past ? '' : ' will'}`;
  if (row.key === 'task') return `${subject} ${past ? 'worked' : 'work'} on the task ${task}.`;
  if (row.key === 'bugfix') return `${subject} ${past ? 'verified' : 'verify'} the bug fixes for ${story}.`;
  if (row.key === 'e2e-improvements') return `${subject} ${past ? 'worked' : 'work'} on E2E improvements.`;
  const [kind, stage] = row.key.split('-');
  const target = kind === 'story'
    ? `testing ${story}`
    : kind === 'release'
      ? `${platform} release testing for ${release}`
      : `testing ${story.trim() ? `${story.trim()} in the ${platform} build` : `the ${platform} build`}${release.trim() ? ` for release ${release.trim()}` : ''}`;
  const verb = stage === 'start' ? (past ? 'started' : 'start')
    : stage === 'finish' ? (past ? 'finished' : 'finish') : (past ? 'continued' : 'continue');
  return `${subject} ${verb} ${target}.`;
}

function joinPeriod(rows, period, pastPrefix = 'Gestern', english = false) {
  return rows.filter(isComplete).map((row, index) => {
    const sentence = english ? englishSentenceFor(row, period, pastPrefix) : sentenceFor(row, period, pastPrefix);
    if (index === 0) return sentence;
    if (english) return period === 'yesterday'
      ? sentence.replace(/^(Yesterday|On Thursday|On Friday) I /, 'I also ')
      : sentence.replace(/^Today I will /, 'I will also ');
    return period === 'yesterday'
      ? sentence.replace(`${pastPrefix} habe ich `, 'Außerdem habe ich ')
      : sentence.replace(/^Heute /, 'Außerdem ');
  });
}

function sameValue(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function joinToday(rows, yesterdayRows, english = false) {
  const completedYesterday = yesterdayRows.filter(isComplete);
  const completedToday = rows.filter(isComplete);
  const unambiguous = completedYesterday.length === 1 && completedToday.length === 1;
  return completedToday.map((row, index) => {
    const repeatsStory =
      row.key === 'story-continue' &&
      completedYesterday.some(
        (previous) =>
          ['story-start', 'story-continue'].includes(previous.key) &&
          sameValue(previous.values.platform, row.values.platform) &&
          sameValue(previous.values.story, row.values.story)
      );
    const repeatsRelease =
      row.key === 'release-continue' &&
      completedYesterday.some(
        (previous) =>
          ['release-start', 'release-continue'].includes(previous.key) &&
          sameValue(previous.values.platform, row.values.platform) &&
          sameValue(previous.values.release, row.values.release)
      );
    const repeatsBuild =
      row.key === 'build-continue' &&
      completedYesterday.some((previous) =>
        ['build-start', 'build-continue'].includes(previous.key) &&
        ['platform', 'release', 'story'].every((field) =>
          sameValue(previous.values[field], row.values[field])
        )
      );
    const continuesE2e =
      row.key === 'e2e-improvements' &&
      completedYesterday.some((previous) => previous.key === 'e2e-improvements');

    if ((unambiguous && (repeatsStory || repeatsRelease || repeatsBuild)) || continuesE2e) {
      if (english) return `${index === 0 ? 'Today I will' : 'I will also'} ${continuesE2e ? 'continue working on it' : 'continue with it'}.`;
      return index === 0
        ? continuesE2e
          ? 'Heute werde ich weiter daran arbeiten.'
          : 'Heute werde ich damit weitermachen.'
        : continuesE2e
          ? 'Außerdem werde ich weiter daran arbeiten.'
          : 'Außerdem werde ich damit weitermachen.';
    }

    const sentence = english ? englishSentenceFor(row, 'today') : sentenceFor(row, 'today');
    if (english) return index === 0 ? sentence : sentence.replace(/^Today I will /, 'I will also ');
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
  const [englishOutput, setEnglishOutput] = useState('');
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
    setEnglishOutput([
      ...(isMonday && fridayKurzarbeit ? ['On Friday I was on short-time work.'] : []),
      ...joinPeriod(yesterday, 'yesterday', pastPrefix, true),
      ...joinToday(today, yesterday, true),
    ].join(' '));
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
            onChangeText={(value) => {
              setOutput(value);
              setEnglishOutput('');
            }}
            multiline
          />
          {englishOutput ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionLabel}>English translation</Text>
              <Text style={styles.body}>{englishOutput}</Text>
            </View>
          ) : null}
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
          onActivity={(key) => updateRows(setRows, index, ACTIVITIES.find((activity) => activity.key === key))}
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

function ActivityRow({ row, onRemove, onValue, onActivity, suggestions }) {
  const testing = row.fields.includes('platform');
  const [kind, stage] = row.key.split('-');
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
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
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
          {testing ? (
            <>
              <Text style={styles.label}>Stage</Text>
              <View style={styles.segmentWrap}>
                {STAGES.map((value) => {
                  const active = stage === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => onActivity(`${kind}-${value}`)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[styles.segment, { minHeight: 44, justifyContent: 'center' }, active && styles.segmentActive]}
                    >
                      <Text style={active ? styles.segmentTextActive : styles.segmentText}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
          {row.fields.includes('story') ? (
            <ValueField
              label={kind === 'build' ? 'Story name (optional)' : 'Story name'}
              value={row.values.story}
              onChange={(value) => onValue('story', value)}
              suggestions={suggestions.stories}
            />
          ) : null}
          {row.fields.includes('release') ? (
            <ValueField
              label={kind === 'build' ? 'Release (optional)' : 'Release'}
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
