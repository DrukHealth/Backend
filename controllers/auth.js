const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'your_mongodb_connection_string';
const client = new MongoClient(mongoURI);

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your_email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_app_password'
  }
});

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Connect to MongoDB
    await client.connect();
    const db = client.db('druk_health');
    const usersCollection = db.collection('users');

    // Check if user exists
    const user = await usersCollection.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP with expiration
    otpStore.set(trimmedEmail, { otp, expiresAt });

    console.log(`🔑 OTP for ${trimmedEmail}: ${otp}`);

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: trimmedEmail,
      subject: 'Password Reset OTP - Druk Health',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You have requested to reset your password for Druk Health.</p>
            <p>Your OTP is:</p>
            <h1 style="background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 5px; letter-spacing: 5px;">
              ${otp}
            </h1>
            <p style="color: #666;">This OTP will expire in 10 minutes.</p>
            <p style="color: #666;">If you didn't request this, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px;">Druk Health System</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'OTP sent successfully to your email',
      email: trimmedEmail 
    });

  } catch (error) {
    console.error('❌ Error in forgot-password:', error);
    res.status(500).json({ message: 'Server error while sending OTP' });
  }
});

// 2. Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const storedOTPData = otpStore.get(trimmedEmail);

    if (!storedOTPData) {
      return res.status(400).json({ message: 'No OTP found for this email. Please request a new one.' });
    }

    // Check if OTP expired
    if (Date.now() > storedOTPData.expiresAt) {
      otpStore.delete(trimmedEmail);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (storedOTPData.otp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // OTP verified successfully - keep it for password reset
    res.status(200).json({ 
      message: 'OTP verified successfully',
      email: trimmedEmail 
    });

  } catch (error) {
    console.error('❌ Error in verify-otp:', error);
    res.status(500).json({ message: 'Server error while verifying OTP' });
  }
});

// 3. Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Verify OTP was validated (should exist in store)
    const storedOTPData = otpStore.get(trimmedEmail);
    if (!storedOTPData) {
      return res.status(400).json({ message: 'Please verify OTP first' });
    }

    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Connect to MongoDB
    await client.connect();
    const db = client.db('druk_health');
    const usersCollection = db.collection('users');

    // Check if user exists
    const user = await usersCollection.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await usersCollection.updateOne(
      { email: trimmedEmail },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );

    // Clear OTP from store
    otpStore.delete(trimmedEmail);

    console.log(`✅ Password reset successful for ${trimmedEmail}`);

    res.status(200).json({ 
      message: 'Password reset successfully',
      email: trimmedEmail 
    });

  } catch (error) {
    console.error('❌ Error in reset-password:', error);
    res.status(500).json({ message: 'Server error while resetting password' });
  }
});

// Cleanup expired OTPs every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      console.log(`🗑️ Cleaned up expired OTP for ${email}`);
    }
  }
}, 15 * 60 * 1000);

module.exports = router;