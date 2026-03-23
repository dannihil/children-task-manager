import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from './GlassButton';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';

const PARTICLE_COUNT = 14;

const PARTICLE_LAYOUT = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  leftPct: ((i * 53) % 82) + 9,
  drift: ((i % 6) - 2.5) * 38,
  delay: i * 55,
  duration: 1700 + (i % 4) * 120,
  size: 7 + (i % 4) * 3,
  colorKey: i % 4,
}));

export function RewardCelebrationModal({ visible, onClose, rewardTitle, starCost }) {
  const { tx } = useLocale();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  const particleColors = useMemo(
    () => [colors.starGold, colors.primary, colors.success, colors.starGoldDark],
    [colors]
  );

  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0))
  ).current;
  const starPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0);
      cardOpacity.setValue(0);
      backdropOp.setValue(0);
      particleAnims.forEach((a) => a.setValue(0));
      starPulse.setValue(1);
      return;
    }

    backdropOp.setValue(0);
    Animated.timing(backdropOp, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    cardOpacity.setValue(1);
    cardScale.setValue(0);
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 7,
      tension: 78,
      useNativeDriver: true,
    }).start();

    particleAnims.forEach((anim, i) => {
      const cfg = PARTICLE_LAYOUT[i];
      anim.setValue(0);
      Animated.sequence([
        Animated.delay(cfg.delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: cfg.duration,
          useNativeDriver: true,
        }),
      ]).start();
    });

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(starPulse, {
          toValue: 1.15,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(starPulse, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible]);

  const spentLine =
    starCost === 1
      ? tx('shop.celebrationSpent_one')
      : tx('shop.celebrationSpent_other', { n: starCost });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityViewIsModal
      accessibilityLabel={tx('shop.celebrationA11y', { title: rewardTitle })}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, { opacity: backdropOp }]} />

        <View style={styles.confettiLayer} pointerEvents="none">
          {PARTICLE_LAYOUT.map((cfg, i) => {
            const anim = particleAnims[i];
            const color = particleColors[cfg.colorKey];
            const left = (width * cfg.leftPct) / 100;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    left,
                    top: height * 0.12,
                    width: cfg.size,
                    height: cfg.size,
                    borderRadius: cfg.size / 2,
                    backgroundColor: color,
                    opacity: anim.interpolate({
                      inputRange: [0, 0.08, 0.88, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, height * 0.62],
                        }),
                      },
                      {
                        translateX: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, cfg.drift],
                        }),
                      },
                      {
                        rotate: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', `${360 + (i % 3) * 120}deg`],
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.centerWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: starPulse }] }}>
              <View style={styles.iconRing}>
                <Ionicons name="gift" size={44} color={colors.primaryDark} />
              </View>
            </Animated.View>
            <Text style={styles.title}>{tx('shop.celebrationTitle')}</Text>
            <Text style={styles.youGot}>
              {tx('shop.celebrationYouGot', { title: rewardTitle })}
            </Text>
            <View style={styles.starsRow}>
              <Ionicons name="star" size={20} color={colors.starGold} />
              <Text style={styles.spent}>{spentLine}</Text>
            </View>
            <Text style={styles.showParent}>{tx('shop.celebrationShowParent')}</Text>
            <GlassButton variant="primary" onPress={onClose} accessibilityRole="button">
              {tx('shop.celebrationButton')}
            </GlassButton>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(c, insets) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.overlay,
    },
    confettiLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
    },
    particle: {
      position: 'absolute',
    },
    centerWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: insets.top + 12,
      paddingBottom: insets.bottom + 12,
      zIndex: 1,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.surface,
      borderRadius: 28,
      paddingVertical: 28,
      paddingHorizontal: 22,
      borderWidth: 3,
      borderColor: c.primary,
      alignItems: 'center',
      shadowColor: c.cardShadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 10,
    },
    iconRing: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.borderStrong,
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: c.primaryDark,
      textAlign: 'center',
      marginBottom: 10,
    },
    youGot: {
      fontSize: 19,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
      lineHeight: 26,
      marginBottom: 14,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    spent: {
      fontSize: 17,
      fontWeight: '700',
      color: c.costText,
    },
    showParent: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 23,
      marginBottom: 22,
      paddingHorizontal: 4,
    },
  });
}
