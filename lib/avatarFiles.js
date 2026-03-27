import * as FileSystem from 'expo-file-system/legacy';

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

async function copyViaBase64(sourceUri, dest) {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function savePickedAvatar(profileId, sourceUri) {
  await ensureAvatarsDir();
  const dest = profileAvatarFileUri(profileId);
  try {
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
  } catch {
    await copyViaBase64(sourceUri, dest);
  }
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
