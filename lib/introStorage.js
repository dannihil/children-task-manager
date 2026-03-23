import AsyncStorage from '@react-native-async-storage/async-storage';

export const INTRO_SEEN_KEY = '@ctm/introSeen';

export async function markIntroSeen() {
  try {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function clearIntroSeen() {
  try {
    await AsyncStorage.removeItem(INTRO_SEEN_KEY);
  } catch {
    /* ignore */
  }
}
