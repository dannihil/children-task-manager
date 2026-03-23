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
  const { tx, setLanguage } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createOnboardingStyles(colors), [colors]);
  const { applyOnboardingLanguageDefaults } = useTaskRewards();

  const choose = async (code) => {
    await setLanguage(code);
    applyOnboardingLanguageDefaults(code);
    navigation.navigate('OnboardingKids');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{tx('onboarding.languageTitle')}</Text>
        <Text style={styles.sub}>{tx('onboarding.languageSub')}</Text>

        <View style={styles.card}>
          {LANGUAGE_OPTIONS.map(({ code, labelKey, flag }, i) => (
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
              accessibilityLabel={`${tx(labelKey)}, ${tx(`parent.langRegions.${code}`)}`}
            >
              <Text style={rowStyles.flag} importantForAccessibility="no">
                {flag}
              </Text>
              <View style={rowStyles.labels}>
                <Text style={[rowStyles.langName, { color: colors.text }]}>{tx(labelKey)}</Text>
                <Text style={[rowStyles.region, { color: colors.textSecondary }]}>
                  {tx(`parent.langRegions.${code}`)}
                </Text>
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
