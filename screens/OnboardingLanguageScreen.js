import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { useTaskRewards } from '../context/TaskRewardsContext';
import { LANGUAGE_OPTIONS } from '../lib/languageOptions';
import { createOnboardingStyles } from './onboardingScreenStyles';

export default function OnboardingLanguageScreen({ navigation }) {
  const { setLanguage } = useLocale();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createOnboardingStyles(colors, isDark), [colors, isDark]);
  const { applyOnboardingLanguageDefaults } = useTaskRewards();

  const choose = async (code) => {
    await setLanguage(code);
    applyOnboardingLanguageDefaults(code);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Intro', params: { fromLanguageOnboarding: true } }],
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choose app language</Text>
        <Text style={styles.sub}>
          Tasks and rewards will start in this language. You can change it anytime in parent
          settings.
        </Text>

        <View style={styles.card}>
          {LANGUAGE_OPTIONS.map(({ code, flag, nativeLabel, englishRegion }, i) => (
            <Pressable
              key={code}
              onPress={() => void choose(code)}
              style={({ pressed }) => [
                rowStyles.row,
                i < LANGUAGE_OPTIONS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                { opacity: pressed ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${nativeLabel}, ${englishRegion}`}
            >
              <Text style={rowStyles.flag} importantForAccessibility="no">
                {flag}
              </Text>
              <View style={rowStyles.labels}>
                <Text style={[rowStyles.langName, { color: colors.text }]}>{nativeLabel}</Text>
                <Text style={[rowStyles.region, { color: colors.textSecondary }]}>{englishRegion}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.textSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  flag: {
    fontSize: 28,
    marginRight: 14,
  },
  labels: {
    flex: 1,
  },
  langName: {
    fontSize: 17,
    fontWeight: '800',
  },
  region: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});
