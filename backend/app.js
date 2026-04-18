const express= require("express")
const app=express()
const dotenv= require("dotenv")
dotenv.config()
const PORT=process.env.PORT ??3000
 const connecDB= require("./model/dbConnect")
 connecDB();

 app.use(express.json());
 const rateLimit = require("express-rate-limit");

// 🔥 LIMIT: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try later"
  }
});

// 🔥 APPLY TO ALL ROUTES
app.use(limiter);
const userRoute=require('./router/userRoute')

const analysisRoute=require('./router/analysisRoutes')
app.use('/api/analysis',analysisRoute)

app.use('/auth',userRoute)
app.get('/',(req, res)=>{
    res.send("hello guys")
})
app.listen(PORT, () => {
    console.log("------- Server Started --------");
});
