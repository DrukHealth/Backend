// src/utils/email.js
import nodemailer from "nodemailer";
import { google } from "googleapis";

const OAuth2 = google.auth.OAuth2;

// OAuth2 client
const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // redirect URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

export async function sendEmail({ to, subject, html }) {
  try {
    const accessTokenObject = await oauth2Client.getAccessToken();
    const accessToken = accessTokenObject?.token;

    if (!accessToken) {
      console.error("❌ No access token generated");
      throw new Error("OAuth2 access token failed");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    await transporter.sendMail({
      from: `"Druk Health" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email sent →", to);
    return true;
  } catch (error) {
    console.error("[Email Error]", error);
    throw new Error("Email sending failed");
  }
}
