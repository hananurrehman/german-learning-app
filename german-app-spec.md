# German Learning App — Build Spec

Personal, single-user, offline-first Android app (Expo / React Native). No login, no backend, no accounts. All "intelligence" comes from the Anthropic API via **one shared module**. Local storage via AsyncStorage; JSON export/import for backups.

Build order is mandatory: **AI module → storage → screens**. Do not build screens before the AI module exists.

---

## 0. Stack & constraints

- Expo (managed), React Native, JavaScript.
- Anthropic API for ALL AI: translation, image OCR (vision), sentence checking, grammar exercises, word meanings.
- `@react-native-async-storage/async-storage` for vocab + settings.
- `expo-image-picker` for camera/gallery.
- `expo-file-system` + `expo-sharing` for JSON export; `expo-document-picker` for import.
- No translation/OCR/grammar libraries. The API does all of it.
- API key: pasted once into Settings, stored in AsyncStorage. This is the only setup step.
- 4 tabs: **Translate · Write · Vocab · Practice**. Settings lives inside the Vocab tab header (gear icon).

---

## 1. AI module (`lib/ai.js`) — BUILD FIRST

Single function `callClaude(messages, { image } = {})` that:
- Reads API key from storage. If missing, throws a clear "Set your API key in Settings" error.
- POSTs to `https://api.anthropic.com/v1/messages`, model `claude-sonnet-4-6`, `max_tokens: 1024`.
- Header `anthropic-version: 2023-06-01`, and `anthropic-dangerous-direct-browser-access: true`.
- For image calls, builds a content array with an `image` block (base64, correct media_type) + text block.
- Returns concatenated `text` blocks from `data.content`.
- Wrapped in try/catch; surfaces a readable error string.

Export thin wrappers, each owning its prompt. All prompts must end with: **"Return ONLY valid JSON, no markdown, no preamble."** Parse with a helper that strips ` ```json ` fences before `JSON.parse`.

- `translate(text, dir)` → dir is `"de-en"` or `"en-de"`. Returns `{ translation, words: [{de, article, meaning}] }` where `words` are the notable German content words found (article = der/die/das or "" for non-nouns).
- `translateImage(base64)` → returns `{ german, translation, words: [...] }`. Prompt: extract all German text from the image, translate to English, list notable German words as above.
- `checkSentence(text)` → returns:
  ```json
  {
    "corrected": "Er liest das Buch morgens.",
    "structure": "Er (Subject) liest (Verb) das Buch (Accusative) morgens (Time)",
    "genders": [{"word":"Buch","article":"das","ok":true}]
  }
  ```
  `structure` MUST interleave the actual German words with their grammatical role in parentheses, in sentence order — exactly the format shown. `genders` lists every noun in the user's sentence, the correct article, and whether the user got it right.
- `wordMeaning(de)` → returns `{ article, meaning }`. `meaning` = one short English line.
- `makeExercises(words)` → input: array of saved vocab words. Returns 5 B1-level exercises drawn from those words (case endings, conjugation, prepositions). Shape:
  ```json
  [{"q":"Ich gebe ___ Mann das Buch. (der Mann)","answer":"dem","note":"Dative after geben"}]
  ```

---

## 2. Storage (`lib/store.js`)

AsyncStorage keys: `vocab`, `apiKey`.

Vocab item shape (NO date field):
```json
{ "de": "Buch", "article": "das", "meaning": "book" }
```
- `meaning` may be empty until pulled on demand.
- Dedupe by `de` (case-insensitive) on save.

Functions: `getVocab()`, `saveWord(item)`, `updateWord(de, patch)`, `deleteWord(de)`, `getKey()`, `setKey(k)`, `exportJson()` (returns vocab as JSON string), `importJson(str)` (merge + dedupe).

---

## 3. Screens

### Translate tab
- Direction toggle (DE→EN / EN→DE).
- Multiline input, "Translate" button → shows translation.
- Camera/gallery button → `translateImage` → shows extracted German + translation.
- Below result: the `words` list; each row has a **+ Save** button → `saveWord`. If meaning empty, it's fine; Vocab can fetch later.

### Write tab
- Multiline German input, "Check" button → `checkSentence`.
- Display, in order:
  1. Corrected sentence (highlight if different from input).
  2. **Structure** line, rendered verbatim (e.g. `Er (Subject) liest (Verb) das Buch (Accusative) morgens (Time)`).
  3. **Gender check** list: each noun → correct article → ✓/✗.

### Vocab tab
- List of saved words: `der/die/das Word — meaning`.
- Tap a word: if `meaning` empty, call `wordMeaning(de)`, store result, show it. Otherwise just show it. (No manual meaning typing — meanings are always AI-pulled.)
- "+ Add word" = type the German word only; meaning pulled by AI on demand, not typed.
- Swipe / long-press to delete.
- Header gear → Settings (API key field; Export JSON; Import JSON).

### Practice tab
- "Generate quiz" button → `makeExercises(vocab)`.
- Show questions one at a time or as a list with input fields. **Quiz first** — answers hidden.
- "Reveal answers" button shows `answer` + `note` per question. No auto-grading needed; user self-checks.
- If vocab is empty, prompt user to save words first.

---

## 4. JSON backup
- Export: write `exportJson()` to a file, share via `expo-sharing`.
- Import: pick a `.json`, read, `importJson()`, refresh list.

---

## 5. Out of scope (do NOT build)
Login/auth, cloud sync, spaced repetition, audio/TTS, learned-date tracking, manual meaning entry, multi-user, analytics, dark-mode toggling beyond defaults.
