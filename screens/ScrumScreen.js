import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  { key: 'build', label: 'Test a build', fields: ['platform', 'release', 'story'] },
  { key: 'release-start', label: 'Start release testing', fields: ['release'] },
  { key: 'release-continue', label: 'Continue release testing', fields: ['release'] },
  { key: 'release-finish', label: 'Finish release testing', fields: ['release'] },
];

const EMPTY_VALUES = { story: '', release: '', platform: 'Mobile' };

function makeRows() {
  return ACTIVITIES.map((activity) => ({
    ...activity,
    selected: false,
    values: { ...EMPTY_VALUES },
  }));
}

function sentenceFor(row, period) {
  const { story, release, platform } = row.values;
  const yesterday = period === 'yesterday';
  switch (row.key) {
    case 'story-start':
      return yesterday
        ? `Gestern habe ich mit den Tests für ${story} begonnen.`
        : `Heute werde ich mit den Tests für ${story} beginnen.`;
    case 'story-continue':
      return yesterday
        ? `Gestern habe ich mit den Tests für ${story} weitergemacht.`
        : `Heute werde ich mit den Tests für ${story} weitermachen.`;
    case 'story-finish':
      return yesterday
        ? `Gestern habe ich die Tests für ${story} abgeschlossen.`
        : `Heute werde ich die Tests für ${story} abschließen.`;
    case 'bugfix':
      return yesterday
        ? `Gestern habe ich die Bugfixes für ${story} verifiziert.`
        : `Heute werde ich die Bugfixes für ${story} verifizieren.`;
    case 'build':
      if (story) {
        return yesterday
          ? `Gestern habe ich ${story} im ${platform} Build für Release ${release} getestet.`
          : `Heute werde ich ${story} im ${platform} Build für Release ${release} testen.`;
      }
      return yesterday
        ? `Gestern habe ich den ${platform} Build für Release ${release} getestet.`
        : `Heute werde ich den ${platform} Build für Release ${release} testen.`;
    case 'release-start':
      return yesterday
        ? `Gestern habe ich mit den Tests für Release ${release} begonnen.`
        : `Heute werde ich mit den Tests für Release ${release} beginnen.`;
    case 'release-continue':
      return yesterday
        ? `Gestern habe ich mit den Release-Tests für ${release} weitergemacht.`
        : `Heute werde ich mit den Release-Tests für ${release} weitermachen.`;
    case 'release-finish':
      return yesterday
        ? `Gestern habe ich die Release-Tests für ${release} abgeschlossen.`
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

function joinPeriod(rows, period) {
  return rows.filter(isComplete).map((row, index) => {
    const sentence = sentenceFor(row, period);
    if (index === 0) return sentence;
    return period === 'yesterday'
      ? sentence.replace(/^Gestern habe ich /, 'Außerdem habe ich ')
      : sentence.replace(/^Heute /, 'Außerdem ');
  });
}

export default function ScrumScreen() {
  const [yesterday, setYesterday] = useState(makeRows);
  const [today, setToday] = useState(makeRows);
  const [recents, setRecents] = useState({ stories: [], releases: [] });
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      getScrumRecents().then(setRecents);
    }, [])
  );

  const liveValues = useMemo(() => {
    const all = [...yesterday, ...today].filter((row) => row.selected);
    const unique = (values) => [...new Set(values.filter(Boolean))];
    return {
      stories: unique(all.map((row) => row.values.story.trim())),
      releases: unique(all.map((row) => row.values.release.trim())),
    };
  }, [yesterday, today]);

  function updateRows(setRows, rowIndex, patch) {
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

  async function buildUpdate() {
    const selected = [...yesterday, ...today].filter((row) => row.selected);
    if (!selected.length) {
      setError('Select at least one activity.');
      return;
    }
    const incomplete = selected.some((row) => !isComplete(row));
    if (incomplete) {
      setError('Add the required story or release names.');
      return;
    }
    const sentences = [
      ...joinPeriod(yesterday, 'yesterday'),
      ...joinPeriod(today, 'today'),
    ];
    setError('');
    setOutput(sentences.join(' '));
    setRecents(await saveScrumRecents(liveValues));
  }

  async function shareUpdate() {
    if (!output.trim()) return;
    await Share.share({ message: output.trim() });
  }

  function clearAll() {
    setYesterday(makeRows());
    setToday(makeRows());
    setOutput('');
    setError('');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.body, { color: colors.muted, marginBottom: 4 }]}>
        Select what you did and what you plan to do. Everything is generated locally.
      </Text>

      <ActivitySection
        title="Yesterday"
        icon="clock"
        rows={yesterday}
        setRows={setYesterday}
        updateRows={updateRows}
        recents={recents}
        liveValues={liveValues}
      />
      <ActivitySection
        title="Today"
        icon="sun"
        rows={today}
        setRows={setToday}
        updateRows={updateRows}
        recents={recents}
        liveValues={liveValues}
      />

      {error ? (
        <View style={[styles.errorBox, { marginTop: 14 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <AppButton title="Build update" icon="zap" onPress={buildUpdate} style={{ marginTop: 16 }} />

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
  );
}

function ActivitySection({ title, icon, rows, setRows, updateRows, recents, liveValues }) {
  return (
    <View style={{ marginTop: 20 }}>
      <View style={[styles.row, { gap: 7, marginBottom: 8 }]}>
        <Feather name={icon} size={15} color={colors.ok} />
        <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>{title}</Text>
      </View>
      {rows.map((row, index) => (
        <ActivityRow
          key={row.key}
          row={row}
          onToggle={() => updateRows(setRows, index, { selected: !row.selected })}
          onValue={(field, value) => updateRows(setRows, index, { values: { [field]: value } })}
          suggestions={{
            stories: [...liveValues.stories, ...recents.stories],
            releases: [...liveValues.releases, ...recents.releases],
          }}
        />
      ))}
    </View>
  );
}

function ActivityRow({ row, onToggle, onValue, suggestions }) {
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
      <Pressable onPress={onToggle} style={[styles.row, { gap: 10, minHeight: 30 }]}>
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
      </Pressable>

      {row.selected ? (
        <View style={{ marginTop: 10, gap: 9 }}>
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

function ValueField({ label, value, onChange, suggestions }) {
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
        autoCapitalize="sentences"
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
