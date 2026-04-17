const express=require("express")
const router=express.Router();
const {loginUser, signupUser, getProfile}=require('../controller/userControl')
const auth= require("../middleware/auth")
// public route
router.post("/signup", signupUser);
router.post("/login", loginUser);

// protected route
router.get("/profile", auth, getProfile);
module.exports=router