import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import User from '../models/user.js'

const protect = asyncHandler(async(req, res,next)=>{
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        try{
            //"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYTZlODdiZDBiYmIyZjNmOTBlNzFmYiIsImlhdCI6MTc4OTMyODA3OSwiZXhwIjoxNzg5NDE0NDc5fQ.j9Rr01xcqcUXhJQHJzvAl0MaJRPKAms4WpuLnZ8YDYs"
            token=req.headers.authorization.split(' ')[1];
            console.log("Token being verified:", token);
            const decoded=jwt.verify(token, process.env.JWT_SECRET);
            req.user=await User.findById(decoded.id).select("-password");
            if(!req.user){
                res.status(401);
                throw new Error('User not found');

            }
            return next();
        }catch(error){
            console.error("JWT Verification Error:",error.message);
            res.status(401);
            throw new Error("Not authorised, token failed.");
        }
    }
    if(!token){
        res.status(401)
        throw new Error("Not authorised, no token");
    }
})

export {protect};