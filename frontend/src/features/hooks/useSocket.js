import { useEffect, useRef } from "react";
import {useDispatch, useSelector} from "react-redux";
import {socketUpdateSession} from "../features/sessions/sessionSlice";
import {useNavigate} from "react-router-dom";
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL.replace('/api', '');
//http://localhost:8000

const useSocket=()=>{
    const dispatch=useDispatch();
    const navigate =useNavigate();
    const socketRef = useRef(null);
    const {user}=useSelector((state)=>state.auth);

    useEffect(()=>{
        if(user && user._id){
            const socket=io(BACKEND_URL,{
                query:{userId:user._id},
                transports:['websocket'],
            });

            socketRef.current=socket;
            socket.on('connect', () => {
                console.log('Connected to socket.io server');
            })
            socket.on('disconnect', () => {
                console.log('Disconnected from socket.io server');
            })
            socket.on('sessionUpdate', (payload) => {
                console.log('Real-time session update', payload.status);
                dispatch(socketUpdateSession(payload));

                if(data.status==='QUESTIONS_READY'){
                navigate(`/interview/${payload.sessionId}`);
            }
            }); 
            
        return ()=>{
            socket.disconnect();
        };
    }
    },[user, dispatch , navigate]);

    return socketRef.current;
};

export default useSocket;