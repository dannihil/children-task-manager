import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocaleProvider } from './context/LocaleContext';
import { TaskRewardsProvider } from './context/TaskRewardsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import RootNavigator from './navigation/RootNavigator';

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
    </GestureHandlerRootView>
  );
}
