/** Preset avatars (emoji) children can pick — ids are stored in profile.avatarPreset */
export const AVATAR_PRESETS = [
  { id: 'smile', emoji: '😀' },
  { id: 'star', emoji: '⭐' },
  { id: 'heart', emoji: '❤️' },
  { id: 'rocket', emoji: '🚀' },
  { id: 'cat', emoji: '🐱' },
  { id: 'dog', emoji: '🐶' },
  { id: 'panda', emoji: '🐼' },
  { id: 'unicorn', emoji: '🦄' },
  { id: 'sun', emoji: '☀️' },
  { id: 'moon', emoji: '🌙' },
  { id: 'flower', emoji: '🌸' },
  { id: 'ball', emoji: '⚽' },
];

export const AVATAR_PRESET_IDS = new Set(AVATAR_PRESETS.map((p) => p.id));

export const AVATAR_PRESET_BY_ID = Object.fromEntries(
  AVATAR_PRESETS.map((p) => [p.id, p])
);
