/**
 * Parent notification webhook — deploy to Vercel (push this repo / connect GitHub).
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY       — from https://resend.com/api-keys
 *   RESEND_FROM          — sender address Resend accepts, e.g. "anything <notify@yourdomain.com>" or bare email.
 *                          The visible name is always rebuilt as RESEND_FROM_NAME or "TaskyKids" (so old values
 *                          like "Children Task Manager" in Vercel are replaced on send).
 *   RESEND_FROM_NAME     — optional override for that display name (default: TaskyKids).
 *   PARENT_NOTIFY_SECRET — optional; if set, app must send Authorization: Bearer <same value>
 *
 * Email copy uses `locales/*.json` → `parentNotifyEmail` and the app’s `locale` field (en, is, de, …).
 *
 * Signature image: embedded inline via Resend CID from `api/taskykids-email-signature.png` (no public URL needed).
 * Fallback: optional `EMAIL_SIGNATURE_IMAGE_URL` for remote <img> if the file cannot be read on disk.
 */

const fs = require('fs');
const path = require('path');

const RESEND_URL = 'https://api.resend.com/emails';
const SIGNATURE_FILENAME = 'taskykids-email-signature.png';
const SIGNATURE_CID = 'taskykids-signature';
const SIGNATURE_STATIC_PATH = 'taskykids-email-signature.png';

const LOCALES = {
  en: require('../locales/en.json'),
  is: require('../locales/is.json'),
  es: require('../locales/es.json'),
  de: require('../locales/de.json'),
  fr: require('../locales/fr.json'),
  pt: require('../locales/pt.json'),
  pl: require('../locales/pl.json'),
};

const SUPPORTED = new Set(['en', 'is', 'es', 'de', 'fr', 'pt', 'pl']);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseBody(req) {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw || '{}');
    } catch {
      return null;
    }
  }
  return {};
}

function isValidEmail(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  return t.length > 3 && t.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

const DEFAULT_RESEND_DISPLAY_NAME = 'TaskyKids';

/** Resend `from`: use configured email but force display name (fixes stale "Children Task Manager" in env). */
function resendFromHeader() {
  const raw = typeof process.env.RESEND_FROM === 'string' ? process.env.RESEND_FROM.trim() : '';
  if (!raw) return null;
  const nameRaw = process.env.RESEND_FROM_NAME;
  const displayName =
    typeof nameRaw === 'string' && nameRaw.trim().length > 0
      ? nameRaw.trim()
      : DEFAULT_RESEND_DISPLAY_NAME;
  const bracket = raw.match(/<([^>]+)>/);
  if (bracket) {
    const email = bracket[1].trim();
    if (isValidEmail(email)) return `${displayName} <${email}>`;
  }
  if (isValidEmail(raw)) return `${displayName} <${raw}>`;
  return raw;
}

function resolveLocale(code) {
  if (typeof code !== 'string') return 'en';
  const c = code.trim().toLowerCase();
  if (SUPPORTED.has(c)) return c;
  const two = c.slice(0, 2);
  if (SUPPORTED.has(two)) return two;
  return 'en';
}

const EMAIL_FALLBACK_EN = {
  defaultChild: 'Your child',
  fallbackTask: 'A task',
  fallbackReward: 'A reward',
  dearParent: 'Dear parent,',
  taskSubject: '{{childName}} completed a task!',
  taskBodyLine1:
    '{{childName}} just completed the task {{taskTitle}} and received {{stars}} stars.',
  taskBodyLine2: '{{childName}} now has a total of {{totalStars}} stars.',
  rewardSubject: '{{childName}} chose a reward!',
  rewardBodyLine1:
    '{{childName}} just chose {{rewardTitle}} and spent {{starCost}} stars.',
  rewardBodyLine2: '{{childName}} now has a total of {{totalStars}} stars.',
};

function emailDict(lang) {
  const code = resolveLocale(lang);
  const raw = LOCALES[code]?.parentNotifyEmail;
  const base = LOCALES.en?.parentNotifyEmail;
  if (!base) return { ...EMAIL_FALLBACK_EN };
  if (!raw) return { ...EMAIL_FALLBACK_EN, ...base };
  return { ...EMAIL_FALLBACK_EN, ...base, ...raw };
}

function interpolate(str, map) {
  if (typeof str !== 'string') return '';
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (map[k] != null ? String(map[k]) : ''));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtmlTags(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, '').trim();
}

function normalizeStarCount(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.floor(x);
}

