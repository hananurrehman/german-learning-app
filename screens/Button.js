import { useEffect, useRef } from 'react';
import { Pressable, Text, View, Animated, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles, colors, fonts } from './theme';

// "+ Save" mustard-outline chip → "Saved ✓" with a pop-in scale (~350ms).
export function SaveChip({ saved, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasSaved = useRef(saved);

  useEffect(() => {
    if (saved && !wasSaved.current) {
      scale.setValue(0.85);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
    wasSaved.current = saved;
  }, [saved]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={saved}
        activeOpacity={0.7}
        style={
          saved
            ? { paddingHorizontal: 10, paddingVertical: 5 }
            : {
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.accentOutline,
              }
        }
      >
        <Text
          style={{
            fontFamily: fonts.headingSemi,
            fontSize: 13,
            color: saved ? colors.okText : colors.primary,
          }}
        >
          {saved ? 'Saved ✓' : '+ Save'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

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
