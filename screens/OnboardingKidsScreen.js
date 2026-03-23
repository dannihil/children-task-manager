import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '../components/GlassButton';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { useTaskRewards } from '../context/TaskRewardsContext';
import { createOnboardingStyles } from './onboardingScreenStyles';

export default function OnboardingKidsScreen({ navigation }) {
  const { tx } = useLocale();
  const { colors } = useTheme();
  const styles = useMemo(() => createOnboardingStyles(colors), [colors]);
  const { profiles, addProfile, removeProfile, renameProfile } = useTaskRewards();
  const [newName, setNewName] = useState('');
  const [namesById, setNamesById] = useState({});

  useEffect(() => {
    setNamesById((prev) => {
      const next = { ...prev };
      for (const p of profiles) {
        if (next[p.id] === undefined) next[p.id] = p.name;
      }
      for (const id of Object.keys(next)) {
        if (!profiles.some((p) => p.id === id)) delete next[id];
      }
      return next;
    });
  }, [profiles]);

  const updateDraft = (id, text) => {
    setNamesById((s) => ({ ...s, [id]: text }));
  };

  const submitAdd = () => {
    const n = newName.trim();
    if (!n) return;
    addProfile(n);
    setNewName('');
  };

  const onContinue = () => {
    for (const p of profiles) {
      const raw = namesById[p.id] ?? p.name;
      const n = String(raw).trim();
      if (n.length < 1) {
        Alert.alert('', tx('onboarding.nameRequired'));
        return;
      }
      if (n !== p.name) renameProfile(p.id, n);
    }
    navigation.navigate('OnboardingEmail');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{tx('onboarding.kidsTitle')}</Text>
        <Text style={styles.sub}>{tx('onboarding.kidsSub')}</Text>

        {profiles.map((p) => (
          <View key={p.id} style={styles.childRow}>
            <Text style={styles.rowLabel}>{tx('onboarding.childNameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={namesById[p.id] ?? p.name}
              onChangeText={(t) => updateDraft(p.id, t)}
              placeholder={tx('onboarding.childNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {profiles.length > 1 ? (
              <Pressable onPress={() => removeProfile(p.id)} hitSlop={8}>
                <Text style={styles.removeText}>{tx('onboarding.removeChild')}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.rowLabel}>{tx('onboarding.addAnotherLabel')}</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.addInput]}
              value={newName}
              onChangeText={setNewName}
              placeholder={tx('onboarding.addAnotherPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={submitAdd}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Pressable onPress={submitAdd} hitSlop={12}>
              <Text style={styles.addBtnText}>{tx('onboarding.addChildButton')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <GlassButton variant="primary" onPress={onContinue}>
            {tx('onboarding.continue')}
          </GlassButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
