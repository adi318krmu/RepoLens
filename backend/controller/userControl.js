const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../model/userSchema");
const authSecret = require("../utils/authSecret");
const { getDbStatus } = require("../model/dbConnect");
const { generateOTP } = require("../utils/otp");
const { sendEmail, getVerificationTemplate, getResetTemplate } = require("../services/emailService");
const {
  createUser: createLocalUser,
  findUserByEmail: findLocalUserByEmail,
  findUserById: findLocalUserById
} = require("../services/localStore");

function sanitizeUser(user) {
  const rawUser = user?._doc ?? user;
  if (!rawUser) return null;
  const { password, verificationOTP, verificationOTPExpires, resetOTP, resetOTPExpires, ...safeUser } = rawUser;
  return safeUser;
}

async function signupUser(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = getDbStatus()
      ? await User.findOne({ email: normalizedEmail })
      : await findLocalUserByEmail(normalizedEmail);

    if (existingUser) {
      const isVerified = existingUser.verified ?? existingUser?._doc?.verified;
      if (isVerified) {
        return res.status(400).json({
          success: false,
          message: "User already exists. Please log in."
        });
      }

      // User exists but is unverified: update details and generate a fresh OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      if (getDbStatus()) {
        existingUser.name = name;
        existingUser.password = password;
        existingUser.verificationOTP = otp;
        existingUser.verificationOTPExpires = otpExpires;
        await existingUser.save();
      } else {
        const { updateUserFields } = require("../services/localStore");
        await updateUserFields(existingUser._id, {
          name,
          password: await bcrypt.hash(password, 10),
          verificationOTP: otp,
          verificationOTPExpires: otpExpires.toISOString()
        });
      }

      console.log(`🔑 [OTP GENERATED] Signup OTP for ${normalizedEmail}: ${otp}`);

      // Send verification email in background (non-blocking for fast UI response)
      sendEmail({
        to: normalizedEmail,
        subject: "Verify Your RepoLens Account",
        html: getVerificationTemplate(name, otp)
      }).catch(err => {
        console.error("Failed to send signup verification email in background:", err);
      });

      return res.status(200).json({
        success: true,
        message: "Registration updated. Please verify your email using the OTP sent.",
        email: normalizedEmail
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`🔑 [OTP GENERATED] Signup OTP for ${normalizedEmail}: ${otp}`);

    const user = getDbStatus()
      ? await User.create({
          name,
          email: normalizedEmail,
          password,
          verified: false,
          verificationOTP: otp,
          verificationOTPExpires: otpExpires
        })
      : await createLocalUser({
          name,
          email: normalizedEmail,
          password: await bcrypt.hash(password, 10)
        });

    if (!getDbStatus()) {
      const { updateUserFields } = require("../services/localStore");
      await updateUserFields(user._id, {
        verified: false,
        verificationOTP: otp,
        verificationOTPExpires: otpExpires.toISOString()
      });
    }

    // Send verification email in background (non-blocking for fast UI response)
    sendEmail({
      to: normalizedEmail,
      subject: "Verify Your RepoLens Account",
      html: getVerificationTemplate(name, otp)
    }).catch(err => {
      console.error("Failed to send signup verification email in background:", err);
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email using the OTP sent.",
      email: normalizedEmail
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create account or send verification email"
    });
  }
}

async function loginUser(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = getDbStatus()
      ? await User.findOne({ email: normalizedEmail })
      : await findLocalUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const passwordHash = user.password ?? user?._doc?.password;
    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isVerified = user.verified ?? user?._doc?.verified;
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please verify your email first.",
        verified: false
      });
    }

    const token = jwt.sign({ id: user._id }, authSecret, { expiresIn: "1d" });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to log in"
    });
  }
}

async function getProfile(req, res) {
  try {
    const user = getDbStatus()
      ? await User.findById(req.user.id).select("-password")
      : await findLocalUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load profile"
    });
  }
}

async function updateProfilePicture(req, res) {
  const { profilePicture } = req.body;
  if (!profilePicture) {
    return res.status(400).json({
      success: false,
      message: "Profile picture data is required"
    });
  }

  try {
    const user = getDbStatus()
      ? await User.findByIdAndUpdate(req.user.id, { profilePicture }, { new: true }).select("-password")
      : await updateUserProfilePictureLocal(req.user.id, profilePicture);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("UPDATE PROFILE PICTURE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile picture"
    });
  }
}

