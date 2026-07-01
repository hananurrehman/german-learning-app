import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getVocab, saveWord, updateWord, deleteWord } from '../lib/store';
import { wordMeaning } from '../lib/ai';
import { styles, colors } from './theme';

export default function VocabScreen() {
  const [vocab, setVocab] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [busy, setBusy] = useState({}); // de -> true while fetching meaning
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setVocab(await getVocab());
  }, []);

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
      <TouchableOpacity
        onPress={() => onTap(item)}
        onLongPress={() => onDelete(item)}
        style={[styles.card, { marginBottom: 8 }]}
      >
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>
            {item.article ? `${item.article} ` : ''}
            <Text style={{ fontWeight: '600' }}>{item.de}</Text>
            {item.meaning ? ` — ${item.meaning}` : ''}
          </Text>
          {loading ? (
            <ActivityIndicator />
          ) : !item.meaning ? (
            <Text style={{ color: colors.muted, fontSize: 12 }}>tap ▸</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={[styles.row, { gap: 10 }]}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newWord}
            onChangeText={setNewWord}
            placeholder="Add a German word…"
            autoCapitalize="none"
            onSubmitEditing={onAdd}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.btn} onPress={onAdd}>
            <Text style={styles.btnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={[styles.errorBox, { marginTop: 10 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={vocab}
        keyExtractor={(w) => w.de}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
            No words yet. Add one above, or save words from the Translate tab.
          </Text>
        }
      />
      <Text
        style={{
          color: colors.muted,
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
