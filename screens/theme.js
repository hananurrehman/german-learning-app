import { StyleSheet } from 'react-native';

// "Vintage film" dark theme — warm retro colors on deep petrol teal.
// Flat and matte: no gradients, no glows, no shadows. Depth comes from a
// lighter surface color plus the cream hairline border.
export const colors = {
  bg: '#122E38',
  card: '#1A3B47',
  elevated: '#224955',
  border: 'rgba(246,243,232,0.10)',
  primary: '#F2A93B',
  onPrimary: '#122E38',
  text: '#F6F3E8',
  muted: '#9DB4AE',
  faint: '#6E8781',
  ok: '#93B7B0',
  okText: '#A9CFC7',
  okBg: 'rgba(147,183,176,0.14)',
  okBorder: 'rgba(147,183,176,0.35)',
  danger: '#FF5C7A',
  dangerText: '#FF8DA1',
  dangerBg: 'rgba(255,92,122,0.10)',
  dangerBorder: 'rgba(255,92,122,0.35)',
  accentOutline: 'rgba(242,169,59,0.45)',
  rememberBg: 'rgba(246,243,232,0.08)',
  exampleText: '#C9D8D3',
};

// Space Grotesk = headings / buttons / labels; Instrument Sans = body.
export const fonts = {
  heading: 'SpaceGrotesk_700Bold',
  headingSemi: 'SpaceGrotesk_600SemiBold',
  headingMedium: 'SpaceGrotesk_500Medium',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemi: 'InstrumentSans_600SemiBold',
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 48 },

  label: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },

  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: colors.onPrimary,
    fontFamily: fonts.heading,
    fontSize: 16,
  },
  btnDisabled: { opacity: 0.5 },

  btnOutline: {
    backgroundColor: colors.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    color: colors.text,
    fontFamily: fonts.headingSemi,
    fontSize: 15,
  },

  row: { flexDirection: 'row', alignItems: 'center' },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.ok,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  cardHeading: {
    fontFamily: fonts.headingSemi,
    fontSize: 16,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },

  errorBox: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  errorText: {
    color: colors.dangerText,
    fontFamily: fonts.body,
    fontSize: 14,
  },

  // Segmented control (Translate direction, Vocab Words/Patterns)
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: colors.ok },
  segmentText: {
    fontFamily: fonts.headingMedium,
    fontSize: 14,
    color: colors.muted,
  },
  segmentTextActive: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.bg,
  },
});
