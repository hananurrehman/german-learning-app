import { View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';

import TranslateScreen from './screens/TranslateScreen';
import WriteScreen from './screens/WriteScreen';
import VocabScreen from './screens/VocabScreen';
import SettingsScreen from './screens/SettingsScreen';
import PracticeScreen from './screens/PracticeScreen';
import { colors, fonts } from './screens/theme';

const Tab = createBottomTabNavigator();
const VocabStack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

const headerOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.text,
  },
};

// The Vocab tab is a stack so its header can carry the gear → Settings.
function VocabTab() {
  return (
    <VocabStack.Navigator screenOptions={headerOptions}>
      <VocabStack.Screen
        name="VocabList"
        component={VocabScreen}
        options={({ navigation }) => ({
          title: 'Vocab',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              hitSlop={10}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="settings" size={20} color={colors.muted} />
            </TouchableOpacity>
          ),
        })}
      />
      <VocabStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerTitleStyle: { ...headerOptions.headerTitleStyle, fontSize: 24 },
        }}
      />
    </VocabStack.Navigator>
  );
}

const TAB_ICON = {
  Translate: 'globe',
  Write: 'edit-3',
  Vocab: 'book-open',
  Practice: 'target',
};

// Active tab: 54×30 mustard pill around the icon, icon dark teal.
function TabIcon({ route, focused }) {
  return (
    <View
      style={{
        width: 54,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.primary : 'transparent',
      }}
    >
      <Feather
        name={TAB_ICON[route.name]}
        size={19}
        color={focused ? colors.onPrimary : colors.muted}
      />
    </View>
  );
}

// Must render inside SafeAreaProvider so useSafeAreaInsets reports real values.
function Tabs() {
  const insets = useSafeAreaInsets();
  // Keep labels above the Android gesture pill / iOS home indicator; never let
  // them hug the screen edge on button-nav devices that report inset 0.
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOptions,
        tabBarStyle: {
          backgroundColor: 'rgba(18,46,56,0.92)',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: bottomPad,
          height: 56 + bottomPad,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabel: ({ focused, color }) => (
          <Text
            style={{
              fontFamily: focused ? fonts.headingSemi : fonts.headingMedium,
              fontSize: 11,
              color,
            }}
          >
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ focused }) => <TabIcon route={route} focused={focused} />,
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
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Tabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
