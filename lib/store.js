import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getKey() {
  return AsyncStorage.getItem('apiKey');
}

export async function setKey(k) {
  return AsyncStorage.setItem('apiKey', k);
}
