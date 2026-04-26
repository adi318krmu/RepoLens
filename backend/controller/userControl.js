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

    return res.status(201).json({
      success: true,
      message: "User created",
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

module.exports = { signupUser, loginUser, getProfile };
