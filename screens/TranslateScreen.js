import { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { translate, translateImage } from '../lib/ai';
import { saveWord } from '../lib/store';
import { AppButton } from './Button';
import { styles, colors } from './theme';

const DIRS = [
  { key: 'de-en', label: 'DE → EN' },
  { key: 'en-de', label: 'EN → DE' },
];

export default function TranslateScreen() {
  const [dir, setDir] = useState('de-en');
  const [text, setText] = useState('');
  const [flight, setFlight] = useState(null); // 'text' | 'camera' | 'gallery' | null
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { german?, translation, words }
  const [saved, setSaved] = useState({}); // de -> true

  const loading = flight !== null; // any AI action in flight

  async function onTranslate() {
    if (loading || !text.trim()) return;
    setFlight('text');
    setError('');
    setResult(null);
    setSaved({});
    try {
      setResult(await translate(text.trim(), dir));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setFlight(null);
    }
  }

  // Holds the in-flight state across the whole pick + API call so all buttons
  // stay disabled (and taps are ignored) until it finishes.
  async function pickImage(fromCamera) {
    if (loading) return;
    setFlight(fromCamera ? 'camera' : 'gallery');
    setError('');
    setResult(null);
    setSaved({});
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow access to use this.');
        return;
      }

      const picker = fromCamera
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;
      const res = await picker({ base64: true, quality: 0.6 });
      if (res.canceled) return;

      const base64 = res.assets?.[0]?.base64;
      if (!base64) {
        setError('Could not read image data.');
        return;
      }
      setResult(await translateImage(base64));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setFlight(null);
    }
  }

  async function onSave(w) {
    await saveWord({ de: w.de, article: w.article, meaning: w.meaning });
    setSaved((s) => ({ ...s, [w.de]: true }));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.row, { marginBottom: 12 }]}>
        {DIRS.map((d) => {
          const active = d.key === dir;
          return (
            <TouchableOpacity
              key={d.key}
              onPress={() => setDir(d.key)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: active ? colors.primary : '#fff',
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                borderTopLeftRadius: d.key === 'de-en' ? 8 : 0,
                borderBottomLeftRadius: d.key === 'de-en' ? 8 : 0,
                borderTopRightRadius: d.key === 'en-de' ? 8 : 0,
                borderBottomRightRadius: d.key === 'en-de' ? 8 : 0,
              }}
            >
              <Text
                style={{
                  fontWeight: '600',
                  color: active ? '#fff' : colors.text,
                }}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={[styles.input, styles.multiline]}
        value={text}
        onChangeText={setText}
        placeholder={dir === 'de-en' ? 'German text…' : 'English text…'}
        multiline
      />

      <AppButton
        title="Translate"
        onPress={onTranslate}
        loading={flight === 'text'}
        disabled={loading}
        style={{ marginTop: 10 }}
      />

      <View style={[styles.row, { marginTop: 10, gap: 10 }]}>
        <AppButton
          title="📷 Camera"
          variant="outline"
          onPress={() => pickImage(true)}
          loading={flight === 'camera'}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <AppButton
          title="🖼 Gallery"
          variant="outline"
          onPress={() => pickImage(false)}
          loading={flight === 'gallery'}
          disabled={loading}
          style={{ flex: 1 }}
        />
      </View>

      {error ? (
        <View style={[styles.errorBox, { marginTop: 20 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={{ marginTop: 20 }}>
          {result.german ? (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <Text style={styles.sectionLabel}>Extracted German</Text>
              <Text style={{ fontSize: 16, color: colors.text }}>
                {result.german}
              </Text>
            </View>
          ) : null}

          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.sectionLabel}>Translation</Text>
            <Text style={{ fontSize: 16, color: colors.text }}>
              {result.translation}
            </Text>
          </View>

          {(result.words || []).length ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Words</Text>
              {result.words.map((w, i) => (
                <View
                  key={`${w.de}-${i}`}
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
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>
                    {w.article ? `${w.article} ` : ''}
                    <Text style={{ fontWeight: '600' }}>{w.de}</Text>
                    {w.meaning ? ` — ${w.meaning}` : ''}
                  </Text>
                  <TouchableOpacity
                    onPress={() => onSave(w)}
                    disabled={!!saved[w.de]}
                    style={{ paddingHorizontal: 10, paddingVertical: 4 }}
                  >
                    <Text
                      style={{
                        color: saved[w.de] ? colors.ok : colors.primary,
                        fontWeight: '600',
                      }}
                    >
                      {saved[w.de] ? 'Saved ✓' : '+ Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
