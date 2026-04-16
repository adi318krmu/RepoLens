const {Schema, model}=require("mongoose")
const UserSchema= new Schema({
    name :{
        type: String,
        required: true,
        maxlength=50
    },
    email:{
        type:String,
        unique:true,
        required: true,
        maxlength:50,
        trim:true,
        lowercase:true
    },
    password:{
        type:String,
        required:true,
        maxlength:10
    },
    createdAt:{
        type:Date,
        default:Date.now
    }

})

const User=model("user", UserSchema);
module.exports={User}