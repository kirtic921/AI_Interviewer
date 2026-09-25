import asyncHnadler from "express-async-handler";
import Session from "../models/SessionModel.js";
import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import mongoose from "mongoose";

const AI_SERVICE_URL="http://localhost:8000";

const pushSocketUpdate=(io,userId,sessionId,status,message,sessionData=null)=>{
    io.to(userId.toString()).emit("sessionUpdate",{
        sessionId,
        status,
        message,
        sessionData
    });
}

const createSession=asyncHnadler(async(req,res)=>{
    const {role, level, interviewType, count}=req.body;
    const userId=req.user._id;
    if(!role || !level || !interviewType || !count){
        res.status(400);
        throw new Error("Please fill all the fields");
    }
    let session=await Session.create({
        user:userId,
        role,
        level,
        interviewType,
        status:"pending",
    })

    const io=req.app.get("io")

    res.status(202).json({
        message:"Session created successfully",
        sessionId:session._id,
        status:"processing"
    });
    //IIFE->Immediately Invoked Function Expression
    (
        async()=>{
            try{
                pushSocketUpdate(io,userId,session._id,"ai generating questions...", `generating ${count} question for ${level} level ${role} rol;e interview...`);

                const aiResponse=await fetch(`${AI_SERVICE_URL}/generate-questions`,{
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        role,
                        level,
                        count
                    })
                });

                if(!aiResponse.ok){
                    const errorBody=await aiResponse.text();
                    throw new Error(`AI service error: ${aiResponse.status}-${errorBody}`);
                }
                const aiData=await aiResponse.json();
                const codingCount=interviewType==='coding-mix'?Math.floor(count*0.2):0;

                const questions=aiData.questions.map((qText,index)=>({
                    questionText:qText,
                    questionType:index<codingCount?"coding":"oral",
                    isEvaluated:false,
                    isSubmitted:false
                }));

                session.questions=questions;
                session.status="in-progress";
                await session.save();

                pushSocketUpdate(io,userId,session._id,"questions ready", "starting interview...");


            }catch(error){
                console.error(`Session creation failed:${error.message}`);
                session.status="failed";
                await session.save();
                pushSocketUpdate(io,userId,session._id,"failed",error.message); 
            }
        })();
});

const getSessions=asyncHandler(async(req,res)=>{
    const userId=req.user._id;
    const sessions=await Session.find({user:userId}.select("-questions"));
    res.status(200).json(sessions);
});

const getSessionById=asyncHandler(async(req,res)=>{
    const userId=req.user._id;
    const sessionId=req.params.id;
    const session=await Session.findOne({user:userId,_id:sessionId});
    if(!session){
        res.status(404);
        throw new Error("Session not found");
    }
    res.status(200).json(session);
})

const deleteSession=ayncHandler(async(req,res)=>{
    const userId=req.user._id;
    const sessionId=req.params.id;
    const session=await Session.findOne({user:userId,_id:sessionId});
    if(!session){
        res.status(404);
        throw new Error("Session not found"); 
    }
    await session.deleteOne();
    res.status(200).json({id:session._id,message:"Session deleted successfully"});
})

const calculateOverallScore = async (sessionId) => {
    const results=await Session.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(sessionId)
            }
        },
        {
            $unwind: "$questions"
        },
        {
            $group:{
                _id:'$_id',
                avgTechnical: {$avg:{$cond:[{$eq:['$questions.isEvaluated', true]}, '$questions.technicalScore', 0]}},
                avgConfidence:{$avg:{$cond:[{$eq:['$questions.isEvaluated', true]}, '$questions.confidenceScore',0]}},            
            }
        },
        {
            $project: {
                _id:0,
                overallScore:{$round:[{$avg:['$avgTechnical','$avgConfidence']}, 0]},
                avgTechnical: {$round: ["$avgTechnical",0]},
                avgConfidence: {$round: ["$avgConfidence", 0]}
            }
        }
    ]);
    return results[0] ||{overallScore:0, avgTechnical:0, avgConfidence:0};
}

