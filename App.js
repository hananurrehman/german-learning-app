import { Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TranslateScreen from './screens/TranslateScreen';
import WriteScreen from './screens/WriteScreen';
import VocabScreen from './screens/VocabScreen';
import SettingsScreen from './screens/SettingsScreen';
import PracticeScreen from './screens/PracticeScreen';
import { colors } from './screens/theme';

const Tab = createBottomTabNavigator();
const VocabStack = createNativeStackNavigator();

// The Vocab tab is a stack so its header can carry the gear → Settings.
function VocabTab() {
  return (
    <VocabStack.Navigator>
      <VocabStack.Screen
        name="VocabList"
        component={VocabScreen}
        options={({ navigation }) => ({
          title: 'Vocab',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              hitSlop={10}
            >
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <VocabStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </VocabStack.Navigator>
  );
}

const TAB_ICON = {
  Translate: '🌐',
  Write: '✍️',
  Vocab: '📚',
  Practice: '🎯',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarActiveTintColor: colors.primary,
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>{TAB_ICON[route.name]}</Text>
            ),
          })}
        >
          <Tab.Screen name="Translate" component={TranslateScreen} />
          <Tab.Screen name="Write" component={WriteScreen} />
          <Tab.Screen
            name="Vocab"
            component={VocabTab}
            options={{ headerShown: false }}
          />
          <Tab.Screen name="Practice" component={PracticeScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
