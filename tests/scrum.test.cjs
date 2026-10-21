const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const babel = require('@babel/core');

function load(file, mocks, extra = '') {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { code } = babel.transformSync(source + extra, {
    filename: file,
    configFile: false,
    babelrc: false,
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === 'react/jsx-runtime') {
        const element = (type, props) => ({ type, props: { ...props, children: [props.children] } });
        return { jsx: element, jsxs: element, Fragment: 'Fragment' };
      }
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

function screenHarness() {
  const values = [];
  const sharedMessages = [];
  let cursor = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: 'Fragment',
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], (next) => {
        values[index] = typeof next === 'function' ? next(values[index]) : next;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
  };
  const api = load('screens/ScrumScreen.js', {
    react: React,
    'react-native': {
      Keyboard: { dismiss() {} }, Modal: 'Modal', Pressable: 'Pressable',
      ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View',
      Share: { share: async (payload) => { sharedMessages.push(payload.message); } },
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@react-navigation/native': { useFocusEffect() {} },
    '@expo/vector-icons': { Feather: 'Feather' },
    '../lib/store': { getScrumRecents: async () => ({}), saveScrumRecents: async (v) => v },
    './Button': { AppButton: 'AppButton' },
    './theme': { colors: {}, fonts: {}, styles: {} },
  }, '\nexports.testApi = { ACTIVITIES, EMPTY_VALUES, sentenceFor, englishSentenceFor, joinToday, joinPeriod, isComplete, ActivitySection, ActivityPicker, ActivityRow, ValueField };');
  return {
    ...api.testApi,
    sharedMessages,
    render() { cursor = 0; return api.default(); },
  };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  return (tree.props?.children || []).flat(Infinity).map((child) => find(child, predicate)).find(Boolean);
}

function makeRow(api, key, values = {}) {
  return { ...api.ACTIVITIES.find((a) => a.key === key), selected: true, values: { ...api.EMPTY_VALUES, ...values } };
}

test('generic task retains exact case, punctuation and English name in both tenses', () => {
  const api = screenHarness();
  const row = makeRow(api, 'task', { task: 'E2E test documentation / API-v2' });
  assert.equal(api.sentenceFor(row, 'yesterday'), 'Gestern habe ich an der Aufgabe E2E test documentation / API-v2 gearbeitet.');
  assert.equal(api.sentenceFor(row, 'today'), 'Heute werde ich an der Aufgabe E2E test documentation / API-v2 arbeiten.');
  assert.equal(api.isComplete(makeRow(api, 'task', { task: '   ' })), false);
});

test('Monday prefixes also apply to tasks and multiple activities join correctly', () => {
  const api = screenHarness();
  const rows = ['Documentation', 'Accessibility'].map((task) => makeRow(api, 'task', { task }));
  assert.equal(api.joinPeriod(rows, 'yesterday', 'Am Donnerstag').join(' '), 'Am Donnerstag habe ich an der Aufgabe Documentation gearbeitet. Außerdem habe ich an der Aufgabe Accessibility gearbeitet.');
  assert.match(api.sentenceFor(rows[0], 'yesterday', 'Am Freitag'), /^Am Freitag /);
  assert.equal(api.joinToday(rows, rows)[1], 'Außerdem werde ich an der Aufgabe Accessibility arbeiten.');
});

test('existing story, release and E2E continuation behavior remains intact', () => {
  const api = screenHarness();
  for (const [previous, current, values] of [
    ['story-start', 'story-continue', { story: 'Checkout' }],
    ['release-start', 'release-continue', { release: '2.0' }],
  ]) {
    assert.equal(api.joinToday([makeRow(api, current, values)], [makeRow(api, previous, values)])[0], 'Heute werde ich damit weitermachen.');
  }
  const e2e = makeRow(api, 'e2e-improvements');
  assert.equal(api.joinToday([e2e], [e2e])[0], 'Heute werde ich weiter daran arbeiten.');
  assert.equal(api.isComplete(makeRow(api, 'build-start', { release: '2.0' })), true);
});

test('build continuation compares platform, release and optional story', () => {
  const api = screenHarness();
  const previous = makeRow(api, 'build-start', { release: ' R78 ', story: 'XYZ' });
  const current = makeRow(api, 'build-continue', { release: 'r78', story: ' xyz ' });
  assert.equal(api.joinToday([current], [previous], true)[0], 'Today I will continue with it.');
  assert.equal(api.joinToday([current], [previous])[0], 'Heute werde ich damit weitermachen.');
  for (const changed of [{ platform: 'Web' }, { release: 'R79' }, { story: 'Other story' }, { story: '' }]) {
    const different = { ...current, values: { ...current.values, ...changed } };
    assert.equal(api.joinToday([different], [previous])[0], api.sentenceFor(different, 'today'));
  }
  const finished = { ...previous, key: 'build-finish' };
  assert.equal(api.joinToday([current], [finished])[0], api.sentenceFor(current, 'today'));
  assert.equal(api.joinToday([current], [])[0], api.sentenceFor(current, 'today'));
  assert.equal(api.joinToday([current], [previous, makeRow(api, 'task', { task: 'Docs' })])[0], api.sentenceFor(current, 'today'));
});

test('build testing allows no release, no story, or either, in every stage', () => {
  const api = screenHarness();
  for (const stage of ['start', 'continue', 'finish']) {
    for (const values of [{}, { story: 'XYZ' }, { release: 'R78' }, { story: 'XYZ', release: 'R78' }]) {
      const row = makeRow(api, `build-${stage}`, values);
      assert.equal(api.isComplete(row), true);
      const english = api.englishSentenceFor(row, 'today');
      assert.match(english, new RegExp(`Today I will ${stage} testing`));
      assert.equal(english.includes('for release'), Boolean(values.release));
      assert.equal(english.includes('XYZ'), Boolean(values.story));
      assert.equal(api.sentenceFor(row, 'yesterday', 'Am Donnerstag').startsWith('Am Donnerstag '), true);
    }
  }
  const row = makeRow(api, 'build-continue', { story: 'XYZ', release: '   ' });
  assert.equal(api.sentenceFor(row, 'today'), 'Heute werde ich die Tests für XYZ im Mobile-Build fortsetzen.');
  assert.equal(api.englishSentenceFor(row, 'today'), 'Today I will continue testing XYZ in the Mobile build.');
  const generic = makeRow(api, 'build-continue');
  assert.equal(api.joinToday([generic], [makeRow(api, 'build-start')], true)[0], 'Today I will continue with it.');
});

test('story testing needs only a story; release testing stays separate and platform-aware', () => {
  const api = screenHarness();
  assert.equal(api.isComplete(makeRow(api, 'story-start', { story: 'XYZ' })), true);
  assert.equal(api.isComplete(makeRow(api, 'release-start', { release: '' })), false);
  for (const kind of ['story', 'release']) {
    const values = { story: 'XYZ', release: 'R78' };
    const previous = makeRow(api, `${kind}-start`, values);
    const current = makeRow(api, `${kind}-continue`, { ...values, platform: 'Web' });
    assert.equal(api.joinToday([current], [previous])[0], api.sentenceFor(current, 'today'));
  }
});

test('testing controls preserve entered names, suggestions, and row identity', () => {
  const api = screenHarness();
  let tree = api.render();
  const section = () => find(tree, node => node.type === api.ActivitySection && node.props.title === 'Today');
  section().props.onAdd(); tree = api.render();
  find(tree, node => node.type === api.ActivityPicker).props.onSelect(api.ACTIVITIES.find(a => a.key === 'build-start'));
  tree = api.render();
  section().props.updateRows(section().props.setRows, 0, { values: { story: 'XYZ', release: 'R78', platform: 'Web' } });
  tree = api.render();
  let rendered = api.ActivitySection(section().props);
  let row = find(rendered, node => node.type === api.ActivityRow);
  const id = row.props.row.id;
  row.props.onActivity('build-continue'); tree = api.render();
  rendered = api.ActivitySection(section().props);
  row = find(rendered, node => node.type === api.ActivityRow);
  assert.equal(row.props.row.id, id);
  assert.equal(row.props.row.values.story, 'XYZ');
  assert.equal(row.props.row.values.release, 'R78');
  assert.equal(row.props.row.values.platform, 'Web');
  assert.ok(row.props.suggestions.stories.includes('XYZ'));
  const rowTree = api.ActivityRow(row.props);
  assert.ok(find(rowTree, node => node.type === api.ValueField && node.props.label === 'Release (optional)'));
  const tags = api.ValueField({ label: 'Release', value: '', onChange: row.props.onValue.bind(null, 'release'), suggestions: ['R78'] });
  find(tags, node => node.type === 'Pressable').props.onPress(); tree = api.render();
  assert.equal(section().props.rows[0].values.release, 'R78');
});

test('screen starts compact, supports multiple tasks, removal, validation and clear', async () => {
  const api = screenHarness();
  let tree = api.render();
  const section = () => find(tree, (node) => node.type === api.ActivitySection && node.props.title === 'Today');
  const picker = () => find(tree, (node) => node.type === api.ActivityPicker);
  const button = (title) => find(tree, (node) => node.type === 'AppButton' && node.props.title === title);
  assert.equal(section().props.rows.length, 0);
  section().props.onAdd(); tree = api.render();
  assert.equal(picker().props.period, 'today');
  picker().props.onSelect(api.ACTIVITIES.find((a) => a.key === 'task')); tree = api.render();
  await button('Build update').props.onPress(); tree = api.render();
  assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children.includes('Add the required task, story or release names.')));
  section().props.updateRows(section().props.setRows, 0, { values: { task: 'E2E test documentation' } }); tree = api.render();
  section().props.onAdd(); tree = api.render();
  picker().props.onSelect(api.ACTIVITIES.find((a) => a.key === 'task')); tree = api.render();
  assert.equal(section().props.rows.length, 2);
  assert.notEqual(section().props.rows[0].id, section().props.rows[1].id);
  section().props.onRemove(1); tree = api.render();
  await button('Build update').props.onPress(); tree = api.render();
  assert.equal(find(tree, (node) => node.type === 'TextInput').props.value, 'Heute werde ich an der Aufgabe E2E test documentation arbeiten.');
  button('Clear').props.onPress(); tree = api.render();
  assert.equal(section().props.rows.length, 0);
});

