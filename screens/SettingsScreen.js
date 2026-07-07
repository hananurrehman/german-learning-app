import { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getKey, setKey, exportJson, importJson } from '../lib/store';
import { AppButton } from './Button';
import { styles, colors, fonts } from './theme';

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
      <View style={[styles.input, styles.row, { paddingVertical: 0, gap: 8 }]}>
        <Feather name="key" size={16} color={colors.faint} />
        <TextInput
          style={{
            flex: 1,
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.text,
            paddingVertical: 12,
          }}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-ant-…"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>
      <AppButton
        title={keySaved ? 'Saved ✓' : 'Save key'}
        onPress={onSaveKey}
        style={{ marginTop: 10 }}
      />

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 26 }} />

      <Text style={styles.label}>Backup</Text>
      <AppButton
        title="Export vocab (JSON)"
        icon="upload"
        variant="outline"
        onPress={onExport}
        style={{ marginTop: 6 }}
      />
      <AppButton
        title="Import vocab (JSON)"
        icon="download"
        variant="outline"
        onPress={onImport}
        style={{ marginTop: 10 }}
      />

      {error ? (
        <View style={[styles.errorBox, { marginTop: 20 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
