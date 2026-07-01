import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

// Core call. `messages` is the messages array. Optional { image } is a
// { base64, media_type } block appended (with the text) to the first user turn.
export async function callClaude(messages, { image } = {}) {
  const apiKey = await AsyncStorage.getItem('apiKey');
  if (!apiKey) throw new Error('Set your API key in Settings');

  let body = { model: MODEL, max_tokens: 1024, messages };

  if (image) {
    // Rebuild the first user message as a content array: image block + text.
    const first = messages[0];
    const text = typeof first?.content === 'string' ? first.content : '';
    body = {
      ...body,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.media_type || 'image/jpeg',
                data: image.base64,
              },
            },
            { type: 'text', text },
          ],
        },
        ...messages.slice(1),
      ],
    };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
  } catch (e) {
    throw new Error(e.message || 'Network error talking to Claude');
  }
}

// Strip ```json ... ``` (or plain ```) fences, then JSON.parse.
export function parseJson(str) {
  let s = (str || '').trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return JSON.parse(s);
}

// dir: "de-en" or "en-de"
export async function translate(text, dir) {
  const [from, to] =
    dir === 'en-de' ? ['English', 'German'] : ['German', 'English'];

  const prompt =
    `Translate the following ${from} text to ${to}.\n\n` +
    `Text: """${text}"""\n\n` +
    `Also list the notable German content words involved (nouns, verbs, ` +
    `adjectives). For each, give the German word, its article ` +
    `("der"/"die"/"das" for nouns, "" for non-nouns), and a short English meaning.\n\n` +
    `Return ONLY valid JSON, no markdown, no preamble, in this exact shape:\n` +
    `{"translation": "...", "words":[{"de":"","article":"","meaning":""}]}`;

  const out = await callClaude([{ role: 'user', content: prompt }]);
  return parseJson(out);
}

// base64: raw base64 of a JPEG/PNG photo containing German text.
export async function translateImage(base64) {
  const prompt =
    `This image contains German text. Extract ALL the German text from it ` +
    `(field "german"), translate it to English (field "translation"), and ` +
    `list the notable German content words (nouns, verbs, adjectives). For ` +
    `each word give the German word, its article ("der"/"die"/"das" for ` +
    `nouns, "" for non-nouns), and a short English meaning.\n\n` +
    `Return ONLY valid JSON, no markdown, no preamble, in this exact shape:\n` +
    `{"german":"...","translation":"...","words":[{"de":"","article":"","meaning":""}]}`;

  const out = await callClaude(
    [{ role: 'user', content: prompt }],
    { image: { base64, media_type: 'image/jpeg' } }
  );
  return parseJson(out);
}

// Checks a German sentence: correction, structure breakdown, gender check.
export async function checkSentence(text) {
  const prompt =
    `Check this German sentence written by a learner.\n\n` +
    `Sentence: """${text}"""\n\n` +
    `Return three things:\n` +
    `- "corrected": the grammatically correct version of the sentence.\n` +
    `- "structure": the corrected sentence with each word or phrase followed ` +
    `by its grammatical role in parentheses, in sentence order. Example: ` +
    `"Er (Subject) liest (Verb) das Buch (Accusative) morgens (Time)".\n` +
    `- "genders": one entry for every noun in the learner's sentence, with ` +
    `the noun, its correct article ("der"/"die"/"das"), and whether the ` +
    `learner used the correct article ("ok": true/false).\n\n` +
    `Return ONLY valid JSON, no markdown, no preamble, in this exact shape:\n` +
    `{"corrected":"...","structure":"...","genders":[{"word":"","article":"","ok":true}]}`;

  const out = await callClaude([{ role: 'user', content: prompt }]);
  return parseJson(out);
}

// One-line English meaning + article for a single German word.
export async function wordMeaning(de) {
  const prompt =
    `Give the article and a short English meaning for the German word "${de}".\n` +
    `"article" is "der"/"die"/"das" if it is a noun, otherwise "".\n` +
    `"meaning" is one short English line.\n\n` +
    `Return ONLY valid JSON, no markdown, no preamble, in this exact shape:\n` +
    `{"article":"","meaning":""}`;

  const out = await callClaude([{ role: 'user', content: prompt }]);
  return parseJson(out);
}

// words: array of saved vocab items { de, article, meaning }.
// Returns 5 B1-level fill-in-the-blank exercises drawn from those words.
export async function makeExercises(words) {
  const list = (words || [])
    .map((w) => `${w.article ? w.article + ' ' : ''}${w.de}`.trim())
    .join(', ');

  const prompt =
    `Create exactly 5 B1-level German grammar exercises using these words: ` +
    `${list}.\n` +
    `Focus on case endings, verb conjugation, and prepositions. Each exercise ` +
    `is a fill-in-the-blank sentence with a single "___" gap.\n` +
    `- "q": the sentence with the "___" gap (you may add a hint in parentheses).\n` +
    `- "answer": the word(s) that fill the gap.\n` +
    `- "note": a short explanation of the grammar rule.\n\n` +
    `Return ONLY valid JSON, no markdown, no preamble: an array of exactly 5 ` +
    `objects in this exact shape:\n` +
    `[{"q":"","answer":"","note":""}]`;

  const out = await callClaude([{ role: 'user', content: prompt }]);
  return parseJson(out);
}
