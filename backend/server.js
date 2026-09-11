import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
// import userRoutes from "./routes/userRoutes.js";
// import sessionRoutes from "./routes/sessionRoutes.js";
// import { notFound, errorHandler } from ".middleware/errorMiddleware.js"

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

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (allowedOrigin.includes(origin)) { callback(null, true)}
        else {
            if (process.en.NODE_ENV === 'production') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    methods : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials : true,
    allowedHeaders : ['Content-Type', 'Authorization', "X-Requested-With"],
}))

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.set("io", io);

app.get("/", (req, res) => {
    res.send("API is running");
});

// app.use("/api/users", userRoutes);
// app.use("/api/sessions", sessionRoutes);

io.on("connection", (socket)=> {
    console.log(`A user is connected ${socket.id}`);
    const userId = socket.handshake.query.userId;
    if(userId){

        socket.join(userId);
        console.log(`User ${socket.id} joined room: ${userId}`);
    }
    socket.on("disconnect", ()=> {
        console.log(`User disconnected ${socket.id}`);
    });
});

// app.use(notFound);
// app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
