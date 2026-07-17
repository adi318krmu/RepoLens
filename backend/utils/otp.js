const crypto = require("crypto");

/**
 * Generates a secure 6-digit numeric OTP.
 * @returns {string} The 6-digit OTP string.
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

module.exports = {
  generateOTP
};
