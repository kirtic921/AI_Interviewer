import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    password: {
        type:String,
        required:function(){
            return !this.googleId
        }
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true
    } , 
    preferredRole:{
        type:String,
        default:"MERN Stack Developer"
    },
},{
    timestamps:true
})

userSchema.pre("save", async function(){
    if(!this.isModified("password")){
        return ;
    }
    const salt=await bcrypt.gensalt(10)
    this.password=await bcrypt.hash(this.password,salt)
});

userSchema.methods.matchPassword=async function(enteredPassword){
    if(!this.password){
        return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
};

const User=mongoose.model("User", userSchema)
export default User