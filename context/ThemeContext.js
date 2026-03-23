import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { darkColors, lightColors } from '../theme/colors';

const STORAGE_KEY = '@ctm/darkMode';

const Ctx = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDarkState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (v === '1') setIsDarkState(true);
        else if (v === '0') setIsDarkState(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDarkMode = useCallback((value) => {
    setIsDarkState(Boolean(value));
    AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0').catch(() => {});
  }, []);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      setDarkMode,
      colors,
      ready,
    }),
    [isDark, setDarkMode, colors, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}
