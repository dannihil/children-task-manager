import { useMemo, useState } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '../components/GlassButton';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { useTaskRewards } from '../context/TaskRewardsContext';
import { createOnboardingStyles } from './onboardingScreenStyles';

export default function OnboardingEmailScreen({ navigation }) {
  const { tx } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createOnboardingStyles(colors), [colors]);
  const {
    parentEmail,
    emailNotifyTaskComplete,
    emailNotifyRewardRedeem,
    setParentSettings,
    completeOnboarding,
  } = useTaskRewards();

  const [email, setEmail] = useState(parentEmail);

  const finish = () => {
    setParentSettings({
      parentEmail: email.trim(),
      emailNotifyTaskComplete,
      emailNotifyRewardRedeem,
    });
    completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'SwitchProfile' }] });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{tx('onboarding.emailTitle')}</Text>
        <Text style={styles.sub}>{tx('onboarding.emailSub')}</Text>

        <View style={styles.card}>
          <Text style={styles.rowLabel}>{tx('onboarding.emailLabel')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={tx('onboarding.emailPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          <View style={styles.switchBlock}>
            <View style={styles.switchLabels}>
              <Text style={styles.switchLabel}>{tx('onboarding.notifyTaskLabel')}</Text>
              <Text style={styles.switchSub}>{tx('onboarding.notifyTaskSub')}</Text>
            </View>
            <Switch
              value={emailNotifyTaskComplete}
              onValueChange={(v) => setParentSettings({ emailNotifyTaskComplete: v })}
              trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
              thumbColor="#ffffff"
              ios_backgroundColor={colors.surfaceMuted}
            />
          </View>

          <View style={styles.switchBlock}>
            <View style={styles.switchLabels}>
              <Text style={styles.switchLabel}>{tx('onboarding.notifyRewardLabel')}</Text>
              <Text style={styles.switchSub}>{tx('onboarding.notifyRewardSub')}</Text>
            </View>
            <Switch
              value={emailNotifyRewardRedeem}
              onValueChange={(v) => setParentSettings({ emailNotifyRewardRedeem: v })}
              trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
              thumbColor="#ffffff"
              ios_backgroundColor={colors.surfaceMuted}
            />
          </View>
        </View>

        <Text style={styles.hint}>{tx('onboarding.emailHint')}</Text>

        <View style={styles.footer}>
          <GlassButton variant="primary" onPress={finish}>
            {tx('onboarding.done')}
          </GlassButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
