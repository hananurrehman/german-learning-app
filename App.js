// TEMPORARY test harness for step 1. Will be deleted once real screens exist.
import { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setKey } from './lib/store';
import { translate } from './lib/ai';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [sentence, setSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function onSaveKey() {
    await setKey(apiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  async function onTranslate() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const obj = await translate(sentence, 'de-en');
      setResult(obj);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.h1}>Step 1 — AI test harness</Text>

      <Text style={styles.label}>Anthropic API key</Text>
      <TextInput
        style={styles.input}
        value={apiKey}
        onChangeText={setApiKey}
        placeholder="sk-ant-..."
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <TouchableOpacity style={styles.btn} onPress={onSaveKey}>
        <Text style={styles.btnText}>{keySaved ? 'Saved ✓' : 'Save key'}</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 24 }]}>German sentence</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={sentence}
        onChangeText={setSentence}
        placeholder="Der Hund läuft schnell."
        multiline
      />
      <TouchableOpacity
        style={styles.btn}
        onPress={onTranslate}
        disabled={loading}
      >
        <Text style={styles.btnText}>Translate DE→EN</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>translation</Text>
          <Text style={styles.resultText}>{result.translation}</Text>

          <Text style={[styles.resultLabel, { marginTop: 16 }]}>words</Text>
          {(result.words || []).map((w, i) => (
            <Text key={i} style={styles.wordRow}>
              {w.article ? w.article + ' ' : ''}
              {w.de} — {w.meaning}
            </Text>
          ))}

          <Text style={[styles.resultLabel, { marginTop: 16 }]}>raw JSON</Text>
          <Text style={styles.raw}>{JSON.stringify(result, null, 2)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 13, color: '#555', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  btn: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  errorBox: {
    marginTop: 20,
    backgroundColor: '#ffeef0',
    borderColor: '#ffccd0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: '#cf222e', fontSize: 14 },
  resultBox: {
    marginTop: 20,
    backgroundColor: '#f6f8fa',
    borderRadius: 8,
    padding: 12,
  },
  resultLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultText: { fontSize: 16, marginTop: 4 },
  wordRow: { fontSize: 15, marginTop: 4 },
  raw: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#444',
    marginTop: 4,
  },
});
