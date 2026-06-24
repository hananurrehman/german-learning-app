import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

// Core call. `messages` is the messages array. Optional { image } is a
// { base64, media_type } block appended (with the text) to the first user turn.
export async function callClaude(messages, { image } = {}) {
  const apiKey = await AsyncStorage.getItem('apiKey');
  if (!apiKey) throw new Error('Set your API key');

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
