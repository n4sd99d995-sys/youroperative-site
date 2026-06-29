// Operative — Contact Form Handler
// 1. Sends email notification via Mailgun
// 2. Logs lead to leads.json in GitHub repo

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN  = process.env.MAILGUN_DOMAIN;
const NOTIFY_EMAIL    = process.env.NOTIFY_EMAIL || 'operations@youroperative.com';
const GITHUB_TOKEN    = process.env.GITHUB_TOKEN;
const GITHUB_REPO     = 'n4sd99d995-sys/youroperative-site';
const LEADS_FILE      = 'leads.json';

async function sendEmail(name, company, phone, email) {
  const subject = `New lead: ${name} — ${company}`;
  const text = [
    `New contact form submission on youroperative.com`,
    ``,
    `Name:    ${name}`,
    `Company: ${company}`,
    `Phone:   ${phone}`,
    `Email:   ${email}`,
    ``,
    `Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT`,
  ].join('\n');

  const body = new URLSearchParams({
    from:    `Operative Contact Form <noreply@${MAILGUN_DOMAIN}>`,
    to:      NOTIFY_EMAIL,
    subject: subject,
    text:    text,
  });

  const res = await fetch(
    `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
    {
      method:  'POST',
      headers: {
        Authorization:  'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );
  if (!res.ok) console.error('Mailgun error:', await res.text());
}

async function logToGitHub(lead) {
  const apiBase = `https://api.github.com/repos/${GITHUB_REPO}/contents/${LEADS_FILE}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept:        'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // Get current file (or start fresh)
  let sha = null;
  let leads = [];
  const getRes = await fetch(apiBase, { headers });
  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
    leads = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
  }

  leads.push(lead);

  const putBody = {
    message: `lead: ${lead.name} — ${lead.company}`,
    content: Buffer.from(JSON.stringify(leads, null, 2)).toString('base64'),
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(apiBase, { method: 'PUT', headers, body: JSON.stringify(putBody) });
  if (!putRes.ok) console.error('GitHub log error:', await putRes.text());
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const params   = new URLSearchParams(event.body);

  // Honeypot — bots fill this, humans don't. Silently discard.
  if (params.get('website') || params.get('bot_field')) {
    return { statusCode: 302, headers: { Location: '/success.html' }, body: '' };
  }

  const name    = params.get('name')    || '(no name)';
  const company = params.get('company') || '';
  const phone   = params.get('phone')   || '';
  const email   = params.get('email')   || '';

  const lead = {
    name,
    company,
    phone,
    email,
    submitted_at: new Date().toISOString(),
  };

  // Run both in parallel, don't let either block the redirect
  await Promise.allSettled([
    sendEmail(name, company, phone, email),
    logToGitHub(lead),
  ]);

  return {
    statusCode: 302,
    headers: { Location: '/success.html' },
    body: '',
  };
};
