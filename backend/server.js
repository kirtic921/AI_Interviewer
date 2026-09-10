import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import { notFound, errorHandler } from ".middleware/errorMiddleware.js"

dotenv.config();


connectDB();

const app = express();

const server = http.createServer(app);

const allowOrigin = [
    'http://localhost:3000',
    'http://localhost:5173',
]

const io = new Server(server, {
    cors : {
        origin : allowOrigin,
        methods : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials : true,
        allowedHeaders : ['Content-Type', 'Authorization'],
        
    }
})
