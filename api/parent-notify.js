/**
 * Parent notification webhook — deploy to Vercel (push this repo / connect GitHub).
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY       — from https://resend.com/api-keys
 *   RESEND_FROM          — verified sender, e.g. "Children App <notify@yourdomain.com>"
 *                          (testing: "Children App <onboarding@resend.dev>" — only sends to your Resend account email)
 *   PARENT_NOTIFY_SECRET — optional; if set, app must send Authorization: Bearer <same value>
 */

const RESEND_URL = 'https://api.resend.com/emails';

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

function buildEmail(body) {
  const { kind, to, childName, taskTitle, starsEarned, rewardTitle, starCost } = body;
  const who = typeof childName === 'string' && childName.trim() ? childName.trim() : 'Your child';

  if (kind === 'task_complete') {
    const title = typeof taskTitle === 'string' ? taskTitle.trim() : 'A task';
    const stars = Number(starsEarned) || 0;
    const subject = `${who} completed a task`;
    const text = `${who} completed: "${title}"\nStars earned: ${stars}\n`;
    const html = `<p><strong>${escapeHtml(who)}</strong> completed <strong>${escapeHtml(title)}</strong>.</p><p>Stars earned: <strong>${stars}</strong></p>`;
    return { subject, text, html };
  }

  if (kind === 'reward_redeem') {
    const title = typeof rewardTitle === 'string' ? rewardTitle.trim() : 'A reward';
    const cost = Number(starCost) || 0;
    const subject = `${who} chose a reward`;
    const text = `${who} redeemed: "${title}"\nStars spent: ${cost}\n`;
    const html = `<p><strong>${escapeHtml(who)}</strong> chose <strong>${escapeHtml(title)}</strong>.</p><p>Stars spent: <strong>${cost}</strong></p>`;
    return { subject, text, html };
  }

  return null;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
