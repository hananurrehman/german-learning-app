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
  { key: 'story', label: 'Story testing', fields: ['platform', 'story', 'release'] },
  { key: 'build', label: 'Build testing', fields: ['platform', 'release', 'story'] },
  { key: 'release', label: 'Release testing', fields: ['platform', 'release'] },
];
const STAGES = ['start', 'continue', 'finish'];
const ACTIVITIES = [
  ...TESTING_ACTIVITIES.flatMap((activity) => STAGES.map((stage) => ({
    ...activity,
    key: `${activity.key}-${stage}`,
  }))),
  { key: 'story-test', label: 'Test a story or task', fields: ['story', 'release'] },
  { key: 'topics-look', label: 'Look into topics', fields: ['platform', 'release', 'story'] },
  { key: 'topics-test', label: 'Continue testing topics', fields: ['platform', 'release', 'story'] },
  { key: 'bugfix', label: 'Verify bug fixes', fields: ['platform', 'release', 'story'] },
  { key: 'e2e-improvements', label: 'Work on E2E improvements', fields: [] },
  { key: 'task', label: 'Work on a task', fields: ['task'] },
];

const ACTIVITY_GROUPS = [
  { title: 'Testing', keys: ['story-test', 'topics-test', 'story-start', 'build-start', 'release-start', 'bugfix'] },
  { title: 'Other work', keys: ['topics-look', 'e2e-improvements', 'task'] },
];
const activityAvailable = (key, period) => period !== 'yesterday' || key !== 'topics-test';

const EMPTY_VALUES = { story: '', release: '', task: '', platform: 'Mobile', latestBuild: false, testStage: 'start' };
const PAST_LABELS = { 'story-test': 'Tested a story or task', 'topics-look': 'Looked into topics', 'topics-test': 'Continued testing topics', bugfix: 'Verified bug fixes', task: 'Worked on a task', 'e2e-improvements': 'Worked on E2E improvements', 'story-start': 'Started story testing', 'build-start': 'Started build testing', 'release-start': 'Started release testing' };
for (const [kind, name] of [['story', 'story'], ['build', 'build'], ['release', 'release']]) {
  for (const [stage, verb] of [['start', 'Started'], ['continue', 'Continued'], ['finish', 'Finished']]) {
    PAST_LABELS[`${kind}-${stage}`] = `${verb} ${name} testing`;
  }
}

function topicContext(values, english = false) {
  const { platform, release, story, latestBuild } = values;
  const parts = [];
  if (latestBuild) parts.push(english ? `in the latest ${platform ? `${platform} ` : ''}build` : `im neuesten ${platform ? `${platform}-` : ''}Build`);
  else if (platform && release.trim()) parts.push(english ? `for ${platform} release ${release}` : `für das ${platform}-Release ${release}`);
  else if (platform) parts.push(`für die ${platform}-Plattform`);
  if (english && platform && !release.trim() && !latestBuild) parts[0] = `for ${platform}`;
  if (release.trim() && (latestBuild || !platform)) parts.push(english ? `for release ${release}` : `für Release ${release}`);
  if (story.trim()) parts.push(english ? `related to ${story}` : `zu ${story}`);
  return parts.join(' ');
}

