import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { checkSentence } from '../lib/ai';
import { AppButton } from './Button';
import { styles, colors } from './theme';

export default function WriteScreen() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { corrected, structure, genders }

  async function onCheck() {
    if (loading || !text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await checkSentence(text.trim()));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const changed =
    result && result.corrected.trim() !== text.trim();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={text}
        onChangeText={setText}
        placeholder="Write a German sentence…"
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
          <View
            style={[
              styles.card,
              { marginBottom: 12 },
              changed && {
                backgroundColor: '#fff8e1',
                borderColor: '#f0c000',
              },
            ]}
          >
            <Text style={styles.sectionLabel}>
              Corrected{changed ? ' (changed)' : ''}
            </Text>
            <Text style={{ fontSize: 16, color: colors.text }}>
              {result.corrected}
            </Text>
          </View>

          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.sectionLabel}>Structure</Text>
            <Text style={{ fontSize: 16, color: colors.text, lineHeight: 24 }}>
              {result.structure}
            </Text>
          </View>

          {(result.genders || []).length ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Gender check</Text>
              {result.genders.map((g, i) => (
                <View
                  key={`${g.word}-${i}`}
                  style={[
                    styles.row,
                    {
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 15, color: colors.text }}>
                    <Text style={{ fontWeight: '600' }}>{g.article}</Text>{' '}
                    {g.word}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      color: g.ok ? colors.ok : colors.danger,
                      fontWeight: '700',
                    }}
                  >
                    {g.ok ? '✓' : '✗'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
