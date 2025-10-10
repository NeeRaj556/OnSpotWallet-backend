const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Send an email using nodemailer
 * @param {Object} param0
 * @param {string} param0.to - Recipient email
 * @param {string} param0.subject - Email subject
 * @param {string} param0.text - Email body (plain text)
 */
async function sendEmail({ to, subject, text }) {
    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text
    });
 }

module.exports = sendEmail;
