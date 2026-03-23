import { Image, Text, View } from 'react-native';

import { AVATAR_PRESET_BY_ID } from '../lib/avatarPresets';

const DEFAULT_EMOJI = '👤';

export function ProfileAvatar({ profile, size = 48, colors, style, plain = false }) {
  const uri = profile?.avatarUri;
  const preset = profile?.avatarPreset;
  const emoji = preset && AVATAR_PRESET_BY_ID[preset] ? AVATAR_PRESET_BY_ID[preset].emoji : null;
  const radius = size / 2;

  const ring = {
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor: colors.surfaceMuted,
    borderWidth: plain ? 0 : 3,
    borderColor: plain ? 'transparent' : colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (uri) {
    return (
      <View style={[ring, style]}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <View style={[ring, style]} accessibilityRole="image">
      <Text style={{ fontSize: Math.round(size * 0.52), lineHeight: Math.round(size * 0.58) }}>
        {emoji || DEFAULT_EMOJI}
      </Text>
    </View>
  );
}
