/**
 * Parent notification webhook — deploy to Vercel (push this repo / connect GitHub).
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY       — from https://resend.com/api-keys
 *   RESEND_FROM          — verified sender, e.g. "Children App <notify@yourdomain.com>"
 *                          Test sender "… <onboarding@resend.dev>" ONLY delivers to the email on your Resend
 *                          account. To mail any parent address, verify a domain at resend.com/domains and use
 *                          a from-address on that domain (update RESEND_FROM, redeploy).
 *   PARENT_NOTIFY_SECRET — optional; if set, app must send Authorization: Bearer <same value>
 *
 * Email copy uses `locales/*.json` → `parentNotifyEmail` and the app’s `locale` field (en, is, de, …).
 */

const RESEND_URL = 'https://api.resend.com/emails';

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
  emailSignoff: '— Children Task Manager —',
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

function normalizeStarCount(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.floor(x);
}

function buildEmail(body) {
  const { kind, childName, taskTitle, starsEarned, rewardTitle, starCost, totalStars, locale } =
    body;
  const dict = emailDict(locale);
  const who =
    typeof childName === 'string' && childName.trim() ? childName.trim() : dict.defaultChild;
  const total = normalizeStarCount(totalStars);

  if (kind === 'task_complete') {
    const rawTitle = typeof taskTitle === 'string' ? taskTitle.trim() : '';
    const titleText = rawTitle || dict.fallbackTask;
    const stars = normalizeStarCount(starsEarned);
    const subject = interpolate(dict.taskSubject, { childName: who });
    const line1 = interpolate(dict.taskBodyLine1, {
      childName: who,
      taskTitle: titleText,
      stars,
    });
    const line2 = interpolate(dict.taskBodyLine2, { childName: who, totalStars: total });
    const text = `${dict.dearParent}\n\n${line1}\n${line2}\n\n${dict.emailSignoff}`;
    const html = `<p>${escapeHtml(dict.dearParent)}</p><p>${escapeHtml(line1)}</p><p>${escapeHtml(line2)}</p><p>${escapeHtml(dict.emailSignoff)}</p>`;
    return { subject, text, html };
  }

  if (kind === 'reward_redeem') {
    const rawTitle = typeof rewardTitle === 'string' ? rewardTitle.trim() : '';
    const titleText = rawTitle || dict.fallbackReward;
    const cost = normalizeStarCount(starCost);
    const subject = interpolate(dict.rewardSubject, { childName: who });
    const line1 = interpolate(dict.rewardBodyLine1, {
      childName: who,
      rewardTitle: titleText,
      starCost: cost,
    });
    const line2 = interpolate(dict.rewardBodyLine2, { childName: who, totalStars: total });
    const text = `${dict.dearParent}\n\n${line1}\n${line2}\n\n${dict.emailSignoff}`;
    const html = `<p>${escapeHtml(dict.dearParent)}</p><p>${escapeHtml(line1)}</p><p>${escapeHtml(line2)}</p><p>${escapeHtml(dict.emailSignoff)}</p>`;
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
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return res.status(503).json({ error: 'Server email not configured (RESEND_API_KEY / RESEND_FROM)' });
  }

  const resendRes = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to.trim()],
      subject: content.subject,
      text: content.text,
      html: content.html,
    }),
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
