import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { translate, translateImage } from '../lib/ai';
import { getVocab, saveWord } from '../lib/store';
import { AppButton } from './Button';
import { styles, colors, fonts } from './theme';

const DIRS = [
  { key: 'de-en', label: 'DE → EN' },
  { key: 'en-de', label: 'EN → DE' },
];

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

export default function TranslateScreen() {
  const [dir, setDir] = useState('de-en');
  const [text, setText] = useState('');
  const [flight, setFlight] = useState(null); // 'text' | 'camera' | 'gallery' | null
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { german?, translation, words }
  const [vocabWords, setVocabWords] = useState(new Set()); // lowercase de of saved words

  const loading = flight !== null; // any AI action in flight

  // Keep the "already saved" set fresh whenever this tab regains focus
  // (e.g. after saving/deleting words elsewhere).
  useFocusEffect(
    useCallback(() => {
      getVocab().then((list) => {
        setVocabWords(
          new Set(
            list
              .filter((w) => w.type === 'word')
              .map((w) => w.de.toLowerCase())
          )
        );
      });
    }, [])
  );

  async function onTranslate() {
    if (loading || !text.trim()) return;
    setFlight('text');
    setError('');
    setResult(null);
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
    setVocabWords((s) => new Set(s).add(w.de.toLowerCase()));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.segmentWrap, { marginBottom: 12 }]}>
        {DIRS.map((d) => {
          const active = d.key === dir;
          return (
            <TouchableOpacity
              key={d.key}
              onPress={() => setDir(d.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={active ? styles.segmentTextActive : styles.segmentText}>
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
        placeholderTextColor={colors.faint}
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
          title="Camera"
          icon="camera"
          variant="outline"
          onPress={() => pickImage(true)}
          loading={flight === 'camera'}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <AppButton
          title="Gallery"
          icon="image"
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
              <Text style={styles.body}>{result.german}</Text>
            </View>
          ) : null}

          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.sectionLabel}>Translation</Text>
            <Text style={styles.body}>{result.translation}</Text>
          </View>

          {(result.words || []).length ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Words</Text>
              {result.words.map((w, i) => {
                const isSaved = vocabWords.has(w.de.toLowerCase());
                return (
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
                    <Text style={[styles.body, { flex: 1 }]}>
                      {w.article ? `${w.article} ` : ''}
                      <Text style={{ fontFamily: fonts.bodySemi }}>{w.de}</Text>
                      {w.meaning ? (
                        <Text style={{ color: colors.muted }}> — {w.meaning}</Text>
                      ) : null}
                    </Text>
                    <SaveChip saved={isSaved} onPress={() => onSave(w)} />
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
