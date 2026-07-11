const express=require("express")
const router=express.Router();
const {loginUser, signupUser, getProfile, updateProfilePicture, removeProfilePicture}=require('../controller/userControl')
const auth= require("../middleware/auth")
// public route
router.post("/signup", signupUser);
router.post("/login", loginUser);

// protected route
router.get("/profile", auth, getProfile);
router.put("/profile/picture", auth, updateProfilePicture);
router.delete("/profile/picture", auth, removeProfilePicture);

module.exports=router