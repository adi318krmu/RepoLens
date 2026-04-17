const jwt= require("jsonwebtoken")
const User= require("../model/userSchema")


const signupUser=async(req, res)=>{
    const { name, email, password } = req.body;

  try {
    const user = await User.create({ name, email, password });

    res.json({
      message: "User created",
      user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const loginUser=async(req,res)=>{
 const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getProfile=async(req,   res)=>{
 try {
    const user = await User.findById(req.user.id);

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports={signupUser, loginUser, getProfile}