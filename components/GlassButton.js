import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const RADIUS = { main: 24, chip: 16 };

const SIZES = {
  default: { minHeight: 52, padV: 15, padH: 22, fontSize: 17, weight: '800' },
  compact: { minHeight: 48, padV: 12, padH: 18, fontSize: 15, weight: '700' },
  intro: { minHeight: 56, padV: 18, padH: 26, fontSize: 18, weight: '800' },
};

function glassKind(variant) {
  if (variant === 'chipDanger') return 'chipDanger';
  if (variant === 'chipPrimary') return 'chipPrimary';
  if (variant === 'danger') return 'danger';
  if (variant === 'secondary') return 'secondary';
  return 'primary';
}

function shadowStyle(soft) {
  return soft
    ? {
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
      }
    : {
        shadowOpacity: 0.18,
        shadowRadius: 22,
        elevation: 8,
      };
}

/** Light tint wash on top of blur — keep low alpha so blur stays visible. */
function overlayFor(kind, isDark, disabled) {
  if (disabled && (kind === 'primary' || kind === 'chipPrimary')) {
    return isDark ? 'rgba(70,88,98,0.55)' : 'rgba(120,160,152,0.72)';
  }
  switch (kind) {
    case 'chipDanger':
      return isDark ? 'rgba(255,138,149,0.12)' : 'rgba(216,67,67,0.10)';
    case 'chipPrimary':
      return isDark ? 'rgba(77,205,232,0.10)' : 'rgba(8,90,75,0.2)';
    case 'danger':
      return isDark ? 'rgba(255,138,149,0.14)' : 'rgba(216,67,67,0.12)';
    case 'secondary':
      return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(8,90,75,0.12)';
    default:
      return isDark ? 'rgba(82,223,198,0.24)' : 'rgba(34,190,163,0.62)';
  }
}

/** Sheen band at top — reads as curved glass highlight */
function sheenFor(kind, isDark) {
  if (kind === 'danger' || kind === 'chipDanger') {
    return isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.22)';
  }
  if (kind === 'secondary' || kind === 'chipPrimary') {
    return isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.22)';
  }
  return isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.24)';
}

function borderFor(kind, isDark) {
  switch (kind) {
    case 'chipDanger':
      return isDark ? 'rgba(255,200,205,0.35)' : 'rgba(216,67,67,0.42)';
    case 'chipPrimary':
      return isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.72)';
    case 'danger':
      return isDark ? 'rgba(255,180,190,0.45)' : 'rgba(216,67,67,0.48)';
    case 'secondary':
      return isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';
    default:
      return isDark ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.82)';
  }
}

function textColorFor(kind, colors, disabled, isDark) {
  if (disabled && (kind === 'primary' || kind === 'chipPrimary')) {
    return colors.buyLabelDisabled;
  }
  switch (kind) {
    case 'chipDanger':
    case 'danger':
      return colors.error;
    case 'chipPrimary':
    case 'secondary':
      return isDark ? colors.primary : colors.primaryDark;
    default:
      return '#fff';
  }
}

function blurTint(isDark) {
  if (Platform.OS === 'ios') {
    return isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight';
  }
  return isDark ? 'dark' : 'light';
}

/**
 * Frosted glass button: native blur + thin tint so texture shows through.
 * Android: enables real blur (SDK 31+); older Android falls back to material-like tint.
 */
export function GlassButton({
  variant = 'primary',
  size = 'default',
  fullWidth = true,
  children,
  style,
  textStyle,
  disabled,
  ...rest
}) {
  const { colors, isDark } = useTheme();
  const kind = glassKind(variant === 'lock' ? 'primary' : variant);
  const isChip = kind === 'chipPrimary' || kind === 'chipDanger';
  const softShadow = variant === 'lock' || isChip;
  const radius = isChip ? RADIUS.chip : RADIUS.main;
  const metrics = isChip ? SIZES.compact : SIZES[size] ?? SIZES.default;

  const intensity = Platform.OS === 'ios' ? (isChip ? 70 : 85) : isChip ? 55 : 72;
  const overlay = overlayFor(kind, isDark, disabled);
  const sheen = sheenFor(kind, isDark);
  const border = borderFor(kind, isDark);
  const labelColor = textColorFor(kind, colors, disabled, isDark);

  const androidBlurProps =
    Platform.OS === 'android'
      ? { blurMethod: 'dimezisBlurViewSdk31Plus', blurReductionFactor: 3.2 }
      : {};

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.outer,
        shadowStyle(softShadow),
        {
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderRadius: radius,
          opacity: disabled ? 0.52 : pressed ? 0.9 : 1,
        },
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...rest}
    >
      <View
        style={[
          styles.clip,
          {
            borderRadius: radius,
            minHeight: metrics.minHeight,
            paddingVertical: metrics.padV,
            paddingHorizontal: metrics.padH,
            borderColor: border,
          },
        ]}
      >
        <BlurView
          intensity={intensity}
          tint={blurTint(isDark)}
          style={StyleSheet.absoluteFillObject}
          {...androidBlurProps}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: overlay }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.sheen,
            {
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
              borderBottomLeftRadius: radius * 1.4,
              borderBottomRightRadius: radius * 1.4,
              backgroundColor: sheen,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.edgeRim,
            {
              borderRadius: radius,
              borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.75)',
            },
          ]}
        />
        <Text
          style={[
            styles.label,
            {
              color: labelColor,
              fontSize: metrics.fontSize,
              fontWeight: metrics.weight,
              ...(kind === 'primary' || (kind === 'danger' && !isChip)
                ? {
                    textShadowColor: 'rgba(0,0,0,0.35)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }
                : {}),
              ...(kind === 'secondary' || kind === 'chipPrimary'
                ? {
                    textShadowColor: isDark
                      ? 'rgba(0,0,0,0.5)'
                      : 'rgba(255,255,255,0.75)',
                    textShadowOffset: { width: 0, height: 0.5 },
                    textShadowRadius: isDark ? 2 : 1,
                  }
                : {}),
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
  },
  clip: {
    overflow: 'hidden',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
  },
  edgeRim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  label: {
    textAlign: 'center',
    zIndex: 4,
    letterSpacing: 0.3,
  },
});
