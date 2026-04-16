const express=require("express")
const Router=express.Router();
const {loginUser, signupUser}=require('../controller/userControl')
module.exports=Router