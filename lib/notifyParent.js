import Constants from 'expo-constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidParentEmail(email) {
  if (typeof email !== 'string') return false;
  const t = email.trim();
  return t.length > 3 && t.length <= 320 && EMAIL_RE.test(t);
}

function notifyUrl() {
  const fromExtra = Constants.expoConfig?.extra?.parentNotifyUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_PARENT_NOTIFY_URL) {
    return String(process.env.EXPO_PUBLIC_PARENT_NOTIFY_URL).trim();
  }
  return '';
}

/** Optional shared secret; must match PARENT_NOTIFY_SECRET on the server. */
function notifySecret() {
  const fromExtra = Constants.expoConfig?.extra?.parentNotifySecret;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_PARENT_NOTIFY_SECRET) {
    return String(process.env.EXPO_PUBLIC_PARENT_NOTIFY_SECRET).trim();
  }
  return '';
}

/**
 * POST JSON to your own HTTPS endpoint (e.g. Vercel/Cloud Function using Resend/SendGrid).
 * If no URL is configured, this is a no-op. Never put API secrets in the app.
 */
export async function notifyParentEvent(payload) {
  const {
    kind,
    to,
    notifyEnabled,
    childName,
    taskTitle,
    starsEarned,
    rewardTitle,
    starCost,
  } = payload;
  if (!notifyEnabled || !isValidParentEmail(to)) return;

  const url = notifyUrl();
  if (!url) return;

  const secret = notifySecret();
  const headers = { 'Content-Type': 'application/json' };
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  const body = {
    kind,
    to: to.trim(),
    childName: childName || '',
    ...(kind === 'task_complete'
      ? { taskTitle: taskTitle || '', starsEarned: starsEarned ?? 0 }
      : { rewardTitle: rewardTitle || '', starCost: starCost ?? 0 }),
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    /* ignore network errors — notifications are best-effort */
  }
}
