// // const jwt= require("jsonwebtoken")
// // const User= require("../model/userSchema")


// // const signupUser=async(req, res)=>{
// //     const { name, email, password } = req.body;

// //   try {
// //     const user = await User.create({ name, email, password });

// //     res.json({
// //       message: "User created",
// //       user
// //     });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // }

// // const loginUser=async(req,res)=>{
// //  const { email, password } = req.body;

// //   try {
// //     const user = await User.findOne({ email, password });

// //     if (!user) {
// //       return res.status(400).json({ message: "Invalid credentials" });
// //     }

// //     const token = jwt.sign(
// //       { id: user._id },
// //       process.env.JWT_SECRET,
// //       { expiresIn: "1d" }
// //     );

// //     res.json({ token });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // }

// // const getProfile=async(req,   res)=>{
// //  try {
// //     const user = await User.findById(req.user.id);

// //     res.json(user);
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // }

// // module.exports={signupUser, loginUser, getProfile}
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const User = require("../model/userSchema");


// // 🔐 SIGNUP
// const signupUser = async (req, res) => {
//   const { name, email, password } = req.body;

//   // 🔥 VALIDATION
//   if (!name || !email || !password) {
//     return res.status(400).json({
//       success: false,
//       message: "All fields are required"
//     });
//   }

//   if (password.length < 6) {
//     return res.status(400).json({
//       success: false,
//       message: "Password must be at least 6 characters"
//     });
//   }

//   try {
//     const user = await User.create({ name, email, password });

//     const { password: _, ...safeUser } = user._doc;

//     res.json({
//       success: true,
//       message: "User created",
//       user: safeUser
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// // 🔐 LOGIN (FIXED)
// const loginUser = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // ✅ find by email only
//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     // ✅ compare hashed password
//     const isMatch = await bcrypt.compare(password, user.password);

//     if (!isMatch) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid credentials"
//       });
//     }

//     // ✅ token generate
//     const token = jwt.sign(
//       { id: user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     // 🔥 remove password
//     const { password: _, ...safeUser } = user._doc;

//     res.json({
//       success: true,
//       token,
//       user: safeUser
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// // 🔐 PROFILE
// const getProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("-password");

//     res.json({
//       success: true,
//       user
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// module.exports = { signupUser, loginUser, getProfile };
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../model/userSchema");


// 🔐 SIGNUP
const signupUser = async (req, res) => {
  const { name, email, password } = req.body;

  // 🔥 VALIDATION
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
    // 🔥 check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    const user = await User.create({ name, email, password });

    // 🔥 remove password
    const { password: _, ...safeUser } = user._doc;

    res.status(201).json({
      success: true,
      message: "User created",
      user: safeUser
    });

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// 🔐 LOGIN (CORRECTED)
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 🔥 VALIDATION
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  try {
    // 🔥 find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    // 🔥 compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // 🔥 generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 🔥 remove password
    const { password: _, ...safeUser } = user._doc;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// 🔐 PROFILE
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


module.exports = { signupUser, loginUser, getProfile };