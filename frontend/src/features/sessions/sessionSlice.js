import {createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

const API_URL=`${import.meta.env.VITE_API_URL}/sessions/`;

const api=axios.create({
    baseURL:API_URL
})
api.interceptors.request.use((request)=> {
    const user=JSON.parse(localStorage.getItem('user'));
    if(user && user.token){
        request.headers.Authorization=`Bearer ${user.token}`
    }
    return request
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if(error.response.status===401){
            localStorage.removeItem('user');
            window.location.href='/login';
        }
        return Promise.reject(error)
    }
)

const initialState={
    sessions:[],
    activeSession:null,
    isError:false,
    isGenerating : false,
    isLoading:false,
    message:''
}

export const getSessions=createAsyncThunk('sessions/getAll', async(__DO_NOT_USE__ActionTypes,thunkAPI)=>{
    try {
        const response= await api.get('/');
        return response.data;
    } catch (error) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
})

export const createSession=createAsyncThunk('sessions/create', async(sessionData, thunkAPI)=>{
    try {
        const response=await api.post('/', sessionData);
        return response.data;
    }catch(error) {
        const message=(error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
})

export const getSessionById=createAsyncThunk('sessions/getOne', async(sessionId,thunkAPI)=>{
    try {
        const response=await api.get(`${sessionId}`);
        return response.data;
    } catch (error) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
})

export const deleteSession=createAsyncThunk('sessions/delete', async(sessionId, thunkAPI)=>{
    try{
        await api.delete(`/${sessionId}`);
        return sessionId;
    } catch(error){
        const message=(error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
})

export const submitAnswer=createAsyncThunk('sessions/submitAnswer', async({sessionId, formData}, thunkAPI)=>{
    try{
        const response=await api.post(`/${sessionId}/submit-answer`, answer);
        return response.data;
    }catch(error){
        const message=(error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
})


export const endSession=createAsyncThunk('sessions/endSession', async(sessionId, thunkAPI)=>{
    try{
        const response =await api.post('/${sessionId}/end');
        return response.data;
    }
    catch(error){
        const message=(error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
})


export const sessionSlice=createSlice({
    name:'sessions',
    initialState,
    reducers:{
        reset:(state)=>{
            state.isError=false;
            state.message=' ';
            state.isLoading=false;
            state.isGenerating=false;
        },
        socketUpdateSession:(state, action)=>{
            const {sessionId, status, message, session,}=action.payload;
            state.message=message;
            if (
                status==='QUESTIONS_READY' ||
                status ==='GENERATION_FAILED'
            ) {
                state.isGenerating=false;
            }
            if(!session && state.activeSession && state.activeSession._id===sessionId){
                const qMatch=message.match(/Q(\d+)/);
                if(qMatch){
                    const qIdx=parseInt(qMatch[1])-1;
                    if(status.includes('AI_')){
                        state.activeSession.questions[qIdx].isSubmitted=true;
                    }
                }
            }
            
            if(session){
                if(state.activeSession && state.activeSession._id===sessionId){
                    state.activeSession=session;
                }
                const index=state.sessions.findIndex(s=>s._id===sessionId);
                if(index!==-1){
                    state.sessions[index]=session;
                }
                else if(status==='QUESTIONS_READY' || status==='SESSION_COMPLETED'){
                    state.sessions.unshift(session);
                }
            }
        },
        setActiveSession:(state,action)=>{
            state.activeSession=action.payload;
        }
    },
    extraReducers:(builder)=>{
        builder
        .addCase(getSessions.pending, (state)=>{
            state.isLoading=true;
        })
        .addCase(getSessions.fulfilled, (state,action)=>{
            state.isLoading=false;
            
            state.sessions=action.payload;
        })
        .addCase(getSessions.rejected, (state,action)=>{
            state.isLoading=false;
            state.isError=true;
            state.message=action.payload;
            state.sessions=[];
        })
        .addCase(createSession.pending, (state)=>{
            state.isLoading=true;
            state.activeSession=null;
        })
        .addCase(createSession.fulfilled, (state,action)=>{
            state.isLoading=false;
            state.message=action.payload.message;
        })
        .addCase(createSession.rejected, (state, action) => {
            state.isLoading=false;
            state.isError=true;
            state.message=action.payload;
        })
        .addCase(getSessionById.fulfilled, (state, action)=>{
            state.activeSession=action.payload;
        })
        .addCase(deleteSession.fulfilled, (state, action)=>{
            state.isLoading=false;
            state.message=action.payload;
            state.sessions=state.sessions.filter(s=>s._id !== action.payload);
        })
        .addCase(deleteSession.rejected, (state, action)=>{
            state.isLoading=false;
            state.isError=true;
            state.message=action.payload;
        })
    }
})


export const { reset, socketUpdateSession, setActiveSession } = sessionSlice.actions;
export default sessionSlice.reducer;


