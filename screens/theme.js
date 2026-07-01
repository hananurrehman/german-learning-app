import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#ffffff',
  card: '#f6f8fa',
  border: '#d0d7de',
  primary: '#1f6feb',
  text: '#1f2328',
  muted: '#656d76',
  danger: '#cf222e',
  dangerBg: '#ffeef0',
  dangerBorder: '#ffccd0',
  ok: '#1a7f37',
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },

  label: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },

  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },

  btnOutline: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { color: colors.text, fontWeight: '600', fontSize: 15 },

  row: { flexDirection: 'row', alignItems: 'center' },

  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  errorBox: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: colors.danger, fontSize: 14 },
});
