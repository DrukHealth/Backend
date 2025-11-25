import { google } from "googleapis";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Missing CLIENT_ID or CLIENT_SECRET");
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ["https://mail.google.com/"];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("\n🟦 STEP 1: Open this URL in your browser:\n");
console.log(authUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("\n🟦 STEP 2: Paste the code from Google: ", async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log("\n✅ REFRESH TOKEN:\n");
    console.log(tokens.refresh_token);
    rl.close();
  } catch (err) {
    console.error("❌ Error exchanging code:", err.message);
  }
});
