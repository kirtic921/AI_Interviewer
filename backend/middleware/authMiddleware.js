import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import User from '..models/user.js'

const protect = asyncHandler(async(req, res,next)=>{
    let token;
    if(req.headers.authorization && req.headers.authorisation.startsWidth('Bearer')){
        try{
            //'Bearer dhjsdhwdskck.....'
            token=req.headers.authorization.split(' ')
            const decode=jwt.verify(token, process.env.JWT_SECRET);
            req.user=await User.findById(decoded.id).select("-password");
            if(!req.user){
                res.status(401);
                throw new Error('User not found');

            }
            next();
        }catch(error){
            console.error(error);
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