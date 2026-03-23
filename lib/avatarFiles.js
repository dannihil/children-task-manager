import * as FileSystem from 'expo-file-system';

const DIR = `${FileSystem.documentDirectory}avatars`;

export function profileAvatarFileUri(profileId) {
  return `${DIR}/${profileId}.jpg`;
}

export async function ensureAvatarsDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  }
}

export async function savePickedAvatar(profileId, sourceUri) {
  await ensureAvatarsDir();
  const dest = profileAvatarFileUri(profileId);
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deleteProfileAvatarFile(profileId) {
  try {
    const dest = profileAvatarFileUri(profileId);
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    }
  } catch {
    /* ignore */
  }
}
