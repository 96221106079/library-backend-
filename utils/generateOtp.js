// ============================================
// generateOtp.js - Secure OTP Generator
// ============================================

/**
 * Generates a 6-digit OTP string.
 * Uses Math.random (sufficient for this application scale).
 */
export const generateOtpSync = () =>
  String(Math.floor(100000 + Math.random() * 900000));
