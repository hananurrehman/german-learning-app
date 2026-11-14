const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const babel = require('@babel/core');

function load(file, mocks, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { code } = babel.transformSync(source, {
    filename: file, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => mocks[name], ...globals });
  return exports;
}

test('Write sends optional context and B1 guidance without a standup assumption', async () => {
  let request;
  const ai = load('lib/ai.js', { './store': {
    AI_PROVIDERS: { CLAUDE: 'claude', GEMINI: 'gemini' },
    getAiConfig: async () => ({ provider: 'claude', apiKey: 'test' }),
  } }, { fetch: async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: '{"corrected":"ok"}' }] }) };
  } });
  await ai.checkSentence('Sample text', 'Message to my landlord');
  const prompt = request.messages[0].content;
  assert.match(prompt, /CEFR B1/);
  assert.match(prompt, /Optional context: "Message to my landlord"/);
  assert.match(prompt, /minimally fix/);
  assert.doesNotMatch(prompt, /standup/i);
  await ai.checkSentence('Sample text');
  assert.match(request.messages[0].content, /Optional context: ""/);
});

test('last Write context persists and can be cleared', async () => {
  const values = new Map();
  const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value) };
  const store = load('lib/store.js', { '@react-native-async-storage/async-storage': { default: storage, __esModule: true } });
  assert.equal(await store.getWriteContext(), '');
  await store.saveWriteContext('Message to my landlord');
  assert.equal(await store.getWriteContext(), 'Message to my landlord');
  await store.saveWriteContext('');
  assert.equal(await store.getWriteContext(), '');
});
