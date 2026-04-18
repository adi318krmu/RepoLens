// 
const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  email: {
    type: String,
    unique: true,
    required: true,
    maxlength: 50,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
    // ❌ remove maxlength
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


// 🔥 HASH PASSWORD BEFORE SAVING
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});


// 🔥 ADD METHOD FOR COMPARISON
UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};


const User = model("User", UserSchema);
module.exports = User;