const evaluateAnswerAsync=async(io,userId,sessionId,questionIdx,audioFilePath=null, codeSubmission=null)=>{
    // let transcription="";
    const questionIndex=typeof questionIdx==="string"?parseInt(questionIdx,10):questionIdx;


    const session=await Session.findById(sessionId);
    if(!session){
        pushSocketUpdate(io,userId,sessionId,"failed","Session not found");
        return;
    }
    const question=session.questions[questionIndex];
    if(!question){
        pushSocketUpdate(io,userId, sessionId, "failed", `Question not found ${questionIndex}`);
        return;
    }
    let transcription="";  
    if(audioFilePath){
        try{
            pushSocketUpdate(io,userId,sessionId,"AI_TRANSCRIBING", `Transcribing question ${questionIndexx+1}...`);
            const formData=new FormData();
            formData.append("file", fs.createReadStream(audioFilePath));
            const transResponse=await fetch(`${AI_SERVICE_URL}/transcribe`, {
                method: "POST",
                body: formData,
                headers:formData.getHeaders()
            });
            if(!transResponse.ok){
                const errorBody=await transResponse.json();
                throw new Error(`AI service error:${transResponse.status} - ${errorBody}`);
            }
            const transData=await transResponse.json();
            transcription=transData.transcription || "";
        }
        catch(error){
            console.error(`Transcription failed: $(error.message)`);
            
        }
        finally{
            if(audioFilePath && fs.existsSync(audioFilePath)){
                fs.unlinkSync(audioFilePath); 
            }
        }

        try{
            pushSocketUpdate(io, userId, sessionId, "AI_EVALUATING", `Evaluating question ${questionIndex+1}....`);

            const evalResponse=await fetch(`${AI_SERVICE_URL}/evaluate`,{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    question:question.questionText, 
                    question_Type: question.questionType,
                    role:session.role,    
                    level:session.level,
                    user_answer:transcription,
                    user_code: code || ""           
                })
            });
            if(!evalResponse.ok){
                const errorBody=await evalResponse.text();
                throw new Error(`AI service error: ${evalResponse.status}-${errorBody}`);
            }
            const evalData=await evalResponse.json();
            question.isEvaluated=true;

            question.userAnswerText=transcription;
            question.userSubmittedCode=code || "";
            question.idealAnswer=evalData.idealAnswer;
            question.aiFeedback=evalData.aiFeedback;
            question.technicalScore=evalData.technicalScore;
            question.confidenceScore=evalData.confidenceScore;
            question.isEvaluated=true;

            const allQuestionsEvaluated=session.questions.every(q=>q.isEvaluated);


            if(session.status==="completed" || allQuestionsEvaluated){
                const scoreSummary=await calculateOverallScore(sessionId);
                session.overallScore=scoreSummary.overallScore || 0;
                session.metrics={
                    avgTechnical:scoreSummary.avgTechnical,
                    avgConfidence:scoreSummary.avgConfidence
                };
                if(allQuestionsEvaluated){
                session.status="completed";
                session.endTime=session.endTime || new Date();
            } 
            await session.save();
            pushSocketUpdate(io, userId, sessionId, "session_completed", `Scores finalised`, session);
            }
            else{
                await session.save();
                pushSocketUpdate(io, userId, sessionId, "Evaluation_completed", `Feedback for question ${questionIndex+1} is ready`, session);
            }
        }
        catch(error){
            console.error(`Evaluation failed: ${error.message}`);
            pushSocketUpdate(io,userId, sessionId, "evaluation failed", error.message, session);
        }
    }
}

const submitAnswer=asyncHandler(async(req,res)=>{
    const userId=req.user._id;
    const sessionId=req.params.id;
    const {questionIndex, code}=req.body;
    const session=await Session.findById(sessionId);

    if(!session || session.user.toString()!==userId.toString()){
        res.status(404);
        throw new Error("Session not found or user unauthorised ");
    }
    const questionIdx=parseInt(questionIndex,10);
    const question=session.questions[questionIdx];
    if(!question){
        res.status(404);
        throw new Error(`Question not found at index ${questionIndex}`);
    }
    let audioFilePath=null;
    if(req.file){
        audioFilePath=path.join(process.cwd(),req.file.path);
    }

    const codeSubmission=code || null

    question.isSubmitted=true;
    await session.save();
    res.status(200).json({message:"Answer submitted successfully. Please wait for the result.",status:"Recieved"});

    const io=req.app.get("io");

    evaluateAnswerAsync(io,userId,sessionId,questionIdx, audioFilePath, codeSubmission);
})

const endSession=asyncHnadler(async(req,res)=>{
    const userId=req.user._id;
    const sessionId=req.params.id;
    const session=await Session.findById(sessionId);
    if(!session || session.user.toString()!==userId.toString()){
        res.status(404);
        throw new Error("Session not found or user unauthorised");
    }
    const isProcessing=session.questions.some(q=>q.isSubmitted && !q.isEvaluated);
    if(isProcessing){
        res.status(400);
        throw new Error("Ai is still processing, please wait before ending the session");
    }
    if(session.status==="completed"){
        res.status(400);
        throw new Error("Session already ended");
    }
    const scoreSummary=await calculateOverallScore(SessionId);
    session.overallScore=scoreSummary.overallScore || 0;
    session.metrics={
        avgTechnicalScore:scoreSummary.avgTechnicalScore,
        avgConfidenceScore:scoreSummary.avgConfidenceScore
    }
    session.status="completed";
    await session.save();
    const io=req.app.get("io")
    pushSocketUpdate(io,userId, sessionId, "session_completed", "Interview ended early", session);
    res.status(200).json({message:"Session ended successfully", session});
})

export { createSession, submitAnswer, endSession, getSessions, getSessionById, deleteSession};

