const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (config.mail.host) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

async function sendOtpEmail(to, code, purpose) {
  const subjects = {
    signup: 'Verify your SkillSwap account',
    login: 'Your SkillSwap sign-in code',
    reset: 'Reset your SkillSwap password',
  };
  const text = `Your SkillSwap verification code is ${code}.\n\nIt expires in ${config.otp.ttlMinutes} minutes. If you did not request it, you can ignore this email.`;

  if (!config.mail.host) {
    if (config.isProd) throw new Error('SMTP is not configured');
    // Development convenience only (DEV_LOG_OTP=true). Never enabled in production.
    if (config.otp.devLog) console.log(`[dev mail] to=${to} purpose=${purpose} code=${code}`);
    return;
  }
  await getTransporter().sendMail({ from: config.mail.from, to, subject: subjects[purpose], text });
}

module.exports = { sendOtpEmail };
