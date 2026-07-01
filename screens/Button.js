import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { styles, colors } from './theme';

// Button with an inline spinner. While `loading` is true it shows the spinner,
// dims, and ignores taps so no duplicate calls fire. `variant`: primary | outline.
export function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) {
  const blocked = loading || disabled;
  const base = variant === 'outline' ? styles.btnOutline : styles.btn;
  const textStyle = variant === 'outline' ? styles.btnOutlineText : styles.btnText;
  const spinnerColor = variant === 'outline' ? colors.text : '#fff';

  return (
    <TouchableOpacity
      style={[base, blocked && styles.btnDisabled, style]}
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      activeOpacity={0.8}
    >
      <View style={[styles.row, { gap: 8 }]}>
        {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
        <Text style={textStyle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}
