const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../model/userSchema");
const authSecret = require("../utils/authSecret");
const { getDbStatus } = require("../model/dbConnect");
const {
  createUser: createLocalUser,
  findUserByEmail: findLocalUserByEmail,
  findUserById: findLocalUserById
} = require("../services/localStore");

function sanitizeUser(user) {
  const rawUser = user?._doc ?? user;
  if (!rawUser) return null;
  const { password, ...safeUser } = rawUser;
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
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    const user = getDbStatus()
      ? await User.create({ name, email: normalizedEmail, password })
      : await createLocalUser({
          name,
          email: normalizedEmail,
          password: await bcrypt.hash(password, 10)
        });
    const token = jwt.sign({ id: user._id }, authSecret, { expiresIn: "1d" });

    return res.status(201).json({
      success: true,
      message: "User created",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create account"
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

// Local helper wrapper
async function updateUserProfilePictureLocal(id, profilePicture) {
  const { updateUserProfilePicture } = require("../services/localStore");
  return await updateUserProfilePicture(id, profilePicture);
}

module.exports = { signupUser, loginUser, getProfile, updateProfilePicture, removeProfilePicture };
