const nodemailer = require('nodemailer');

// Obfuscate email
const EMAIL = ['jmvegas21', 'gmail', 'com'].join('@').replace('@g', '@g').replace('@gmail@', '@gmail.');
const TO = 'jmvegas21@gmail.com'; // For server only, not exposed to client

// In-memory rate limit (per IP, 3/min)
const rateLimit = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 3;
const SPAM_WORDS = ['viagra', 'casino', 'loan', 'bitcoin', 'crypto', 'porn', 'sex', 'escort', 'nude'];

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  // Remove timestamps older than 1 minute
  rateLimit[ip] = rateLimit[ip].filter(ts => now - ts < RATE_LIMIT_WINDOW);
  if (rateLimit[ip].length >= RATE_LIMIT_MAX) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Please wait a minute.' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }
  const { email, subject, message, website } = data;
  if (website) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bot detected.' }) };
  }
  if (!subject || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };
  }
  const lower = (subject + ' ' + message).toLowerCase();
  if (SPAM_WORDS.some(w => lower.includes(w))) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Spam detected.' }) };
  }

  // Configure nodemailer (use env vars for SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: email || process.env.SMTP_USER,
    to: TO,
    subject: `[RiverFlood Issue] ${subject}`,
    text: `From: ${email || 'anonymous'}\n\n${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    rateLimit[ip].push(now); // Only count successful sends
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Email send error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email: ' + (err && err.message ? err.message : String(err)) }) };
  }
}; 