import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocaleProvider } from './context/LocaleContext';
import { TaskRewardsProvider } from './context/TaskRewardsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import RootNavigator from './navigation/RootNavigator';

const SIGNATURE_IMAGE = require('./api/taskykids-email-signature.png');

function StartupSplash() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const imageStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
    transform: [
      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] }) },
    ],
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f7f3ee',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: 210,
          backgroundColor: '#dff3ed',
          top: -140,
          right: -120,
          opacity: 0.55,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: 180,
          backgroundColor: '#dbe7fb',
          bottom: -120,
          left: -120,
          opacity: 0.45,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: '#fff1de',
          bottom: 80,
          right: -140,
          opacity: 0.35,
        }}
      />
      <Animated.View style={imageStyle}>
        <Image
          source={SIGNATURE_IMAGE}
          resizeMode="contain"
          style={{ width: 330, height: 160 }}
        />
      </Animated.View>
    </View>
  );
}

function ThemedShell() {
  const { isDark } = useTheme();
  return (
    <>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const startFade = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setShowStartupSplash(false));
    }, 2200);
    return () => clearTimeout(startFade);
  }, [splashOpacity]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocaleProvider>
          <ThemeProvider>
            <TaskRewardsProvider>
              <ThemedShell />
            </TaskRewardsProvider>
          </ThemeProvider>
        </LocaleProvider>
      </SafeAreaProvider>
      {showStartupSplash ? (
        <Animated.View
          pointerEvents="none"
          style={{ ...StyleSheet.absoluteFillObject, opacity: splashOpacity }}
        >
          <StartupSplash />
          <StatusBar style="dark" />
        </Animated.View>
      ) : null}
    </GestureHandlerRootView>
  );
}
