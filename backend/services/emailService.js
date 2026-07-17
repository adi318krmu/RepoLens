const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email with error handling
 */
async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"RepoLens Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent successfully: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email via Nodemailer:", error);
    throw error;
  }
}

/**
 * Generate Verification Email Template
 */
function getVerificationTemplate(name, otp) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #0F172A;
          color: #E2E8F0;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .card {
          background-color: #1E293B;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 24px;
          color: #FFFFFF;
          text-decoration: none;
          margin-bottom: 24px;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: 800;
        }
        h1 {
          color: #FFFFFF;
          font-size: 24px;
          margin-bottom: 8px;
        }
        p {
          color: #94A3B8;
          font-size: 16px;
          line-height: 1.6;
          margin-top: 0;
          margin-bottom: 24px;
        }
        .otp-container {
          background-color: #0F172A;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px 24px;
          display: inline-block;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 6px;
          color: #6366F1;
          margin-bottom: 24px;
        }
        .footer {
          margin-top: 32px;
          font-size: 12px;
          color: #64748B;
          border-top: 1px solid #334155;
          padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">
            <span class="logo-icon">R</span>
            <span>RepoLens</span>
          </div>
          <h1>Verify Your RepoLens Account</h1>
          <p>Hello ${name},</p>
          <p>Thank you for signing up with RepoLens! To complete your registration and start analyzing your repositories, please verify your email address using the 6-digit One-Time Password (OTP) below:</p>
          <div class="otp-container">${otp}</div>
          <p>This OTP is valid for <strong>10 minutes</strong>. If you did not sign up for RepoLens, you can safely ignore this email.</p>
          <div class="footer">
            &copy; ${new Date().getFullYear()} RepoLens. All rights reserved.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate Reset Password Email Template
 */
function getResetTemplate(name, otp) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #0F172A;
          color: #E2E8F0;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .card {
          background-color: #1E293B;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 24px;
          color: #FFFFFF;
          text-decoration: none;
          margin-bottom: 24px;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: 800;
        }
        h1 {
          color: #FFFFFF;
          font-size: 24px;
          margin-bottom: 8px;
        }
        p {
          color: #94A3B8;
          font-size: 16px;
          line-height: 1.6;
          margin-top: 0;
          margin-bottom: 24px;
        }
        .otp-container {
          background-color: #0F172A;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px 24px;
          display: inline-block;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 6px;
          color: #EF4444;
          margin-bottom: 24px;
        }
        .warning-box {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #F87171;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          text-align: left;
          margin-bottom: 24px;
        }
        .footer {
          margin-top: 32px;
          font-size: 12px;
          color: #64748B;
          border-top: 1px solid #334155;
          padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">
            <span class="logo-icon">R</span>
            <span>RepoLens</span>
          </div>
          <h1>Reset Your RepoLens Password</h1>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Use the following One-Time Password (OTP) to complete the process:</p>
          <div class="otp-container">${otp}</div>
          <div class="warning-box">
            <strong>Security Warning:</strong> This OTP is valid for <strong>10 minutes</strong>. If you did not request a password reset, please secure your account immediately. Do NOT share this OTP with anyone.
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} RepoLens. All rights reserved.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  getVerificationTemplate,
  getResetTemplate,
};
