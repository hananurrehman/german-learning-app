# Handoff: Vintage Film Theme (option 2a)

## Overview
Restyle of the German-learning Expo/React Native app (`german-app`) from its current light GitHub-style theme to the **"Vintage film" dark theme**: warm retro colors on deep petrol teal — flat and matte, no gradients, no glows, no shadows. Covers all five screens: Translate, Write, Vocab, Practice, Settings. Structure and functionality are unchanged — this is a visual restyle only.

## About the Design Files
The files in this bundle are **design references created in HTML** (`Dark Restyle.dc.html` — open it in a browser; the "2a · Vintage film palette" section at the top is the approved direction). They are prototypes showing intended look and behavior, **not production code to copy**. The task is to recreate this look in the existing **React Native (Expo)** codebase using its established patterns — primarily by updating `screens/theme.js` and making small per-screen adjustments.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and states are final. Recreate pixel-perfectly within RN idioms.

## Target codebase notes
- Nearly all styling is centralized in `screens/theme.js` (a `colors` object + a `StyleSheet`). Most of this restyle is token swaps there.
- Screens: `TranslateScreen.js`, `WriteScreen.js`, `VocabScreen.js`, `PracticeScreen.js`, `SettingsScreen.js`, shared `Button.js`.
- Fonts must be added: **Space Grotesk** (headings/buttons/labels) and **Instrument Sans** (body) via `@expo-google-fonts/space-grotesk` and `@expo-google-fonts/instrument-sans` + `expo-font`.
- Set the app's status bar to light content and root background to `#122E38`.

## Design Tokens

### Colors (map onto the existing `colors` object)
- `bg`: `#122E38` — deep petrol teal screen background
- `card`: `#1A3B47` — card / input surface
- `elevated`: `#224955` — secondary buttons, elevated surfaces (new token)
- `border`: `rgba(246,243,232,0.10)` — cream hairline, used on every card/input
- `primary`: `#F2A93B` — mustard. Primary buttons, active tab pill, highlights, "+ Save" outline buttons
- `onPrimary`: `#122E38` — text/icons on mustard is ALWAYS dark teal, never white (new token)
- `text`: `#F6F3E8` — warm cream
- `muted`: `#9DB4AE` — sage-grey secondary text, inactive tabs, labels
- `faint`: `#6E8781` — placeholder text, hint captions (new token)
- `ok`: `#93B7B0` — sage. Success, active segmented-control segment (dark teal text on it)
- `okText`: `#A9CFC7` — "Saved ✓" text color
- `okBg`: `rgba(147,183,176,0.14)`, `okBorder`: `rgba(147,183,176,0.35)` — success/feedback card tint
- `danger`: `#FF5C7A`, `dangerText`: `#FF8DA1`, `dangerBg`: `rgba(255,92,122,0.10)`, `dangerBorder`: `rgba(255,92,122,0.35)`
- Accent-outline for save chips: border `rgba(242,169,59,0.45)`, text `#F2A93B`
- "Remember" callout: background `rgba(246,243,232,0.08)` + 3px left border `#F2A93B`

### Typography
- Headings (screen titles): Space Grotesk 700, 26px (Settings title 24px)
- Card headings: Space Grotesk 600, 16px
- Body: Instrument Sans 400, 15px / 22px line-height
- Section labels: Space Grotesk 700, 11px, UPPERCASE, letter-spacing 1.4
- Buttons: Space Grotesk 700 (primary) / 600 (secondary), 14–16px
- Tab labels: Space Grotesk, 11px; active 600 mustard, inactive 500 muted

### Radii
- Cards & result blocks: 16
- Inputs, buttons (52px tall primary, 48–50px secondary): 14
- Save chips / smaller buttons: 10–13
- Segmented control container: 12 (inner segments 9, 4px padding/gap)
- Tab active pill: 54×30, radius 15

### Spacing
- Screen padding: 20 horizontal
- Card padding: 16 (list rows 14×16)
- Vertical gap between stacked cards: 12; list rows gap 8

### Shadows
None. Depth = lighter surface color + cream hairline border only.

## Screens

### 01 Translate
- Title "Translate" (Grotesk 700/26 cream), then segmented control DE→EN / EN→DE: container `card` bg + hairline; active segment **sage `#93B7B0` bg with `#122E38` text**, Grotesk 700/14; inactive muted 500.
- Input: `card` bg, hairline, radius 14, min-height 96, body text.
- Primary "Translate" button: flat mustard, 52 tall, radius 14, Grotesk 700/16, dark-teal text.
- Camera / Gallery row: two equal secondary buttons, `elevated` bg + hairline, 48 tall, icon + label.
- "TRANSLATION" and "WORDS" result cards: `card` bg, section label (11px caps sage), body text cream. Word rows separated by hairline top borders; each row: word (bold German noun, article regular, translation in muted after an em dash) + right-aligned chip — either "+ Save" (mustard outline chip) or "Saved ✓" (`#A9CFC7` text, no border).

