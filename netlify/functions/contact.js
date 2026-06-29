// Operative — Contact Form Handler
// Receives form POST, sends notification via Mailgun, redirects to success page

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN  = process.env.MAILGUN_DOMAIN;
const NOTIFY_EMAIL    = process.env.NOTIFY_EMAIL || 'operations@youroperative.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse URL-encoded body
  const params = new URLSearchParams(event.body);
  const name    = params.get('name')    || '(no name)';
  const company = params.get('company') || '(no company)';
  const phone   = params.get('phone')   || '(no phone)';
  const email   = params.get('email')   || '(no email)';

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

  try {
    const body = new URLSearchParams({
      from:    `Operative Contact Form <noreply@${MAILGUN_DOMAIN}>`,
      to:      NOTIFY_EMAIL,
      subject: subject,
      text:    text,
    });

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method:  'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Mailgun error:', err);
      // Still redirect to success — don't show errors to leads
    }
  } catch (err) {
    console.error('Send failed:', err);
  }

  // Always redirect to success page
  return {
    statusCode: 302,
    headers: { Location: '/success.html' },
    body: '',
  };
};
