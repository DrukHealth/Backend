// models/admin.model.js
const pool = require("../config/db"); // your MySQL connection pool
const bcrypt = require("bcrypt");

class Admin {

  // Find admin by email
  static async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT * FROM admin WHERE email = ?",
      [email]
    );
    return rows[0]; // return single admin or undefined
  }

  // Save reset token & expiry
  static async saveResetToken(email, token, expiry) {
    await pool.query(
      "UPDATE admin SET reset_token = ?, reset_token_expiry = ? WHERE email = ?",
      [token, expiry, email]
    );
  }

  // Find admin by reset token and check expiry
  static async findByResetToken(token) {
    const [rows] = await pool.query(
      "SELECT * FROM admin WHERE reset_token = ? AND reset_token_expiry > NOW()",
      [token]
    );
    return rows[0]; // returns admin if token is valid
  }

  // Update password and clear reset token
  static async updatePassword(id, hashedPassword) {
    await pool.query(
      "UPDATE admin SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [hashedPassword, id]
    );
  }

  // Optional: Create admin (for testing)
  static async create(email, password) {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO admin (email, password_hash) VALUES (?, ?)",
      [email, hashed]
    );
  }
}

module.exports = Admin;
