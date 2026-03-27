import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from '../components/GlassButton';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { clearIntroSeen } from '../lib/introStorage';
import { digitsOnlyPin, MIN_PIN_LENGTH } from '../lib/pinHash';
import { LANGUAGE_OPTIONS } from '../lib/languageOptions';
import { navigationRef } from '../navigation/navigationRef';
import { useTaskRewards } from '../context/TaskRewardsContext';
import { createParentStyles } from './parentScreenStyles';

function SectionCard({ title, description, children, style, styles }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {description ? <Text style={styles.cardDesc}>{description}</Text> : null}
      {children}
    </View>
  );
}

export default function ParentScreen() {
  const { tx, language, setLanguage, ready: localeReady } = useLocale();
  const { colors, isDark, setDarkMode, ready: themeReady } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createParentStyles(colors), [colors]);
  const {
    profiles,
    addProfile,
    removeProfile,
    tasks,
    rewards,
    hydrated,
    hasParentPin,
    attemptParentUnlock,
    syncParentPinFromStorage,
    changeParentPin,
    setParentPin,
    parentAddTask,
    parentAddReward,
    parentRemoveTask,
    parentEditTask,
    parentRemoveReward,
    parentResetStarProgress,
    parentAreaUnlocked,
    unlockParentArea,
    lockParentArea,
    parentEmail,
    emailNotifyTaskComplete,
    emailNotifyRewardRedeem,
    setParentSettings,
  } = useTaskRewards();
  const [createPin, setCreatePin] = useState('');
  const [createPinConfirm, setCreatePinConfirm] = useState('');
  const [enterPin, setEnterPin] = useState('');
  const [lockErr, setLockErr] = useState(null);
  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotNewPinConfirm, setForgotNewPinConfirm] = useState('');
  const [changeCurrentPin, setChangeCurrentPin] = useState('');
  const [changeNewPin, setChangeNewPin] = useState('');
  const [changeNewPinConfirm, setChangeNewPinConfirm] = useState('');
  const [pinFeedback, setPinFeedback] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStars, setNewTaskStars] = useState('1');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState('daily');
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardCost, setNewRewardCost] = useState('5');
  const [newChildName, setNewChildName] = useState('');
  const [parentSection, setParentSection] = useState('tasks');
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStars, setEditStars] = useState('1');
  const [editTaskRecurrence, setEditTaskRecurrence] = useState('daily');
  const [langModalVisible, setLangModalVisible] = useState(false);

  const formatRequestedAgo = useCallback(
    (requestedAtMs) => {
      const deltaMs = Date.now() - Number(requestedAtMs || 0);
      const mins = Math.max(0, Math.floor(deltaMs / 60000));
      if (mins <= 0) return tx('parent.requestedJustNow');
      if (mins === 1) return tx('parent.requestedMinutesAgo_one', { count: mins });
      return tx('parent.requestedMinutesAgo_other', { count: mins });
    },
    [tx]
  );

  const resetLockForm = useCallback(() => {
    setCreatePin('');
    setCreatePinConfirm('');
    setEnterPin('');
    setForgotPinMode(false);
    setForgotNewPin('');
    setForgotNewPinConfirm('');
    setLockErr(null);
  }, []);

  useEffect(() => {
    if (hasParentPin) {
      setCreatePin('');
      setCreatePinConfirm('');
    } else {
      setEnterPin('');
    }
  }, [hasParentPin]);

  useFocusEffect(
    useCallback(() => {
      void syncParentPinFromStorage();
      return () => {
        lockParentArea();
        setParentSection('tasks');
        resetLockForm();
        setEditing(null);
        setEditTitle('');
        setEditStars('1');
        setEditTaskRecurrence('daily');
      };
    }, [lockParentArea, resetLockForm, syncParentPinFromStorage])
  );

  const unlock = async () => {
    setLockErr(null);
    await syncParentPinFromStorage();
    const res = await attemptParentUnlock({
      createPin,
      createPinConfirm,
      enterPin,
    });
    if (!res.ok) {
      if (res.error === 'short') {
        setLockErr({ key: 'lock.errorShort', params: { min: MIN_PIN_LENGTH } });
      } else if (res.error === 'mismatch') {
        setLockErr({ key: 'lock.errorMismatch' });
      } else if (res.error === 'wrong') {
        setLockErr({ key: 'lock.errorWrongPassword' });
      }
      return;
    }
    resetLockForm();
    unlockParentArea();
  };

  const submitForgotPinReset = () => {
    setLockErr(null);
    if (forgotNewPin.length < MIN_PIN_LENGTH) {
      setLockErr({ key: 'lock.errorShort', params: { min: MIN_PIN_LENGTH } });
      return;
    }
    if (forgotNewPin !== forgotNewPinConfirm) {
      setLockErr({ key: 'lock.errorMismatch' });
      return;
    }
    Alert.alert(tx('lock.resetConfirmTitle'), tx('lock.resetConfirmMessage'), [
      { text: tx('lock.cancel'), style: 'cancel' },
      {
        text: tx('lock.resetConfirmAction'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const res = await setParentPin(forgotNewPin);
            if (!res?.ok) {
              setLockErr({ key: 'lock.errorShort', params: { min: MIN_PIN_LENGTH } });
              return;
            }
            setForgotPinMode(false);
            setForgotNewPin('');
            setForgotNewPinConfirm('');
            setEnterPin('');
            Alert.alert(tx('lock.resetSuccessTitle'));
          })();
        },
      },
    ]);
  };

  const requestForgotPinReset = async () => {
    setLockErr(null);
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    if (!hasHardware || !enrolled) {
      setLockErr({ key: 'lock.resetNeedsDeviceAuth' });
      return;
    }
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: tx('lock.resetAuthPrompt'),
      fallbackLabel: tx('lock.resetAuthFallback'),
      disableDeviceFallback: false,
      cancelLabel: tx('lock.cancel'),
    });
    if (!auth.success) {
      setLockErr({ key: 'lock.resetAuthFailed' });
      return;
    }
    setForgotPinMode(true);
  };

  const submitTask = () => {
    const n = parseInt(newTaskStars, 10);
    const res = parentAddTask(newTaskTitle, Number.isFinite(n) ? n : 1, newTaskRecurrence);
    if (res?.ok) {
      setNewTaskTitle('');
      setNewTaskStars('1');
      setNewTaskRecurrence('daily');
    } else if (res?.error === 'duplicate') {
      Alert.alert('', tx('parent.activeTaskDuplicate'));
    }
  };

  const submitReward = () => {
    const n = parseInt(newRewardCost, 10);
    parentAddReward(newRewardTitle, Number.isFinite(n) ? n : 5);
    setNewRewardTitle('');
    setNewRewardCost('5');
  };

  const submitChangePin = async () => {
    setPinFeedback(null);
    if (changeCurrentPin.length < MIN_PIN_LENGTH) {
      setPinFeedback({
        tone: 'bad',
        key: 'lock.errorShort',
        params: { min: MIN_PIN_LENGTH },
      });
      return;
    }
    if (changeNewPin.length < MIN_PIN_LENGTH) {
      setPinFeedback({
        tone: 'bad',
        key: 'parent.pinTooShort',
        params: { min: MIN_PIN_LENGTH },
      });
      return;
    }
    if (changeNewPin !== changeNewPinConfirm) {
      setPinFeedback({ tone: 'bad', key: 'parent.pinMismatch' });
      return;
    }
    const res = await changeParentPin(changeCurrentPin, changeNewPin);
    if (!res.ok) {
      if (res.error === 'wrong') {
        setPinFeedback({ tone: 'bad', key: 'parent.currentWrong' });
      } else {
        setPinFeedback({ tone: 'bad', key: 'parent.updateFailed' });
      }
      return;
    }
    setChangeCurrentPin('');
    setChangeNewPin('');
    setChangeNewPinConfirm('');
    setPinFeedback({ tone: 'ok', key: 'parent.passwordUpdated' });
  };

  const confirmResetStars = () => {
    Alert.alert(
      tx('parent.resetStarsAlertTitle'),
      tx('parent.resetStarsAlertMessage'),
      [
        { text: tx('parent.resetStarsAlertCancel'), style: 'cancel' },
        {
          text: tx('parent.resetStarsAlertConfirm'),
          style: 'destructive',
          onPress: () => parentResetStarProgress(),
        },
      ]
    );
  };

  const submitAddChild = () => {
    const name = newChildName.trim();
    if (!name) return;
    addProfile(name);
    setNewChildName('');
  };

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditTitle('');
    setEditStars('1');
    setEditTaskRecurrence('daily');
  }, []);

  const startEditTask = useCallback((task) => {
    setEditing({ kind: 'task', id: task.id });
    setEditTitle(task.title);
    setEditStars(String(task.starsReward));
    setEditTaskRecurrence(task?.recurrence ?? 'daily');
  }, []);

  const recurrenceTxKeyFor = useCallback(
    (recurrence) => {
      const r = recurrence ?? 'daily';
      if (r === 'none') return 'parent.taskRecurrenceNone';
      if (r === 'weekdays') return 'parent.taskRecurrenceWeekdays';
      if (r === 'weekend') return 'parent.taskRecurrenceWeekend';
      return 'parent.taskRecurrenceDaily';
    },
    [tx]
  );

  const saveTaskEdit = useCallback(() => {
    if (!editing) return;
    const n = parseInt(editStars, 10);
    const stars = Number.isFinite(n) ? n : 1;
    if (editing.kind === 'task') {
      const res = parentEditTask(editing.id, editTitle, stars, editTaskRecurrence);
      if (res?.ok) {
        cancelEdit();
      } else if (res?.error === 'duplicate') {
        Alert.alert('', tx('parent.activeTaskDuplicate'));
      }
      return;
    }
  }, [
    editing,
    editTitle,
    editStars,
    editTaskRecurrence,
    parentEditTask,
    cancelEdit,
    tx,
  ]);

  const showIntroAgain = useCallback(async () => {
    await clearIntroSeen();
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Intro' }],
      });
    }
  }, []);

  const confirmRemoveChild = (profile) => {
    if (profiles.length <= 1) {
      Alert.alert('', tx('parent.cannotRemoveLastChild'));
      return;
    }
    Alert.alert(
      tx('parent.removeChildConfirmTitle', { name: profile.name }),
      tx('parent.removeChildConfirmMessage'),
      [
        { text: tx('parent.resetStarsAlertCancel'), style: 'cancel' },
        {
          text: tx('parent.remove'),
          style: 'destructive',
          onPress: () => removeProfile(profile.id),
        },
      ]
    );
  };

  if (!hydrated || !localeReady || !themeReady) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tx('common.loading')}</Text>
      </View>
    );
  }

  if (!parentAreaUnlocked) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.parentLockRoot}>
          <View style={styles.lockCard}>
            <Text style={styles.lockTitle}>
              {hasParentPin ? tx('lock.titleEnter') : tx('lock.titleCreate')}
            </Text>
            <Text style={styles.lockSub}>
              {hasParentPin
                ? tx('lock.subEnter')
                : tx('lock.subCreate', { min: MIN_PIN_LENGTH })}
            </Text>
            {!hasParentPin ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={tx('lock.placeholderNew')}
                  placeholderTextColor={colors.textSecondary}
                  value={createPin}
                  onChangeText={(v) => setCreatePin(digitsOnlyPin(v))}
                  keyboardType="number-pad"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder={tx('lock.placeholderConfirm')}
                  placeholderTextColor={colors.textSecondary}
                  value={createPinConfirm}
                  onChangeText={(v) => setCreatePinConfirm(digitsOnlyPin(v))}
                  keyboardType="number-pad"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : (
              <>
                {forgotPinMode ? (
                  <>
                    <Text style={styles.lockSub}>{tx('lock.resetPinSub')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={tx('lock.placeholderNew')}
                      placeholderTextColor={colors.textSecondary}
                      value={forgotNewPin}
                      onChangeText={(v) => setForgotNewPin(digitsOnlyPin(v))}
                      keyboardType="number-pad"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={tx('lock.placeholderConfirm')}
                      placeholderTextColor={colors.textSecondary}
                      value={forgotNewPinConfirm}
                      onChangeText={(v) => setForgotNewPinConfirm(digitsOnlyPin(v))}
                      keyboardType="number-pad"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder={tx('lock.placeholderPassword')}
                      placeholderTextColor={colors.textSecondary}
                      value={enterPin}
                      onChangeText={(v) => setEnterPin(digitsOnlyPin(v))}
                      keyboardType="number-pad"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={unlock}
                    />
                    <Pressable onPress={() => void requestForgotPinReset()} hitSlop={8}>
                      <Text style={styles.lockForgotLink}>{tx('lock.forgotPin')}</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
            {lockErr ? (
              <Text style={styles.lockError}>{tx(lockErr.key, lockErr.params)}</Text>
            ) : null}
            <View style={styles.lockActions}>
              {forgotPinMode ? (
                <>
                  <GlassButton
                    variant="lock"
                    onPress={submitForgotPinReset}
                    accessibilityLabel={tx('lock.resetPinButton')}
                  >
                    {tx('lock.resetPinButton')}
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    style={styles.lockCancelForgotButton}
                    onPress={() => {
                      setForgotPinMode(false);
                      setForgotNewPin('');
                      setForgotNewPinConfirm('');
                      setLockErr(null);
                    }}
                    accessibilityLabel={tx('lock.cancelResetPin')}
                  >
                    {tx('lock.cancelResetPin')}
                  </GlassButton>
                </>
              ) : (
                <GlassButton
                  variant="lock"
                  onPress={unlock}
                  accessibilityLabel={tx('lock.continue')}
                >
                  {tx('lock.continue')}
                </GlassButton>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const lockParent = () => {
    lockParentArea();
    setParentSection('tasks');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tx('parent.areaTitle')}</Text>
          <Pressable onPress={lockParent} hitSlop={12}>
            <Text style={styles.headerAction}>{tx('parent.lockAgain')}</Text>
          </Pressable>
        </View>

        <View style={styles.subTabBar}>
          <Pressable
            onPress={() => setParentSection('tasks')}
            style={[styles.subTab, parentSection === 'tasks' && styles.subTabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: parentSection === 'tasks' }}
          >
            <Text
              style={[
                styles.subTabText,
                parentSection === 'tasks' && styles.subTabTextActive,
              ]}
            >
              {tx('parent.tabTasks')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setParentSection('settings')}
            style={[styles.subTab, parentSection === 'settings' && styles.subTabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: parentSection === 'settings' }}
          >
            <Text
              style={[
                styles.subTabText,
                parentSection === 'settings' && styles.subTabTextActive,
              ]}
            >
              {tx('parent.tabSettings')}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {parentSection === 'settings' ? (
            <>
              <SectionCard title={tx('parent.language')} styles={styles}>
                <Pressable
                  style={styles.langPickerTrigger}
                  onPress={() => setLangModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel={tx('parent.languagePickerA11y')}
                >
                  <Text style={styles.langPickerFlag} importantForAccessibility="no">
                    {LANGUAGE_OPTIONS.find((o) => o.code === language)?.flag ?? '🌐'}
                  </Text>
                  <View style={styles.langPickerTextCol}>
                    <Text style={styles.langPickerLang}>
                      {tx(
                        LANGUAGE_OPTIONS.find((o) => o.code === language)?.labelKey ??
                          'parent.languageEnglish'
                      )}
                    </Text>
                    <Text style={styles.langPickerCountry}>
                      {tx(`parent.langRegions.${language}`)}
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

                <View style={styles.inCardDivider} />

                <View style={styles.switchBlock}>
                  <View style={styles.switchTextCol}>
                    <Text style={styles.switchLabel}>{tx('parent.darkMode')}</Text>
                    <Text style={styles.switchSub}>{tx('parent.darkModeSub')}</Text>
                  </View>
                  <Switch
                    value={isDark}
                    onValueChange={setDarkMode}
                    trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={colors.surfaceMuted}
                  />
                </View>
              </SectionCard>

              <SectionCard
                title={tx('parent.showIntroTitle')}
                description={tx('parent.showIntroSub')}
                styles={styles}
              >
                <GlassButton variant="secondary" onPress={() => void showIntroAgain()}>
                  {tx('parent.showIntroButton')}
                </GlassButton>
              </SectionCard>

              <SectionCard
                title={tx('parent.childrenSection')}
                description={tx('parent.childrenSectionSub')}
                styles={styles}
              >
                {profiles.map((p, i) => (
                  <View
                    key={p.id}
                    style={[styles.listRow, i === 0 && styles.listRowFirst]}
                  >
                    <Text style={styles.listRowText}>{p.name}</Text>
                    {profiles.length > 1 ? (
                      <Pressable onPress={() => confirmRemoveChild(p)} hitSlop={8}>
                        <Text style={styles.removeText}>{tx('parent.remove')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                {profiles.length === 1 ? (
                  <Text style={styles.mutedNote}>{tx('parent.cannotRemoveLastChild')}</Text>
                ) : null}

                <View style={{ height: 12 }} />
                <TextInput
                  style={styles.input}
                  placeholder={tx('parent.childNamePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={newChildName}
                  onChangeText={setNewChildName}
                  onSubmitEditing={submitAddChild}
                />
                <GlassButton variant="primary" onPress={submitAddChild}>
                  {tx('parent.addChildButton')}
                </GlassButton>
              </SectionCard>

              <SectionCard
                title={tx('parent.emailNotificationsTitle')}
                description={tx('parent.emailNotificationsSub')}
                styles={styles}
              >
                <TextInput
                  style={styles.input}
                  placeholder={tx('parent.emailNotificationsPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={parentEmail}
                  onChangeText={(v) => setParentSettings({ parentEmail: v })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
                <View style={styles.switchBlock}>
                  <View style={styles.switchTextCol}>
                    <Text style={styles.switchLabel}>{tx('parent.emailNotifyTask')}</Text>
                    <Text style={styles.switchSub}>{tx('parent.emailNotifyTaskSub')}</Text>
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
                  <View style={styles.switchTextCol}>
                    <Text style={styles.switchLabel}>{tx('parent.emailNotifyReward')}</Text>
                    <Text style={styles.switchSub}>{tx('parent.emailNotifyRewardSub')}</Text>
                  </View>
                  <Switch
                    value={emailNotifyRewardRedeem}
                    onValueChange={(v) => setParentSettings({ emailNotifyRewardRedeem: v })}
                    trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={colors.surfaceMuted}
                  />
                </View>
              </SectionCard>

              <SectionCard title={tx('parent.changePassword')} styles={styles}>
                <TextInput
                  style={styles.input}
                  placeholder={tx('parent.currentPassword')}
                  placeholderTextColor={colors.textSecondary}
                  value={changeCurrentPin}
                  onChangeText={(v) => setChangeCurrentPin(digitsOnlyPin(v))}
                  keyboardType="number-pad"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder={tx('parent.newPassword')}
                  placeholderTextColor={colors.textSecondary}
                  value={changeNewPin}
                  onChangeText={(v) => setChangeNewPin(digitsOnlyPin(v))}
                  keyboardType="number-pad"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder={tx('parent.confirmNewPassword')}
                  placeholderTextColor={colors.textSecondary}
                  value={changeNewPinConfirm}
                  onChangeText={(v) => setChangeNewPinConfirm(digitsOnlyPin(v))}
                  keyboardType="number-pad"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {pinFeedback ? (
                  <Text
                    style={[
                      styles.changePinFeedback,
                      pinFeedback.tone === 'ok' ? styles.changePinOk : styles.changePinBad,
                    ]}
                  >
                    {tx(pinFeedback.key, pinFeedback.params)}
                  </Text>
                ) : null}
                <View style={styles.buttonStack}>
                  <GlassButton variant="secondary" onPress={submitChangePin}>
                    {tx('parent.updatePasswordButton')}
                  </GlassButton>
                </View>
              </SectionCard>
            </>
          ) : (
            <>
              <SectionCard title={tx('parent.addTask')} styles={styles}>
          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.inputFlex, styles.inputCompact]}
              placeholder={tx('parent.taskNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <TextInput
              style={[styles.input, styles.inputStars, styles.inputCompact]}
              placeholder={tx('parent.starsWhenDonePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={newTaskStars}
              onChangeText={setNewTaskStars}
            />
          </View>
          <View style={styles.recurrenceRow}>
            {[
              { key: 'daily', label: tx('parent.taskRecurrenceDaily') },
              { key: 'weekdays', label: tx('parent.taskRecurrenceWeekdays') },
              { key: 'weekend', label: tx('parent.taskRecurrenceWeekend') },
              { key: 'none', label: tx('parent.taskRecurrenceNone') },
            ].map((opt) => {
              const active = newTaskRecurrence === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setNewTaskRecurrence(opt.key)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                >
                  <View
                    style={[
                      styles.recurrenceChip,
                      active ? styles.recurrenceChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.recurrenceChipText,
                        active ? styles.recurrenceChipTextActive : null,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.buttonStack}>
            <GlassButton variant="primary" onPress={submitTask}>
              {tx('parent.addTaskButton')}
            </GlassButton>
          </View>
        </SectionCard>

        <SectionCard title={tx('parent.tasksList')} styles={styles}>
          {tasks.length === 0 ? (
            <Text style={styles.emptyHint}>{tx('tasks.emptyNoTasks')}</Text>
          ) : (
            tasks.map((task, i) => (
              <View
                key={task.id}
                style={[styles.editRowBlock, i === 0 && styles.editRowBlockFirst]}
              >
                {editing?.kind === 'task' && editing.id === task.id ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder={tx('parent.taskNamePlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={editTitle}
                      onChangeText={setEditTitle}
                    />
                    <View style={styles.editFormStarsRow}>
                      <TextInput
                        style={[styles.input, styles.editFormStarsInput]}
                        placeholder={tx('parent.starsWhenDonePlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        value={editStars}
                        onChangeText={setEditStars}
                      />
                    </View>
                    <View style={[styles.recurrenceRow, { marginBottom: 0, marginTop: 4 }]}>
                      {[
                        { key: 'daily', label: tx('parent.taskRecurrenceDaily') },
                        { key: 'weekdays', label: tx('parent.taskRecurrenceWeekdays') },
                        { key: 'weekend', label: tx('parent.taskRecurrenceWeekend') },
                        { key: 'none', label: tx('parent.taskRecurrenceNone') },
                      ].map((opt) => {
                        const active = editTaskRecurrence === opt.key;
                        return (
                          <Pressable
                            key={opt.key}
                            onPress={() => setEditTaskRecurrence(opt.key)}
                            accessibilityRole="button"
                            accessibilityLabel={opt.label}
                          >
                            <View
                              style={[
                                styles.recurrenceChip,
                                active ? styles.recurrenceChipActive : null,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.recurrenceChipText,
                                  active ? styles.recurrenceChipTextActive : null,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.editFormActions}>
                      <GlassButton
                        variant="secondary"
                        style={styles.editFormActionFlex}
                        onPress={cancelEdit}
                      >
                        {tx('lock.cancel')}
                      </GlassButton>
                      <GlassButton
                        variant="primary"
                        style={styles.editFormActionFlex}
                        onPress={saveTaskEdit}
                      >
                        {tx('parent.saveEdits')}
                      </GlassButton>
                    </View>
                  </>
                ) : (
                  <View style={styles.taskItemStack}>
                    <Text style={styles.taskItemTitle}>{task.title}</Text>
                    <View style={styles.taskItemMetaRow}>
                      <View style={styles.taskStarBadge}>
                        <Text style={styles.taskStarBadgeText}>
                          +{task.starsReward} ★
                        </Text>
                      </View>
                      <View style={styles.taskRecurrenceBadge}>
                        <Text style={styles.taskRecurrenceBadgeText}>
                          {tx(recurrenceTxKeyFor(task?.recurrence))}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.taskActionRow}>
                      <GlassButton
                        variant="chipPrimary"
                        fullWidth={false}
                        onPress={() => startEditTask(task)}
                        accessibilityLabel={tx('parent.editTask')}
                      >
                        {tx('parent.editTask')}
                      </GlassButton>
                      <GlassButton
                        variant="chipDanger"
                        fullWidth={false}
                        onPress={() => parentRemoveTask(task.id)}
                        accessibilityLabel={tx('parent.remove')}
                      >
                        {tx('parent.remove')}
                      </GlassButton>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title={tx('parent.addReward')} styles={styles}>
          <TextInput
            style={styles.input}
            placeholder={tx('parent.rewardNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={newRewardTitle}
            onChangeText={setNewRewardTitle}
          />
          <TextInput
            style={styles.input}
            placeholder={tx('parent.starPricePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            value={newRewardCost}
            onChangeText={setNewRewardCost}
          />
          <GlassButton variant="primary" onPress={submitReward}>
            {tx('parent.addRewardButton')}
          </GlassButton>

          <Text style={[styles.listSectionLabel, { marginTop: 20 }]}>
            {tx('parent.rewardsList')}
          </Text>
          {rewards.length === 0 ? (
            <Text style={styles.emptyHint}>{tx('shop.empty')}</Text>
          ) : (
            rewards.map((reward, i) => (
              <View
                key={reward.id}
                style={[styles.editRowBlock, i === 0 && styles.editRowBlockFirst]}
              >
                <View style={styles.rewardItemStack}>
                  <Text style={styles.rewardItemTitle}>{reward.title}</Text>
                  <View style={styles.rewardItemFooter}>
                    <View style={styles.rewardCostBadge}>
                      <Text style={styles.rewardCostText}>{reward.starCost} ★</Text>
                    </View>
                    <GlassButton
                      variant="chipDanger"
                      fullWidth={false}
                      onPress={() => parentRemoveReward(reward.id)}
                      accessibilityLabel={tx('parent.remove')}
                    >
                      {tx('parent.remove')}
                    </GlassButton>
                  </View>
                </View>
              </View>
            ))
          )}
        </SectionCard>

              <SectionCard
                title={tx('parent.resetStarProgress')}
                description={tx('parent.resetStarProgressSub')}
                styles={styles}
                style={styles.warnCard}
              >
                <GlassButton
                  variant="danger"
                  style={styles.dangerGlassSpacing}
                  onPress={confirmResetStars}
                >
                  {tx('parent.resetStarProgressButton')}
                </GlassButton>
              </SectionCard>
            </>
          )}
        </ScrollView>

        <Modal
          visible={langModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLangModalVisible(false)}
        >
          <View style={styles.langModalRoot}>
            <Pressable
              style={styles.langModalBackdrop}
              onPress={() => setLangModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={tx('parent.languageModalDismissA11y')}
            />
            <View
              style={[
                styles.langModalSheet,
                { paddingBottom: Math.max(insets.bottom, 14) },
              ]}
            >
              <View style={styles.langModalHeader}>
                <Text style={styles.langModalTitle}>{tx('parent.language')}</Text>
                <Pressable
                  onPress={() => setLangModalVisible(false)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={tx('parent.languageModalCloseA11y')}
                >
                  <Ionicons name="close" size={28} color={colors.textSecondary} />
                </Pressable>
              </View>
              <ScrollView
                style={styles.langModalList}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {LANGUAGE_OPTIONS.map(({ code, labelKey, flag }) => {
                  const selected = language === code;
                  return (
                    <Pressable
                      key={code}
                      style={[styles.langModalRow, selected && styles.langModalRowSelected]}
                      onPress={() => {
                        void setLanguage(code);
                        setLangModalVisible(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${tx(labelKey)}, ${tx(`parent.langRegions.${code}`)}`}
                    >
                      <Text style={styles.langModalFlag} importantForAccessibility="no">
                        {flag}
                      </Text>
                      <View style={styles.langModalLabels}>
                        <Text style={styles.langModalLangName}>{tx(labelKey)}</Text>
                        <Text style={styles.langModalCountry}>{tx(`parent.langRegions.${code}`)}</Text>
                      </View>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                      ) : (
                        <View style={styles.langModalCheckPlaceholder} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
