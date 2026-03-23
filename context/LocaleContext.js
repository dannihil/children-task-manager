import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import is from '../locales/is.json';
import pl from '../locales/pl.json';
import pt from '../locales/pt.json';

const STORAGE_KEY = '@ctm/locale';

const DICTS = { en, is, es, de, fr, pt, pl };

export const SUPPORTED_LANGUAGES = ['en', 'is', 'es', 'de', 'fr', 'pt', 'pl'];

const SUPPORTED_SET = new Set(SUPPORTED_LANGUAGES);

function deviceDefaultLanguage() {
  try {
    const code = Localization.getLocales?.()?.[0]?.languageCode;
    if (code && SUPPORTED_SET.has(code)) return code;
  } catch {
    /* ignore */
  }
  return 'en';
}

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => {
    if (acc && acc[part] !== undefined) return acc[part];
    return undefined;
  }, obj);
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] != null ? String(params[key]) : ''
  );
}

const Ctx = createContext(null);

export function LocaleProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (stored && SUPPORTED_SET.has(stored)) {
          setLanguageState(stored);
        } else {
          setLanguageState(deviceDefaultLanguage());
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (lang) => {
    if (!SUPPORTED_SET.has(lang)) return;
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);

  const tx = useCallback(
    (key, params) => {
      let str = getNested(DICTS[language], key);
      if (typeof str !== 'string') str = getNested(DICTS.en, key);
      if (typeof str !== 'string') return key;
      return interpolate(str, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      tx,
      ready,
    }),
    [language, setLanguage, tx, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLocale must be used within LocaleProvider');
  return v;
}
