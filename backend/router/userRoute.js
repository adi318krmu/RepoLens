const express=require("express")
const router=express.Router();
const {
  loginUser,
  signupUser,
  getProfile,
  updateProfilePicture,
  removeProfilePicture,
  verifyEmail,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword
}=require('../controller/userControl')
const auth= require("../middleware/auth")

// public routes
router.post("/signup", signupUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOTP);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// protected route
router.get("/profile", auth, getProfile);
router.put("/profile/picture", auth, updateProfilePicture);
router.delete("/profile/picture", auth, removeProfilePicture);

module.exports=router