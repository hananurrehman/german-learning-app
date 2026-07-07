import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getVocab, saveWord, updateWord, deleteWord } from '../lib/store';
import { wordMeaning } from '../lib/ai';
import { styles, colors, fonts } from './theme';

const FILTERS = [
  { key: 'word', label: 'Words' },
  { key: 'pattern', label: 'Patterns' },
];

export default function VocabScreen() {
  const [vocab, setVocab] = useState([]);
  const [filter, setFilter] = useState('word');
  const [query, setQuery] = useState('');
  const [newWord, setNewWord] = useState('');
  const [busy, setBusy] = useState({}); // de -> true while fetching meaning
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setVocab(await getVocab());
  }, []);

  const q = query.trim().toLowerCase();
  const visible = vocab.filter(
    (w) =>
      w.type === filter &&
      (!q ||
        w.de.toLowerCase().includes(q) ||
        (w.meaning || '').toLowerCase().includes(q))
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function onAdd() {
    const de = newWord.trim();
    if (!de) return;
    setNewWord('');
    setVocab(await saveWord({ de, article: '', meaning: '' }));
  }

  // Tap: if meaning is empty, pull article + meaning from AI and store it.
  async function onTap(item) {
    if (item.meaning || busy[item.de]) return; // have it, or already fetching
    setError('');
    setBusy((b) => ({ ...b, [item.de]: true }));
    try {
      const { article, meaning } = await wordMeaning(item.de);
      setVocab(await updateWord(item.de, { article, meaning }));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy((b) => ({ ...b, [item.de]: false }));
    }
  }

  function onDelete(item) {
    Alert.alert('Delete word', `Remove "${item.de}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => setVocab(await deleteWord(item.de)),
      },
    ]);
  }

  function renderItem({ item }) {
    const loading = busy[item.de];
    return (
      <Pressable
        onPress={() => onTap(item)}
        onLongPress={() => onDelete(item)}
        style={({ pressed }) => [
          styles.card,
          { paddingVertical: 14, marginBottom: 8 },
          pressed && { transform: [{ scale: 0.985 }] },
        ]}
      >
        <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
          <Text style={[styles.body, { flex: 1, fontSize: 16 }]}>
            {item.article ? `${item.article} ` : ''}
            <Text style={{ fontFamily: fonts.bodySemi }}>{item.de}</Text>
            {item.meaning ? (
              <Text style={{ color: colors.muted }}> — {item.meaning}</Text>
            ) : null}
          </Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !item.meaning ? (
            <Text
              style={{
                fontFamily: fonts.headingSemi,
                fontSize: 12,
                color: colors.primary,
              }}
            >
              tap for meaning ›
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View style={[styles.segmentWrap, { marginBottom: 12 }]}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={active ? styles.segmentTextActive : styles.segmentText}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[
            styles.input,
            styles.row,
            { marginBottom: 12, minHeight: 46, paddingVertical: 0, gap: 8 },
          ]}
        >
          <Feather name="search" size={16} color={colors.faint} />
          <TextInput
            style={{
              flex: 1,
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.text,
              paddingVertical: 10,
            }}
            value={query}
            onChangeText={setQuery}
            placeholder={filter === 'word' ? 'Search words…' : 'Search patterns…'}
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {filter === 'word' ? (
          <View style={[styles.row, { gap: 10 }]}>
            <TextInput
              style={[styles.input, { flex: 1, minHeight: 46 }]}
              value={newWord}
              onChangeText={setNewWord}
              placeholder="Add a German word…"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              onSubmitEditing={onAdd}
              returnKeyType="done"
            />
            <Pressable
              onPress={onAdd}
              style={({ pressed }) => [
                {
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <Feather name="plus" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.errorBox, { marginTop: 10 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(w) => w.de}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}
        ListEmptyComponent={
          <Text
            style={{
              fontFamily: fonts.body,
              color: colors.muted,
              textAlign: 'center',
              marginTop: 40,
            }}
          >
            {q
              ? 'No matches.'
              : filter === 'word'
              ? 'No words yet. Add one above, or save words from the Translate tab.'
              : 'No patterns yet. Save one from the Write tab.'}
          </Text>
        }
      />
      <Text
        style={{
          fontFamily: fonts.body,
          color: colors.faint,
          fontSize: 12,
          textAlign: 'center',
          paddingBottom: 10,
        }}
      >
        Tap a word for its meaning · long-press to delete
      </Text>
    </View>
  );
}
