import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { INTRO_SEEN_KEY } from '../lib/introStorage';
import IntroScreen from '../screens/IntroScreen';
import MainTabNavigator from './MainTabNavigator';
import OnboardingEmailScreen from '../screens/OnboardingEmailScreen';
import OnboardingKidsScreen from '../screens/OnboardingKidsScreen';
import OnboardingLanguageScreen from '../screens/OnboardingLanguageScreen';
import SwitchProfileScreen from '../screens/SwitchProfileScreen';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { colors, isDark } = useTheme();
  const [introReady, setIntroReady] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(INTRO_SEEN_KEY);
        if (!cancelled) setHasSeenIntro(v === '1');
      } finally {
        if (!cancelled) setIntroReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navTheme = useMemo(
    () => ({
      ...(isDark ? NavDarkTheme : NavDefaultTheme),
      colors: {
        ...(isDark ? NavDarkTheme.colors : NavDefaultTheme.colors),
        primary: colors.primary,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    }),
    [isDark, colors]
  );

  if (!introReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        initialRouteName={hasSeenIntro ? 'SwitchProfile' : 'Intro'}
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
        }}
      >
        <Stack.Screen name="Intro" component={IntroScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="OnboardingLanguage"
          component={OnboardingLanguageScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="OnboardingKids"
          component={OnboardingKidsScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="OnboardingEmail"
          component={OnboardingEmailScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="SwitchProfile"
          component={SwitchProfileScreen}
          options={{
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
