import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassButton } from "../components/GlassButton";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { useTaskRewards } from "../context/TaskRewardsContext";
import { createOnboardingStyles } from "./onboardingScreenStyles";

export default function OnboardingKidsScreen({ navigation }) {
  const { tx } = useLocale();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createOnboardingStyles(colors, isDark), [colors, isDark]);
  const { profiles, addProfile, removeProfile, renameProfile } =
    useTaskRewards();
  const [newName, setNewName] = useState("");
  const namedProfiles = profiles.filter((p) => p.name.trim().length > 0);

  const submitAdd = () => {
    const n = newName.trim();
    if (!n) return;
    const firstEmpty = profiles.find((p) => p.name.trim().length === 0);
    if (firstEmpty) {
      renameProfile(firstEmpty.id, n);
    } else {
      addProfile(n);
    }
    setNewName("");
  };

  const onContinue = () => {
    if (namedProfiles.length < 1) {
      Alert.alert("", tx("onboarding.nameRequired"));
      return;
    }
    navigation.navigate("OnboardingEmail");
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{tx("onboarding.kidsTitle")}</Text>
        <Text style={styles.sub}>{tx("onboarding.kidsSub")}</Text>

        <View style={styles.card}>
          <Text style={styles.rowLabel}>
            {tx("onboarding.addAnotherLabel")}
          </Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.addInput]}
              value={newName}
              onChangeText={setNewName}
              placeholder={tx("onboarding.addAnotherPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={submitAdd}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Pressable onPress={submitAdd} hitSlop={12}>
              <Text style={styles.addBtnText}>
                {tx("onboarding.addChildButton")}
              </Text>
            </Pressable>
          </View>
        </View>

        {namedProfiles.map((p) => (
          <View key={p.id} style={styles.childRow}>
            <Text style={styles.rowLabel}>
              {tx("onboarding.childNameLabel")}
            </Text>
            <View style={styles.input}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>
                {p.name}
              </Text>
            </View>
            <Pressable onPress={() => removeProfile(p.id)} hitSlop={8}>
              <Text style={styles.removeText}>
                {tx("onboarding.removeChild")}
              </Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.footer}>
          <GlassButton variant="primary" onPress={onContinue}>
            {tx("onboarding.continue")}
          </GlassButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