async function removeProfilePicture(req, res) {
  try {
    const user = getDbStatus()
      ? await User.findByIdAndUpdate(req.user.id, { profilePicture: "" }, { new: true }).select("-password")
      : await updateUserProfilePictureLocal(req.user.id, "");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("REMOVE PROFILE PICTURE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to remove profile picture"
    });
  }
}

async function verifyEmail(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = getDbStatus()
      ? await User.findOne({ email: normalizedEmail })
      : await findLocalUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const userOtp = user.verificationOTP ?? user?._doc?.verificationOTP;
    const userOtpExpires = user.verificationOTPExpires ?? user?._doc?.verificationOTPExpires;

    if (!userOtp || userOtp !== otp || new Date(userOtpExpires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    if (getDbStatus()) {
      user.verified = true;
      user.verificationOTP = undefined;
      user.verificationOTPExpires = undefined;
      await user.save();
    } else {
      const { updateUserFields } = require("../services/localStore");
      await updateUserFields(user._id, {
        verified: true,
        verificationOTP: null,
        verificationOTPExpires: null
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in."
    });
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify email"
    });
  }
}

async function resendOTP(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = getDbStatus()
      ? await User.findOne({ email: normalizedEmail })
      : await findLocalUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const isVerified = user.verified ?? user?._doc?.verified;
    if (isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (getDbStatus()) {
      user.verificationOTP = otp;
      user.verificationOTPExpires = otpExpires;
      await user.save();
    } else {
      const { updateUserFields } = require("../services/localStore");
      await updateUserFields(user._id, {
        verificationOTP: otp,
        verificationOTPExpires: otpExpires.toISOString()
      });
    }

    console.log(`🔑 [OTP GENERATED] Resend OTP for ${normalizedEmail}: ${otp}`);

    // Send verification email
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Verify Your RepoLens Account",
        html: getVerificationTemplate(user.name ?? user?._doc?.name, otp)
      });
    } catch (err) {
      console.error("Failed to send resendOTP email:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please check your email configuration or try again."
      });
    }

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email."
    });
  } catch (error) {
    console.error("RESEND OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to resend OTP"
    });
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = getDbStatus()
      ? await User.findOne({ email: normalizedEmail })
      : await findLocalUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (getDbStatus()) {
      user.resetOTP = otp;
      user.resetOTPExpires = otpExpires;
      await user.save();
    } else {
      const { updateUserFields } = require("../services/localStore");
      await updateUserFields(user._id, {
        resetOTP: otp,
        resetOTPExpires: otpExpires.toISOString()
      });
    }

    console.log(`🔑 [OTP GENERATED] Forgot Password OTP for ${normalizedEmail}: ${otp}`);

    // Send reset email
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Reset Your RepoLens Password",
        html: getResetTemplate(user.name ?? user?._doc?.name, otp)
      });
    } catch (err) {
      console.error("Failed to send forgot password email:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset OTP. Please check your email configuration or try again."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email."
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send reset password OTP"
    });
  }
}

async function verifyResetOTP(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = getDbStatus()
      ? await User.findOne({ email: normalizedEmail })
      : await findLocalUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const resetOtp = user.resetOTP ?? user?._doc?.resetOTP;
    const resetOtpExpires = user.resetOTPExpires ?? user?._doc?.resetOTPExpires;

    if (!resetOtp || resetOtp !== otp || new Date(resetOtpExpires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified. You can now reset your password."
    });
  } catch (error) {
    console.error("VERIFY RESET OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify reset OTP"
    });
  }
}

async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email, OTP and new password are required"
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = getDbStatus()
      ? await User.findOne({ email: normalizedEmail })
      : await findLocalUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const resetOtp = user.resetOTP ?? user?._doc?.resetOTP;
    const resetOtpExpires = user.resetOTPExpires ?? user?._doc?.resetOTPExpires;

    if (!resetOtp || resetOtp !== otp || new Date(resetOtpExpires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    if (getDbStatus()) {
      user.password = newPassword;
      user.resetOTP = undefined;
      user.resetOTPExpires = undefined;
      await user.save();
    } else {
      const { updateUserFields } = require("../services/localStore");
      await updateUserFields(user._id, {
        password: await bcrypt.hash(newPassword, 10),
        resetOTP: null,
        resetOTPExpires: null
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in."
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to reset password"
    });
  }
}

// Local helper wrapper
async function updateUserProfilePictureLocal(id, profilePicture) {
  const { updateUserProfilePicture } = require("../services/localStore");
  return await updateUserProfilePicture(id, profilePicture);
}

module.exports = {
  signupUser,
  loginUser,
  getProfile,
  updateProfilePicture,
  removeProfilePicture,
  verifyEmail,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword
};
