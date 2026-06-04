import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ Nodemailer SMTP Connection Error:", error);
  } else {
    console.log("✅ Nodemailer SMTP Server is ready to send messages");
  }
});

/**
 * Send an email using Nodemailer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const sendEmail = async (to, subject, htmlContent) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("⚠️ Nodemailer Warning: EMAIL_USER or EMAIL_PASS is not set in .env.");
      console.warn("⚠️ Emails will not be sent.");
      return false;
    }

    const mailOptions = {
      from: `"Hybrid Library" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

    console.log(`⏳ Attempting to send email to: ${to}`);
    console.log(`   Subject: ${subject}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}.`);
    console.log(`   Message ID: ${info.messageId}`);
    if (info.accepted.length > 0) {
      console.log(`   Accepted by: ${info.accepted.join(', ')}`);
    }
    if (info.rejected.length > 0) {
      console.warn(`⚠️ Rejected by: ${info.rejected.join(', ')}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`);
    console.error(`   Error Message: ${error.message}`);
    if (error.code) console.error(`   Error Code: ${error.code}`);
    if (error.command) console.error(`   Failed Command: ${error.command}`);
    return false;
  }
};
