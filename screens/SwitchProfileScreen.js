import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { useTaskRewards } from '../context/TaskRewardsContext';
import { deleteProfileAvatarFile, savePickedAvatar } from '../lib/avatarFiles';
import { AVATAR_PRESETS } from '../lib/avatarPresets';
import { createSwitchProfileStyles } from './switchProfileScreenStyles';

export default function SwitchProfileScreen({ navigation }) {
  const { tx, language } = useLocale();
  const { colors, ready: themeReady } = useTheme();
  const styles = useMemo(() => createSwitchProfileStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    profiles,
    activeProfileId,
    selectProfile,
    setProfileAvatar,
    hydrated,
    onboardingComplete,
  } = useTaskRewards();

  const [avatarModalProfileId, setAvatarModalProfileId] = useState(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!onboardingComplete) {
      navigation.replace('OnboardingLanguage');
    }
  }, [hydrated, onboardingComplete, navigation]);

  useLayoutEffect(() => {
    navigation?.setOptions({ title: tx('profiles.screenTitle') });
  }, [navigation, tx, language]);

  const avatarModalProfile = useMemo(
    () => profiles.find((p) => p.id === avatarModalProfileId) || null,
    [profiles, avatarModalProfileId]
  );

  const closeAvatarModal = () => setAvatarModalProfileId(null);

  const persistAvatarImage = async (pid, uri) => {
    try {
      const dest = await savePickedAvatar(pid, uri);
      setProfileAvatar(pid, { avatarUri: dest, avatarPreset: null });
      closeAvatarModal();
    } catch {
      Alert.alert('', tx('profiles.photoSaveError'));
    }
  };

  const takePhoto = async () => {
    if (!avatarModalProfileId) return;
    const pid = avatarModalProfileId;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(tx('profiles.permissionTitle'), tx('profiles.permissionCamera'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await persistAvatarImage(pid, result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    if (!avatarModalProfileId) return;
    const pid = avatarModalProfileId;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(tx('profiles.permissionTitle'), tx('profiles.permissionPhotos'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await persistAvatarImage(pid, result.assets[0].uri);
  };

  const choosePreset = async (presetId) => {
    if (!avatarModalProfileId) return;
    const pid = avatarModalProfileId;
    await deleteProfileAvatarFile(pid);
    setProfileAvatar(pid, { avatarPreset: presetId, avatarUri: null });
    closeAvatarModal();
  };

  const selectAndGoHome = (profileId) => {
    selectProfile(profileId);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('MainTabs');
    }
  };

  if (!hydrated || !themeReady) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tx('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headlineBlock}>
          <Text style={styles.headline}>{tx('profiles.introTitle')}</Text>
        </View>

        <View style={styles.bubbleRowWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bubbleRowScroll}
            contentContainerStyle={styles.bubbleRowContent}
          >
            {profiles.map((p) => {
              const active = p.id === activeProfileId;
              return (
                <View key={p.id} style={styles.bubbleItem}>
                  <View style={styles.bubbleAvatarOuter}>
                    <Pressable
                      onPress={() => selectAndGoHome(p.id)}
                      accessibilityRole="button"
                      accessibilityLabel={tx('profiles.selectProfileA11y', { name: p.name })}
                      style={({ pressed }) => pressed && styles.bubbleCirclePressed}
                    >
                      <View
                        style={[styles.bubbleCircle, active && styles.bubbleCircleActive]}
                      >
                        <ProfileAvatar
                          profile={p}
                          size={80}
                          colors={colors}
                          plain
                        />
                      </View>
                    </Pressable>
                    <Pressable
                      style={styles.bubbleCamBadge}
                      onPress={() => setAvatarModalProfileId(p.id)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={tx('profiles.changeAvatarA11y', { name: p.name })}
                    >
                      <Ionicons name="camera" size={15} color="#fff" />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => selectAndGoHome(p.id)}
                    accessibilityRole="button"
                    accessibilityLabel={tx('profiles.selectProfileA11y', { name: p.name })}
                    style={({ pressed }) => pressed && styles.bubbleNamePressed}
                  >
                    <Text style={styles.bubbleName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    {active ? (
                      <Text style={styles.bubbleSub}>{tx('profiles.playingNow')}</Text>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(avatarModalProfileId)}
        animationType="slide"
        transparent
        onRequestClose={closeAvatarModal}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
          <Pressable style={styles.modalBackdrop} onPress={closeAvatarModal} />
          <View
            style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          >
            <Text style={styles.modalTitle}>{tx('profiles.chooseAvatarTitle')}</Text>
            {avatarModalProfile ? (
              <Text style={styles.modalSub}>
                {tx('profiles.chooseAvatarSub', { name: avatarModalProfile.name })}
              </Text>
            ) : null}

            <View style={styles.presetGrid}>
              {AVATAR_PRESETS.map((preset) => {
                const selected =
                  avatarModalProfile &&
                  !avatarModalProfile.avatarUri &&
                  avatarModalProfile.avatarPreset === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => choosePreset(preset.id)}
                    style={[styles.presetCell, selected && styles.presetCellSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={tx('profiles.presetA11y', { emoji: preset.emoji })}
                  >
                    <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.photoButton} onPress={takePhoto}>
              <Text style={styles.photoButtonText}>{tx('profiles.takePhoto')}</Text>
            </Pressable>

            <Pressable style={styles.libraryButton} onPress={pickFromLibrary}>
              <Text style={styles.libraryButtonText}>{tx('profiles.pickPhoto')}</Text>
            </Pressable>

            <Pressable style={styles.modalCancel} onPress={closeAvatarModal}>
              <Text style={styles.modalCancelText}>{tx('profiles.done')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