function signatureImageUrl() {
  const explicit = process.env.EMAIL_SIGNATURE_IMAGE_URL;
  if (typeof explicit === 'string' && explicit.trim().length > 0) return explicit.trim();
  const vercel = process.env.VERCEL_URL;
  if (typeof vercel === 'string' && vercel.trim().length > 0) {
    const host = vercel.replace(/^https?:\/\//, '').split('/')[0];
    return `https://${host}/${SIGNATURE_STATIC_PATH}`;
  }
  return '';
}

/** @type {{ filename: string, content: string, content_id: string } | null | undefined} */
let signatureAttachmentCache;

/** Inline PNG for Resend (CID). Tries `api/` first so Vercel bundles the file with the function. */
function getSignatureAttachment() {
  if (signatureAttachmentCache !== undefined) return signatureAttachmentCache;
  const candidates = [
    path.join(__dirname, SIGNATURE_FILENAME),
    path.join(__dirname, '..', 'public', SIGNATURE_FILENAME),
    path.join(process.cwd(), 'public', SIGNATURE_FILENAME),
    path.join(process.cwd(), 'api', SIGNATURE_FILENAME),
  ];
  for (const p of candidates) {
    try {
      const buf = fs.readFileSync(p);
      if (buf && buf.length > 0) {
        signatureAttachmentCache = {
          filename: SIGNATURE_FILENAME,
          content: buf.toString('base64'),
          content_id: SIGNATURE_CID,
          content_type: 'image/png',
        };
        return signatureAttachmentCache;
      }
    } catch {
      /* try next path */
    }
  }
  signatureAttachmentCache = null;
  return null;
}

/** HTML under signoff: prefer CID inline image; else optional remote URL. */
function emailSignatureHtmlBlock() {
  if (getSignatureAttachment()) {
    return `<p style="margin:20px 0 0 0;line-height:0;"><img src="cid:${SIGNATURE_CID}" width="280" alt="TaskyKids" border="0" style="display:block;max-width:280px;height:auto;border:0;outline:none;text-decoration:none;" /></p>`;
  }
  const url = signatureImageUrl();
  if (!url) return '';
  const safe = url.replace(/"/g, '');
  return `<p style="margin:20px 0 0 0;line-height:0;"><img src="${safe}" width="280" alt="TaskyKids" border="0" style="display:block;max-width:280px;height:auto;border:0;outline:none;text-decoration:none;" /></p>`;
}

function appendSignatureText(text) {
  if (getSignatureAttachment()) return text;
  const url = signatureImageUrl();
  if (!url) return text;
  return `${text}\n\n${url}`;
}

function buildEmail(body) {
  const { kind, childName, taskTitle, starsEarned, rewardTitle, starCost, totalStars, locale } =
    body;
  const dict = emailDict(locale);
  const cleanedChildName = stripHtmlTags(childName);
  const who = cleanedChildName || stripHtmlTags(dict.defaultChild);
  const total = normalizeStarCount(totalStars);

  if (kind === 'task_complete') {
    const rawTitle = stripHtmlTags(taskTitle);
    const titleText = rawTitle || stripHtmlTags(dict.fallbackTask);
    const stars = normalizeStarCount(starsEarned);
    const subject = interpolate(dict.taskSubject, { childName: who });
    const line1 = interpolate(dict.taskBodyLine1, {
      childName: who,
      taskTitle: titleText,
      stars,
    });
    const line2 = interpolate(dict.taskBodyLine2, { childName: who, totalStars: total });
    const text = appendSignatureText(`${dict.dearParent}\n\n${line1}\n${line2}`);
    const line1Html = interpolate(dict.taskBodyLine1, {
      childName: escapeHtml(who),
      taskTitle: `<strong>${escapeHtml(titleText)}</strong>`,
      stars,
    });
    const line2Html = interpolate(dict.taskBodyLine2, {
      childName: escapeHtml(who),
      totalStars: total,
    });
    const html =
      `<p>${escapeHtml(dict.dearParent)}</p><p>${line1Html}</p><p>${line2Html}</p>` +
      emailSignatureHtmlBlock();
    return { subject, text, html };
  }

  if (kind === 'reward_redeem') {
    const rawTitle = stripHtmlTags(rewardTitle);
    const titleText = rawTitle || stripHtmlTags(dict.fallbackReward);
    const cost = normalizeStarCount(starCost);
    const subject = interpolate(dict.rewardSubject, { childName: who });
    const line1 = interpolate(dict.rewardBodyLine1, {
      childName: who,
      rewardTitle: titleText,
      starCost: cost,
    });
    const line2 = interpolate(dict.rewardBodyLine2, { childName: who, totalStars: total });
    const text = appendSignatureText(`${dict.dearParent}\n\n${line1}\n${line2}`);
    const line1Html = interpolate(dict.rewardBodyLine1, {
      childName: escapeHtml(who),
      rewardTitle: `<strong>${escapeHtml(titleText)}</strong>`,
      starCost: cost,
    });
    const line2Html = interpolate(dict.rewardBodyLine2, {
      childName: escapeHtml(who),
      totalStars: total,
    });
    const html =
      `<p>${escapeHtml(dict.dearParent)}</p><p>${line1Html}</p><p>${line2Html}</p>` +
      emailSignatureHtmlBlock();
    return { subject, text, html };
  }

  return null;
}

module.exports = async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.PARENT_NOTIFY_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const body = parseBody(req);
  if (body === null) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { kind, to } = body;
  if (!isValidEmail(to)) {
    return res.status(400).json({ error: 'Invalid recipient' });
  }

  const content = buildEmail(body);
  if (!content) {
    return res.status(400).json({ error: 'Unknown or invalid kind' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = resendFromHeader();
  if (!apiKey || !from) {
    return res.status(503).json({ error: 'Server email not configured (RESEND_API_KEY / RESEND_FROM)' });
  }

  const sig = getSignatureAttachment();
  const payload = {
    from,
    to: [to.trim()],
    subject: content.subject,
    text: content.text,
    html: content.html,
  };
  if (sig) {
    payload.attachments = [
      {
        filename: sig.filename,
        content: sig.content,
        content_id: sig.content_id,
        content_type: sig.content_type,
      },
    ];
  }

  const resendRes = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await resendRes.json().catch(() => ({}));

  if (!resendRes.ok) {
    return res.status(502).json({
      error: 'Resend request failed',
      details: data?.message || resendRes.statusText,
    });
  }

  return res.status(200).json({ ok: true, id: data.id });
};
