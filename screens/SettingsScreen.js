import { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getKey, setKey, exportJson, importJson } from '../lib/store';
import { styles, colors } from './theme';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getKey().then((k) => k && setApiKey(k));
  }, []);

  async function onSaveKey() {
    await setKey(apiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  async function onExport() {
    setError('');
    try {
      const json = await exportJson();
      const uri = FileSystem.documentDirectory + 'vocab-backup.json';
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export vocab',
        });
      } else {
        Alert.alert('Saved', `Backup written to:\n${uri}`);
      }
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function onImport() {
    setError('');
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      const str = await FileSystem.readAsStringAsync(uri);
      const merged = await importJson(str);
      Alert.alert('Imported', `Vocab now has ${merged.length} words.`);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Anthropic API key</Text>
      <TextInput
        style={styles.input}
        value={apiKey}
        onChangeText={setApiKey}
        placeholder="sk-ant-…"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <TouchableOpacity style={[styles.btn, { marginTop: 10 }]} onPress={onSaveKey}>
        <Text style={styles.btnText}>{keySaved ? 'Saved ✓' : 'Save key'}</Text>
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 24 }} />

      <Text style={styles.label}>Backup</Text>
      <TouchableOpacity style={[styles.btnOutline, { marginTop: 6 }]} onPress={onExport}>
        <Text style={styles.btnOutlineText}>Export vocab (JSON)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={onImport}>
        <Text style={styles.btnOutlineText}>Import vocab (JSON)</Text>
      </TouchableOpacity>

      {error ? (
        <View style={[styles.errorBox, { marginTop: 20 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
