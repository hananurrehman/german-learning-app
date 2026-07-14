import { useState, useCallback } from 'react';
import { ScrollView, View, Text, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getVocab } from '../lib/store';
import { makeExercises } from '../lib/ai';
import { AppButton } from './Button';
import { styles, colors, fonts } from './theme';

const QUIZ_SIZE = 12;

// Session-only memory of when each word was last put in a quiz (de -> Date.now()).
// Module-level so it survives tab switches, but intentionally not persisted.
const lastQuizzed = new Map();

// Random subset of up to QUIZ_SIZE words, preferring least-recently-quizzed.
// Shuffle first so ties (e.g. the never-quizzed group) come out in random order,
// then a stable sort by last-quizzed time pushes recently used words to the back.
function pickQuizWords(words) {
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.sort(
    (a, b) => (lastQuizzed.get(a.de) || 0) - (lastQuizzed.get(b.de) || 0)
  );
  return shuffled.slice(0, QUIZ_SIZE);
}

export default function PracticeScreen() {
  const [vocab, setVocab] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exercises, setExercises] = useState(null); // [{q, answer, note}]
  const [answers, setAnswers] = useState({}); // index -> user text
  const [revealed, setRevealed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Both words and saved patterns feed the quiz pool.
      getVocab().then(setVocab);
    }, [])
  );

  async function onGenerate() {
    if (loading) return;
    setLoading(true);
    setError('');
    setExercises(null);
    setAnswers({});
    setRevealed(false);
    try {
      const picked = pickQuizWords(vocab);
      const list = await makeExercises(picked);
      const now = Date.now();
      picked.forEach((w) => lastQuizzed.set(w.de, now));
      setExercises(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (vocab.length === 0) {
    return (
      <View style={[styles.screen, { padding: 24, justifyContent: 'center' }]}>
        <Text
          style={{
            fontFamily: fonts.body,
            color: colors.muted,
            textAlign: 'center',
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          Save some words first — add them in the Vocab tab or from a
          translation, then come back to generate a quiz.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppButton
        title={exercises ? 'Generate new quiz' : 'Generate quiz'}
        icon="zap"
        onPress={onGenerate}
        loading={loading}
      />

      {error ? (
        <View style={[styles.errorBox, { marginTop: 20 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {exercises && exercises.length ? (
        <View style={{ marginTop: 20 }}>
          {exercises.map((ex, i) => (
            <View key={i} style={[styles.card, { marginBottom: 12 }]}>
              <View style={[styles.row, { alignItems: 'flex-start', gap: 10, marginBottom: 10 }]}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    backgroundColor: 'rgba(242,169,59,0.16)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.headingSemi,
                      fontSize: 13,
                      color: colors.primary,
                    }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text style={[styles.body, { flex: 1 }]}>{ex.q}</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg,
                    minHeight: 44,
                    borderRadius: 12,
                    paddingVertical: 10,
                  },
                ]}
                value={answers[i] || ''}
                onChangeText={(t) => setAnswers((a) => ({ ...a, [i]: t }))}
                placeholder="Your answer…"
                placeholderTextColor={colors.faint}
                autoCapitalize="none"
              />
              {revealed ? (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <View style={[styles.row, { gap: 6, alignItems: 'flex-start' }]}>
                    <Feather
                      name="check"
                      size={14}
                      color={colors.okText}
                      style={{ marginTop: 3 }}
                    />
                    {/* Full sentence with the answer filled in, so it can be
                        selected / translated with Google Lens as one piece. */}
                    <Text style={[styles.body, { flex: 1 }]}>
                      {(ex.q || '')
                        .replace(/\s*\([^)]*\)\s*$/, '')
                        .split(/_{2,}/)
                        .flatMap((part, j, arr) =>
                          j < arr.length - 1
                            ? [
                                part,
                                <Text
                                  key={j}
                                  style={{
                                    fontFamily: fonts.bodySemi,
                                    color: colors.okText,
                                  }}
                                >
                                  {ex.answer}
                                </Text>,
                              ]
                            : [part]
                        )}
                    </Text>
                  </View>
                  {ex.note ? (
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        lineHeight: 20,
                        color: colors.muted,
                        marginTop: 4,
                      }}
                    >
                      {ex.note}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}

          {!revealed ? (
            <AppButton
              title="Reveal answers"
              variant="outline"
              onPress={() => setRevealed(true)}
            />
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
