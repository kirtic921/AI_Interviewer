# AI Interviewer

an AI powered mock interview platform that generates interview questions, accepts text and voice-based answers, and evaluates responses using AI

## Tech Stack

- **Frontend:** React, Vite, Redux Toolkit, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **AI Service:** Python, FastAPI
- **LLM:** Ollama (Mistral)
- **Speech-to-Text:** OpenAI Whisper
- **Real-Time Communication:** Socket.IO
- **Authentication:** JWT

## Features

- AI generated interview questions
- text, audio, and code-based answer submission
- voice transcription using Whisper
- AI based answer evaluation and feedback
- technical and confidence scoring
- real time interview status updates using Socket.IO
- interview session management
- MongoDB based session and result storage



The application uses a microservices architecture. The React frontend communicates with the Node.js/Express backend, which manages authentication, interview sessions, and database operations. The backend communicates with a Python FastAPI service for question generation, audio transcription, and AI-powered answer evaluation.

#### 💭 The Idea Behind It

Interviews can be intimidating, but getting better at them shouldn't be. AI Interviewer is my attempt to make interview practice more interactive by combining AI generated questions, voice-based responses, and instant feedback in one place.



⭐ Curious to see it in action? Give the repo a star and try it yourself!