test('saved task suggestions are backward compatible with existing recents', async () => {
  let stored = JSON.stringify({ stories: ['Checkout'], releases: ['2.0'] });
  const api = load('lib/store.js', {
    '@react-native-async-storage/async-storage': {
      getItem: async () => stored,
      setItem: async (_, value) => { stored = value; },
    },
  });
  assert.equal((await api.getScrumRecents()).tasks.length, 0);
  await api.saveScrumRecents({ tasks: ['E2E test documentation'] });
  const recents = await api.getScrumRecents();
  assert.equal(recents.tasks[0], 'E2E test documentation');
  assert.equal(recents.stories[0], 'Checkout');
  assert.equal(recents.releases[0], '2.0');
  stored = '{bad json';
  assert.equal((await api.getScrumRecents()).tasks.length, 0);
});

test('generated English stays separate from editable and shared German', async () => {
  const api = screenHarness();
  let tree = api.render();
  const section = () => find(tree, node => node.type === api.ActivitySection && node.props.title === 'Today');
  const button = title => find(tree, node => node.type === 'AppButton' && node.props.title === title);
  section().props.onAdd(); tree = api.render();
  find(tree, node => node.type === api.ActivityPicker).props.onSelect(api.ACTIVITIES.find(a => a.key === 'build-continue'));
  tree = api.render();
  await button('Build update').props.onPress(); tree = api.render();
  assert.ok(find(tree, node => node.type === 'Text' && node.props.children.includes('Today I will continue testing the Mobile build.')));
  const german = find(tree, node => node.type === 'TextInput');
  assert.equal(german.props.value, 'Heute werde ich die Tests des Mobile-Builds fortsetzen.');
  await button('Share / copy').props.onPress();
  assert.deepEqual(api.sharedMessages, [german.props.value]);
  german.props.onChangeText('Edited update'); tree = api.render();
  assert.equal(find(tree, node => node.type === 'Text' && node.props.children.includes('English translation')), undefined);
});
