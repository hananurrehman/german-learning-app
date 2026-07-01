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

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // fetch() itself only throws for connectivity problems (no network, DNS
    // failure, request aborted) — never for a bad HTTP response, which is
    // handled below via res.ok. So this is genuinely "offline", not an API error.
    throw new Error('No internet — AI features need a connection');
  }

  try {
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

// Calls Claude and parses the JSON reply. If parsing fails, retries the SAME
// request ONCE, appending the bad reply plus a correction instruction. If it
// still isn't valid JSON, throws a readable error the screen can show.
// (Network/API errors from callClaude propagate as-is.)
async function callJson(messages, opts) {
  const first = await callClaude(messages, opts);
  try {
    return parseJson(first);
  } catch {
    const retryMessages = [
      ...messages,
      { role: 'assistant', content: first },
      {
        role: 'user',
        content:
          'Your last reply was not valid JSON. Return ONLY the JSON object, nothing else.',
      },
    ];
    const second = await callClaude(retryMessages, opts);
    try {
      return parseJson(second);
    } catch {
      throw new Error("Claude's response wasn't valid JSON. Please try again.");
    }
  }
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

  return callJson([{ role: 'user', content: prompt }]);
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

  return callJson([{ role: 'user', content: prompt }], {
    image: { base64, media_type: 'image/jpeg' },
  });
}

// Acts as a practical German standup assistant: minimal fix, a natural
// rephrase, a reusable pattern, a thing to remember, and supportive noun notes.
export async function checkSentence(text) {
  const prompt =
    `You are a friendly German colleague helping a teammate phrase things for ` +
    `daily standup. Be practical and encouraging, never like a grammar exam.\n\n` +
    `Their sentence: """${text}"""\n\n` +
    `Produce:\n` +
    `- "feedback": a short encouraging note (e.g. "Understandable. Main ` +
    `improvement: compound noun formatting.").\n` +
    `- "corrected": minimally fix their sentence — compound nouns, casing, ` +
    `grammar — WITHOUT rewriting their wording. Stay as close to their ` +
    `original as possible.\n` +
    `- "natural": how a German teammate would actually say it in standup ` +
    `(idiomatic, fluent).\n` +
    `- "pattern": one reusable sentence pattern with "..." for the variable ` +
    `part (e.g. "Ich schaue mir ... an.").\n` +
    `- "patternExamples": 3 short example sentences using that pattern with ` +
    `different nouns.\n` +
    `- "remember": one short thing to remember, with a tiny example (e.g. ` +
    `"\\"sich etwas anschauen\\" means to look at/check something. Example: ` +
    `Ich schaue mir das Ticket an.").\n` +
    `- "nouns": for each noun in the sentence, an object {"form","note"} where ` +
    `"form" is the correct article/form and "note" is a short helpful note. ` +
    `ALWAYS frame positively as the correct form + why it's right (e.g. ` +
    `{"form":"die Verbesserungen","note":"correct plural form"}, ` +
    `{"form":"der Test / die Tests","note":"singular and plural"}). ` +
    `NEVER mark anything wrong, no pass/fail, no Xs.\n` +
    `- "savePhrase": the single most reusable phrase/pattern from this ` +
    `correction (e.g. "Ich schaue mir ... an.").\n\n` +
    `Do NOT include grammar-jargon role labels like "Dative Reflexive" or ` +
    `"Accusative Object" anywhere.\n\n` +
    `Example — for input "Gestern haben wir Release R68 deployed. Heute schaue ` +
    `ich mir ein paar e2e test Verbesserungen an.":\n` +
    `- corrected: "Gestern haben wir Release R68 deployed. Heute schaue ich ` +
    `mir ein paar E2E-Test-Verbesserungen an."\n` +
    `- natural: "Gestern haben wir Release R68 deployed. Heute schaue ich mir ` +
    `ein paar Verbesserungen an den E2E-Tests an."\n` +
    `- pattern: "Ich schaue mir ... an."\n` +
    `- savePhrase: "Ich schaue mir ... an."\n\n` +
    `Return ONLY valid JSON, no markdown, no preamble, in this exact shape:\n` +
    `{"feedback":"","corrected":"","natural":"","pattern":"",` +
    `"patternExamples":["","",""],"remember":"",` +
    `"nouns":[{"form":"","note":""}],"savePhrase":""}`;

  return callJson([{ role: 'user', content: prompt }]);
}

// One-line English meaning + article for a single German word.
export async function wordMeaning(de) {
  const prompt =
    `Give the article and a short English meaning for the German word "${de}".\n` +
    `"article" is "der"/"die"/"das" if it is a noun, otherwise "".\n` +
    `"meaning" is one short English line.\n\n` +
    `Return ONLY valid JSON, no markdown, no preamble, in this exact shape:\n` +
    `{"article":"","meaning":""}`;

  return callJson([{ role: 'user', content: prompt }]);
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

  return callJson([{ role: 'user', content: prompt }]);
}
