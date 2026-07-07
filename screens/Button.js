import { useEffect, useRef } from 'react';
import { Pressable, Text, View, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles, colors } from './theme';

// Three pulsing dots (8px, staggered 150ms) shown while a request is in flight.
function LoadingDots({ color }) {
  const dots = [useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            opacity: v,
          }}
        />
      ))}
    </View>
  );
}

// Button with press-scale and in-flight handling. While `loading` is true it
// shows pulsing dots, dims, and ignores taps so no duplicate calls fire.
// `variant`: primary (mustard, dark-teal text) | outline (elevated surface).
export function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
}) {
  const blocked = loading || disabled;
  const base = variant === 'outline' ? styles.btnOutline : styles.btn;
  const textStyle = variant === 'outline' ? styles.btnOutlineText : styles.btnText;
  const dotColor = variant === 'outline' ? colors.text : colors.onPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        base,
        blocked && styles.btnDisabled,
        pressed && !blocked && { transform: [{ scale: 0.97 }] },
        style,
      ]}
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
    >
      <View style={[styles.row, { gap: 8 }]}>
        {loading ? (
          <LoadingDots color={dotColor} />
        ) : icon ? (
          <Feather name={icon} size={17} color={dotColor} />
        ) : null}
        <Text style={textStyle}>{title}</Text>
      </View>
    </Pressable>
  );
}
