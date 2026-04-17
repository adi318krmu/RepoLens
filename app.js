const express= require("express")
const app=express()
const dotenv= require("dotenv")
dotenv.config()
const PORT=process.env.PORT ??3000
 const connecDB= require("./model/dbConnect")
 connecDB();

 app.use(express.json());
const userRoute=require('./router/userRoute')

app.use('/auth',userRoute)
app.get('/',(req, res)=>{
    res.send("hello guys")
})
app.listen(PORT, () => {
    console.log("------- Server Started --------");
});
