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

function emailDict(lang) {
  const code = resolveLocale(lang);
  const raw = LOCALES[code]?.parentNotifyEmail;
  const base = LOCALES.en?.parentNotifyEmail;
  if (!base) {
    return {
      defaultChild: 'Your child',
      taskSubject: '{{childName}} completed a task',
      rewardSubject: '{{childName}} chose a reward',
      taskText: '{{childName}} completed: "{{taskTitle}}"\n{{starsEarned}}: {{stars}}\n',
      rewardText: '{{childName}} redeemed: "{{rewardTitle}}"\n{{starsSpent}}: {{starCost}}\n',
      taskHtml:
        '<p><strong>{{childName}}</strong> completed <strong>{{taskTitle}}</strong>.</p><p>{{starsEarned}}: <strong>{{stars}}</strong></p>',
      rewardHtml:
        '<p><strong>{{childName}}</strong> chose <strong>{{rewardTitle}}</strong>.</p><p>{{starsSpent}}: <strong>{{starCost}}</strong></p>',
      starsEarned: 'Stars earned',
      starsSpent: 'Stars spent',
      fallbackTask: 'A task',
      fallbackReward: 'A reward',
    };
  }
  if (!raw) return base;
  return { ...base, ...raw };
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

function buildEmail(body) {
  const { kind, childName, taskTitle, starsEarned, rewardTitle, starCost, locale } = body;
  const dict = emailDict(locale);
  const who =
    typeof childName === 'string' && childName.trim() ? childName.trim() : dict.defaultChild;

  if (kind === 'task_complete') {
    const rawTitle = typeof taskTitle === 'string' ? taskTitle.trim() : '';
    const titleText = rawTitle || dict.fallbackTask;
    const stars = Number(starsEarned) || 0;
    const subject = interpolate(dict.taskSubject, { childName: who });
    const text = interpolate(dict.taskText, {
      childName: who,
      taskTitle: titleText,
      starsEarned: dict.starsEarned,
      stars,
    });
    const html = interpolate(dict.taskHtml, {
      childName: escapeHtml(who),
      taskTitle: escapeHtml(titleText),
      starsEarned: escapeHtml(dict.starsEarned),
      stars,
    });
    return { subject, text, html };
  }

  if (kind === 'reward_redeem') {
    const rawTitle = typeof rewardTitle === 'string' ? rewardTitle.trim() : '';
    const titleText = rawTitle || dict.fallbackReward;
    const cost = Number(starCost) || 0;
    const subject = interpolate(dict.rewardSubject, { childName: who });
    const text = interpolate(dict.rewardText, {
      childName: who,
      rewardTitle: titleText,
      starsSpent: dict.starsSpent,
      starCost: cost,
    });
    const html = interpolate(dict.rewardHtml, {
      childName: escapeHtml(who),
      rewardTitle: escapeHtml(titleText),
      starsSpent: escapeHtml(dict.starsSpent),
      starCost: cost,
    });
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
