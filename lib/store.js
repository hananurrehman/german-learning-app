import AsyncStorage from '@react-native-async-storage/async-storage';

const VOCAB_KEY = 'vocab';
const API_KEY = 'apiKey';

// --- API key ---------------------------------------------------------------

export async function getKey() {
  return AsyncStorage.getItem(API_KEY);
}

export async function setKey(k) {
  return AsyncStorage.setItem(API_KEY, k);
}

// --- Vocab -----------------------------------------------------------------

// Vocab item shape: { de, article, meaning }. No date field.
export async function getVocab() {
  const raw = await AsyncStorage.getItem(VOCAB_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function setVocab(list) {
  await AsyncStorage.setItem(VOCAB_KEY, JSON.stringify(list));
  return list;
}

// Save a word, deduped by `de` (case-insensitive). Returns the new list.
export async function saveWord(item) {
  const list = await getVocab();
  const de = (item.de || '').trim();
  if (!de) return list;

  const exists = list.some((w) => w.de.toLowerCase() === de.toLowerCase());
  if (exists) return list;

  const next = [
    ...list,
    { de, article: item.article || '', meaning: item.meaning || '' },
  ];
  return setVocab(next);
}

// Patch a word matched by `de` (case-insensitive). Returns the new list.
export async function updateWord(de, patch) {
  const list = await getVocab();
  const next = list.map((w) =>
    w.de.toLowerCase() === (de || '').toLowerCase() ? { ...w, ...patch } : w
  );
  return setVocab(next);
}

// Delete a word matched by `de` (case-insensitive). Returns the new list.
export async function deleteWord(de) {
  const list = await getVocab();
  const next = list.filter(
    (w) => w.de.toLowerCase() !== (de || '').toLowerCase()
  );
  return setVocab(next);
}

// --- JSON backup -----------------------------------------------------------

export async function exportJson() {
  const list = await getVocab();
  return JSON.stringify(list, null, 2);
}

// Merge imported words into existing vocab, deduped by `de` (case-insensitive).
export async function importJson(str) {
  let incoming;
  try {
    incoming = JSON.parse(str);
  } catch {
    throw new Error('Invalid JSON file');
  }
  if (!Array.isArray(incoming)) throw new Error('Expected a JSON array');

  const list = await getVocab();
  const byKey = new Map(list.map((w) => [w.de.toLowerCase(), w]));

  for (const w of incoming) {
    if (!w || !w.de) continue;
    const key = w.de.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, {
        de: w.de,
        article: w.article || '',
        meaning: w.meaning || '',
      });
    }
  }

  return setVocab(Array.from(byKey.values()));
}
