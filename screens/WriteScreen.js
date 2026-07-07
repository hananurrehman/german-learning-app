import { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { checkSentence } from '../lib/ai';
import { saveWord } from '../lib/store';
import { AppButton } from './Button';
import { styles, colors, fonts } from './theme';

// Fade + 14px rise on mount, staggered by card position (80ms apart).
function RiseIn({ index, children }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 450,
      delay: index * 80,
      easing: Easing.bezier(0.2, 0.7, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function WriteScreen() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const savedScale = useRef(new Animated.Value(1)).current;

  async function onCheck() {
    if (loading || !text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSaved(false);
    try {
      setResult(await checkSentence(text.trim()));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSavePhrase() {
    if (!result?.savePhrase) return;
    await saveWord({ de: result.savePhrase, article: '', meaning: '', type: 'pattern' });
    setSaved(true);
    savedScale.setValue(0.85);
    Animated.sequence([
      Animated.timing(savedScale, { toValue: 1.06, duration: 200, useNativeDriver: true }),
      Animated.timing(savedScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={text}
        onChangeText={setText}
        placeholder="Write what you want to say in standup…"
        placeholderTextColor={colors.faint}
        multiline
      />

      <AppButton
        title="Check"
        onPress={onCheck}
        loading={loading}
        style={{ marginTop: 10 }}
      />

      {error ? (
        <View style={[styles.errorBox, { marginTop: 20 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={{ marginTop: 20 }}>
          {/* 1. Feedback note — supportive, prominent */}
          {result.feedback ? (
            <RiseIn index={0}>
              <View
                style={{
                  backgroundColor: colors.okBg,
                  borderColor: colors.okBorder,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  gap: 10,
                }}
              >
                <Feather name="zap" size={17} color={colors.ok} style={{ marginTop: 2 }} />
                <Text style={[styles.body, { flex: 1 }]}>{result.feedback}</Text>
              </View>
            </RiseIn>
          ) : null}

          {/* 2. Corrected — words that changed from the input show in mustard */}
          <RiseIn index={1}>
            <View style={[styles.card, { marginBottom: 12 }]}>
              <Text style={styles.sectionLabel}>Corrected</Text>
              <Text style={styles.body}>
                {(result.corrected || '').split(/(\s+)/).map((part, i) =>
                  /\S/.test(part) && !text.includes(part) ? (
                    <Text
                      key={i}
                      style={{ color: colors.primary, fontFamily: fonts.bodySemi }}
                    >
                      {part}
                    </Text>
                  ) : (
                    part
                  )
                )}
              </Text>
            </View>
          </RiseIn>

          {/* 3. Natural standup version */}
          <RiseIn index={2}>
            <Block label="Natural standup version">{result.natural}</Block>
          </RiseIn>

          {/* 4. Pattern + examples */}
          {result.pattern ? (
            <RiseIn index={3}>
              <View style={[styles.card, { marginBottom: 12 }]}>
                <Text style={styles.sectionLabel}>Pattern</Text>
                <Text style={[styles.cardHeading, { marginBottom: 8 }]}>
                  {result.pattern}
                </Text>
                {(result.patternExamples || []).map((ex, i) => (
                  <View key={i} style={[styles.row, { marginTop: 4, gap: 8 }]}>
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: colors.primary,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 15,
                        lineHeight: 22,
                        color: colors.exampleText,
                        flex: 1,
                      }}
                    >
                      {ex}
                    </Text>
                  </View>
                ))}
              </View>
            </RiseIn>
          ) : null}

          {/* 5. Thing to remember */}
          {result.remember ? (
            <RiseIn index={4}>
              <View
                style={{
                  backgroundColor: colors.rememberBg,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={[styles.row, { gap: 6, marginBottom: 6 }]}>
                  <Feather name="sun" size={13} color={colors.primary} />
                  <Text style={[styles.sectionLabel, { color: colors.primary, marginBottom: 0 }]}>
                    Remember
                  </Text>
                </View>
                <Text style={styles.body}>{result.remember}</Text>
              </View>
            </RiseIn>
          ) : null}

          {/* 6. Noun check — form + note, no Xs */}
          {(result.nouns || []).length ? (
            <RiseIn index={5}>
              <View style={[styles.card, { marginBottom: 12 }]}>
                <Text style={styles.sectionLabel}>Noun check</Text>
                {result.nouns.map((n, i) => (
                  <View
                    key={`${n.form}-${i}`}
                    style={{
                      paddingVertical: 8,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Text style={[styles.body, { fontFamily: fonts.bodySemi }]}>
                      {n.form}
                    </Text>
                    {n.note ? (
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 14,
                          color: colors.muted,
                          marginTop: 2,
                        }}
                      >
                        {n.note}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </RiseIn>
          ) : null}

          {/* 7. Save useful phrase — stores ONLY savePhrase */}
          {result.savePhrase ? (
            <RiseIn index={6}>
              <View style={[styles.card, { marginBottom: 12 }]}>
                <Text style={styles.sectionLabel}>Useful phrase</Text>
                <Text style={[styles.body, { marginBottom: 12 }]}>
                  {result.savePhrase}
                </Text>
                <Animated.View style={{ transform: [{ scale: savedScale }] }}>
                  <Pressable
                    onPress={saved ? undefined : onSavePhrase}
                    disabled={saved}
                    style={({ pressed }) => [
                      {
                        minHeight: 48,
                        borderRadius: 14,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: saved ? colors.okBg : colors.elevated,
                        borderColor: saved ? colors.okBorder : colors.accentOutline,
                      },
                      pressed && !saved && { transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.headingSemi,
                        fontSize: 15,
                        color: saved ? colors.okText : colors.primary,
                      }}
                    >
                      {saved ? 'Saved ✓' : 'Save useful phrase'}
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </RiseIn>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Block({ label, children }) {
  if (!children) return null;
  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}
