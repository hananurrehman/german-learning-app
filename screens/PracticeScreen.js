import { useState, useCallback } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getVocab } from '../lib/store';
import { makeExercises } from '../lib/ai';
import { styles, colors } from './theme';

export default function PracticeScreen() {
  const [vocab, setVocab] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exercises, setExercises] = useState(null); // [{q, answer, note}]
  const [answers, setAnswers] = useState({}); // index -> user text
  const [revealed, setRevealed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getVocab().then(setVocab);
    }, [])
  );

  async function onGenerate() {
    setLoading(true);
    setError('');
    setExercises(null);
    setAnswers({});
    setRevealed(false);
    try {
      const list = await makeExercises(vocab);
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
        <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 15 }}>
          Save some words first — add them in the Vocab tab or from a
          translation, then come back to generate a quiz.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={onGenerate}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {exercises ? 'Generate new quiz' : 'Generate quiz'}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {error ? (
        <View style={[styles.errorBox, { marginTop: 20 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {exercises && exercises.length ? (
        <View style={{ marginTop: 20 }}>
          {exercises.map((ex, i) => (
            <View key={i} style={[styles.card, { marginBottom: 12 }]}>
              <Text style={{ fontSize: 15, color: colors.text, marginBottom: 8 }}>
                {i + 1}. {ex.q}
              </Text>
              <TextInput
                style={styles.input}
                value={answers[i] || ''}
                onChangeText={(t) => setAnswers((a) => ({ ...a, [i]: t }))}
                placeholder="Your answer…"
                autoCapitalize="none"
              />
              {revealed ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.ok, fontWeight: '600' }}>
                    Answer: {ex.answer}
                  </Text>
                  {ex.note ? (
                    <Text style={{ color: colors.muted, marginTop: 4 }}>
                      {ex.note}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}

          {!revealed ? (
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => setRevealed(true)}
            >
              <Text style={styles.btnOutlineText}>Reveal answers</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