### 02 Write
- Input card same as Translate.
- "Check" primary mustard button; while loading show 3 pulsing dark-teal dots (8px, staggered 150ms).
- Results appear as staggered cards (fade + 14px rise, ~450ms cubic-bezier(0.2,0.7,0.3,1), 80ms stagger):
  1. Feedback card: sage tint bg `rgba(147,183,176,0.14)` + sage border, sparkle icon `#93B7B0`, body cream.
  2. "CORRECTED" card: corrected fragment highlighted **mustard 600**.
  3. "NATURAL STANDUP VERSION" card.
  4. "PATTERN" card: pattern name Grotesk 600/16, example bullets = 5px mustard dot + `#C9D8D3` text.
  5. "REMEMBER" callout: cream-8% bg, mustard 3px left border, mustard label + lightbulb icon.
  6. "USEFUL PHRASE" card with full-width "Save useful phrase" button (elevated bg, mustard-outline border, mustard text) → becomes "Saved ✓" (sage tint bg/border, `#A9CFC7` text, small pop-in scale animation ~350ms).

### 03 Vocab
- Header row: title + filter icon button (44×44 touch target, muted).
- Segmented Words / Patterns (same style as Translate).
- Search field: `card` bg, hairline, 46 tall, search icon, placeholder `#6E8781`.
- Add row: flex input ("Add a German word…") + 46×46 mustard square button (radius 14) with dark-teal plus icon.
- Word list: one card per word (radius 16, padding 14×16), German word 600, translation muted. Untranslated words show right-aligned mustard "tap for meaning ›" (Grotesk 600/12).
- Footer hint centered, `#6E8781` 12px: "Tap a word for its meaning · long-press to delete".

### 04 Practice
- "Generate new quiz" primary mustard button with sparkle icon.
- Question cards: numbered badge 24×24 radius 8, mustard-16% bg + mustard number; question body cream.
- Answer inputs inside cards: `bg` (#122E38) fill + hairline, 44 tall, radius 12.
- Revealed answers: hairline-top section with check icon + answer (Grotesk 600/14, `#A9CFC7`) + explanation (muted 14/20).
- "Reveal answers" secondary button (elevated bg, hairline, 48 tall).

### 05 Settings
- Back chevron (44×44) + title 24px.
- "ANTHROPIC API KEY" label, masked key field (card bg, key icon), mustard "Save key" primary button.
- Hairline divider (26 vertical margin).
- "BACKUP" section: two full-width secondary buttons (elevated bg, hairline) — "Export vocab (JSON)" / "Import vocab (JSON)" with up/down arrow icons.
- Error box: `dangerBg` fill, `dangerBorder`, radius 14, `#FF8DA1` 14px text. (Design shows a soft shake on appear — optional.)

### Tab bar (all screens)
- Top hairline border, bg `rgba(18,46,56,0.92)` (blur if available), padding 8/8/6.
- 4 tabs: Translate (globe), Write (pencil), Vocab (book), Practice (target) — Feather-style 19px stroke icons.
- Active: 54×30 mustard pill (radius 15) around the icon (icon dark teal), label mustard 600. Inactive: muted icon + label.

## Interactions & Behavior
- Buttons press-scale to 0.97 (chips 0.95, list cards 0.985) — use `Pressable` style function or `activeOpacity` equivalent.
- Write check flow: idle → loading dots → staggered result cards (see 02).
- Save chips: "+ Save" → "Saved ✓" with pop-in (scale 0.85 → 1.06 → 1, ~350ms).
- All existing navigation, state, and data logic unchanged.

## State Management
No new state. Reuse existing screen state; theme is static (no light/dark toggle requested).

## Assets
No image assets. Icons are simple stroke icons (Feather set works: globe, edit-3, book-open, target, camera, image, search, plus, key, upload, download, check, chevron-left, sliders, zap/sparkle). Use whatever icon library the app already uses or `@expo/vector-icons` Feather.

## Files in this bundle
- `Dark Restyle.dc.html` — open in a browser. Top section "2a · Vintage film palette" = this theme (all 5 screens + a Visual System reference card with every token). The "1a" section below is the earlier violet dark theme — ignore it except where 2a explicitly says "same as 1a" (spacing/motion).
- `android-frame.jsx`, `support.js` — support files so the HTML preview renders; not relevant to implementation.

## Suggested implementation order
1. Add fonts (expo-google-fonts) + load in `App.js`.
2. Rewrite `screens/theme.js` tokens & shared styles per the Design Tokens section (add `elevated`, `onPrimary`, `faint`, success tokens).
3. Update `Button.js` (primary = mustard/dark-teal text, secondary = elevated surface).
4. Sweep each screen for hardcoded `#fff`/light values; apply per-screen specifics above.
5. Tab bar styling (active pill) in the navigator config.