function sentenceFor(row, period, pastPrefix = 'Gestern') {
  const { story, release, task, platform } = row.values;
  const yesterday = period === 'yesterday';
  const storyTarget = `${story}${release.trim() ? ` für Release ${release}` : ''}`;
  switch (row.key) {
    case 'story-test': {
      const target = `${story}${release.trim() ? ` für Release ${release}` : ''}`;
      const stage = row.values.testStage || 'start';
      const verbs = { start: ['begonnen', 'beginnen'], continue: ['fortgesetzt', 'fortsetzen'], finish: ['abgeschlossen', 'abschließen'] };
      return yesterday ? `${pastPrefix} habe ich die Tests für ${target} ${verbs[stage][0]}.` : `Heute werde ich die Tests für ${target} ${verbs[stage][1]}.`;
    }
    case 'topics-look':
    case 'topics-test': {
      const context = topicContext(row.values);
      if (row.key === 'topics-look') return yesterday
        ? `${pastPrefix} habe ich mir die Themen ${context} angeschaut.`
        : `Heute werde ich mir die Themen ${context} anschauen.`;
      return yesterday ? `${pastPrefix} habe ich die Themen ${context} weiter getestet.` : `Heute werde ich die Themen ${context} weiter testen.`;
    }
    case 'task':
      return yesterday
        ? `${pastPrefix} habe ich an der Aufgabe ${task} gearbeitet.`
        : `Heute werde ich an der Aufgabe ${task} arbeiten.`;
    case 'story-start':
      return yesterday
        ? `${pastPrefix} habe ich mit den Tests für ${storyTarget} begonnen.`
        : `Heute werde ich mit den Tests für ${storyTarget} beginnen.`;
    case 'story-continue':
      return yesterday
        ? `${pastPrefix} habe ich mit den Tests für ${storyTarget} weitergemacht.`
        : `Heute werde ich mit den Tests für ${storyTarget} weitermachen.`;
    case 'story-finish':
      return yesterday
        ? `${pastPrefix} habe ich die Tests für ${storyTarget} abgeschlossen.`
        : `Heute werde ich die Tests für ${storyTarget} abschließen.`;
    case 'bugfix': {
      const context = topicContext(row.values);
      return yesterday
        ? `${pastPrefix} habe ich die Bugfixes ${context} verifiziert.`
        : `Heute werde ich die Bugfixes ${context} verifizieren.`;
    }
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
  if (['topics-look', 'topics-test', 'bugfix'].includes(row.key)) return row.values.latestBuild || ['platform', 'release', 'story'].some((field) => row.values[field].trim());
  if (row.key === 'story-test') return Boolean(row.values.story.trim());
  if (/^story-(start|continue|finish)$/.test(row.key)) return Boolean(row.values.story.trim());
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
  if (row.key === 'story-test') {
    const verbs = { start: ['started', 'start'], continue: ['continued', 'continue'], finish: ['finished', 'finish'] };
    return `${subject} ${verbs[row.values.testStage || 'start'][past ? 0 : 1]} testing ${story}${release.trim() ? ` for release ${release}` : ''}.`;
  }
  if (['topics-look', 'topics-test', 'bugfix'].includes(row.key)) {
    const context = topicContext(row.values, true);
    if (row.key === 'topics-look') return `${subject} ${past ? 'looked' : 'look'} into topics ${context}.`;
    if (row.key === 'topics-test') return `${subject} ${past ? 'continued' : 'continue'} testing topics ${context}.`;
    return `${subject} ${past ? 'verified' : 'verify'} the bug fixes ${context}.`;
  }
  if (row.key === 'task') return `${subject} ${past ? 'worked' : 'work'} on the task ${task}.`;
  if (row.key === 'bugfix') return `${subject} ${past ? 'verified' : 'verify'} the bug fixes for ${story}.`;
  if (row.key === 'e2e-improvements') return `${subject} ${past ? 'worked' : 'work'} on E2E improvements.`;
  const [kind, stage] = row.key.split('-');
  const target = kind === 'story'
    ? `testing ${story}${release.trim() ? ` for release ${release}` : ''}`
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
          sameValue(previous.values.story, row.values.story) &&
          sameValue(previous.values.release, row.values.release)
      );
    const repeatsStoryTask = row.key === 'story-test' && row.values.testStage === 'continue' && completedYesterday.some((previous) =>
      previous.key === 'story-test' && ['start', 'continue'].includes(previous.values.testStage) &&
      sameValue(previous.values.story, row.values.story) && sameValue(previous.values.release, row.values.release)
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

    if ((unambiguous && (repeatsStory || repeatsStoryTask || repeatsRelease || repeatsBuild)) || continuesE2e) {
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
      values: { ...EMPTY_VALUES, ...(['topics-look', 'topics-test', 'bugfix'].includes(activity.key) ? { platform: '' } : {}) },
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
      setError('Add the required name or context for each activity.');
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
        period="yesterday"
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
        period="today"
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

function ActivitySection({ title, period, icon, rows, setRows, updateRows, recents, liveValues, onAdd, onRemove }) {
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
          period={period}
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

function ActivityRow({ row, period, onRemove, onValue, onActivity, suggestions }) {
  const testing = /^(story|build|release)-(start|continue|finish)$/.test(row.key) || row.key === 'story-test';
  const optionalPlatform = ['topics-look', 'topics-test', 'bugfix'].includes(row.key);
  const [kind, keyStage] = row.key.split('-');
  const stage = row.key === 'story-test' ? row.values.testStage : keyStage;
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
        <Text style={[styles.cardHeading, { flex: 1 }]}>{period === 'yesterday' ? (PAST_LABELS[row.key] || row.label) : row.label}</Text>
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
            <View>
            {optionalPlatform ? <Text style={styles.label}>Platform (optional)</Text> : null}
            <View style={styles.segmentWrap}>
              {(optionalPlatform ? ['', 'Mobile', 'Web'] : ['Mobile', 'Web']).map((platform) => {
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
                      {platform || 'None'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            </View>
          ) : null}
          {['topics-look', 'topics-test'].includes(row.key) ? (
            <Pressable onPress={() => onValue('latestBuild', !row.values.latestBuild)} accessibilityRole="checkbox" accessibilityState={{ checked: row.values.latestBuild }} style={[styles.row, { minHeight: 44, gap: 8 }]}>
              <Feather name={row.values.latestBuild ? 'check-square' : 'square'} size={20} color={colors.muted} />
              <Text style={styles.body}>Latest build</Text>
            </Pressable>
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
                      onPress={() => row.key === 'story-test' ? onValue('testStage', value) : onActivity(`${kind}-${value}`)}
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
              label={kind === 'build' || optionalPlatform ? 'Story or task (optional)' : 'Story or task'}
              value={row.values.story}
              onChange={(value) => onValue('story', value)}
              suggestions={suggestions.stories}
              preserveCase
            />
          ) : null}
          {row.fields.includes('release') ? (
            <ValueField
              label={kind === 'build' || kind === 'story' || optionalPlatform ? 'Release (optional)' : 'Release'}
              value={row.values.release}
              onChange={(value) => onValue('release', value)}
              suggestions={suggestions.releases}
              preserveCase
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
                {expanded === group.title ? group.keys.filter((key) => activityAvailable(key, period)).map((key) => {
                  const activity = ACTIVITIES.find((item) => item.key === key);
                  return (
                    <Pressable key={key} onPress={() => onSelect(activity)} accessibilityRole="button" style={[styles.row, { minHeight: 48, gap: 10, paddingHorizontal: 8, paddingVertical: 10 }]}>
                      <Feather name="plus" size={15} color={colors.muted} />
                      <Text style={[styles.body, { flex: 1 }]}>{period === 'yesterday' ? (PAST_LABELS[activity.key] || activity.label) : activity.label}</Text>
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
