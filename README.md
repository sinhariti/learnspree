# 📚 Study Marathon Agent - API Documentation

> Autonomous AI study planner that adapts to student performance without supervision

**Tech Stack:** Node.js, Express, MongoDB, Google Gemini AI

---

## 🚀 Quick Start
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your Gemini API key

# Seed demo data
npm run seed

# Start server
npm run dev
```

Server runs at `http://localhost:5000`

---

## 🔑 Environment Variables

Create `.env` file:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/study-marathon
# Or Atlas: mongodb+srv://<user>:<pass>@cluster.mongodb.net/study-marathon

# Gemini API (get from: https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_api_key_here

# Optional
GEMINI_MODEL_THINKING=gemini-2.0-flash-thinking-exp-1219
GEMINI_MODEL_STANDARD=gemini-1.5-pro

| Variable             | Required | Description                               |
|----------------------|----------|------------------------------------------ |
| `GEMINI_API_KEY`     | ✅       | Google Gemini API key                     |
| `MONGODB_URI`        | ✅       | MongoDB connection string                 |
| `PORT`               | ❌       | Server port (default: 5000)               |
| `DAILY_CRON_SCHEDULE`| ❌       | Cron for auto-checks (default: 6 AM daily)|
```
---

## 📡 API Routes

**Base URL:** `http://localhost:5000/api`

### 1. **Start Marathon**
```http
POST /api/start-marathon
Content-Type: application/json

{
  "examName": "GATE CSE 2026",
  "totalDays": 30,
  "hoursPerDay": 3,
  "syllabus": ["Operating Systems", "DBMS", "Networks"]
}
```

**Response:** `{ success: true, studentId: "demo_student" }`

---

### 2. **Get Today's Plan**
```http
GET /api/today?studentId=demo_student
```

**Response:**
```json
{
  "day": 8,
  "topics": ["DBMS - Normalization"],
  "tasks": [
    { "topic": "DBMS", "type": "quiz", "duration": 30, "status": "pending" }
  ],
  "aiReasoning": "Increasing DBMS practice due to low scores"
}
```

---

### 3. **Generate Quiz**
```http
GET /api/quiz/Operating%20Systems?difficulty=medium&questions=5
```

**Response:**
```json
{
  "quiz": {
    "topic": "Operating Systems",
    "questions": [
      {
        "id": 1,
        "question": "What causes deadlock?",
        "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
        "correctAnswer": "B",
        "explanation": "..."
      }
    ]
  }
}
```

---

### 4. **Submit Quiz**
```http
POST /api/submit-quiz
Content-Type: application/json

{
  "studentId": "demo_student",
  "day": 8,
  "topic": "DBMS",
  "quizData": { ... },
  "userAnswers": { "1": "B", "2": "A" },
  "timeSpent": 25
}
```

**Response:**
```json
{
  "score": 66.67,
  "totalQuestions": 3,
  "correctAnswers": 2,
  "incorrectQuestions": [ ... ]
}
```

---

### 5. **Get Performance**
```http
GET /api/performance?studentId=demo_student&days=7
```

**Response:** Array of performance records with scores, topics, and mistakes

---

### 6. **Trigger Reflection** 🧠
```http
POST /api/reflect
Content-Type: application/json

{ "studentId": "demo_student" }
```

**Response:**
```json
{
  "analysis": {
    "weakTopics": ["DBMS"],
    "strongTopics": ["OS"],
    "reasoning": "Student scored 40-55% on DBMS, adjusting schedule..."
  },
  "adjustments": [
    {
      "day": 9,
      "changes": [
        { "action": "add", "task": {...}, "reason": "Low DBMS scores" }
      ]
    }
  ]
}
```

---

### 7. **Get Schedule**
```http
GET /api/schedule?studentId=demo_student&from=1&to=10
```

**Response:** Array of daily plans with tasks and AI reasoning

---

### 8. **Fast Forward** (Demo Only)
```http
POST /api/fast-forward
Content-Type: application/json

{ "studentId": "demo_student" }
```

**Response:** `{ newDay: 9, reflection: {...} }`

---

### 9. **Health Check**
```http
GET /health
```

**Response:** `{ status: "ok", mongodb: "connected" }`

---

## 🔄 Typical Flow
```
1. POST /start-marathon  →  AI generates 30-day plan
2. GET /today           →  Get daily tasks
3. GET /quiz/:topic     →  Generate quiz
4. POST /submit-quiz    →  Save performance
5. POST /reflect        →  AI adjusts schedule (after day 3)
6. Repeat steps 2-5     →  Continuous adaptation
```

---

## 🧪 Quick Test
```bash
# Start marathon
curl -X POST http://localhost:5000/api/start-marathon \
  -H "Content-Type: application/json" \
  -d '{"examName":"GATE 2026","totalDays":30,"hoursPerDay":3,"syllabus":["OS","DBMS"]}'

# Get today's plan
curl http://localhost:5000/api/today

# Trigger reflection
curl -X POST http://localhost:5000/api/reflect \
  -H "Content-Type: application/json" \
  -d '{"studentId":"demo_student"}'
```

---

## 🎯 Demo Script (3 minutes)
```bash
# 1. Seed demo data (Day 8, DBMS weak)
npm run seed

# 2. Show today's plan
curl http://localhost:5000/api/today
# 👉 Agent says: "Increasing DBMS practice"

# 3. Show performance
curl "http://localhost:5000/api/performance?days=7"
# 👉 DBMS: 40-55%, OS: 85%+

# 4. Trigger reflection
curl -X POST http://localhost:5000/api/reflect \
  -H "Content-Type: application/json" \
  -d '{"studentId":"demo_student"}'
# 👉 AI identifies weakness, adjusts Days 9-15

# 5. Show updated schedule
curl "http://localhost:5000/api/schedule?from=9&to=12"
# 👉 MORE DBMS tasks, LESS OS
```

**Key Point:** *"Agent autonomously adapts for 30 days using Gemini's extended thinking"*

---

## 📂 Project Structure
```
├── server.js              # Express entry point
├── .env                   # Config (don't commit!)
├── models/               
│   ├── Student.js        # Student schema
│   ├── DailyPlan.js      # Daily tasks
│   └── Performance.js    # Quiz scores
├── routes/
│   └── marathon.js       # All API endpoints
├── agents/
│   ├── plannerAgent.js   # 30-day schedule generator
│   ├── quizGenerator.js  # MCQ creator
│   └── reflectionAgent.js # 🧠 Self-correction logic
├── utils/
│   └── gemini.js         # Gemini API wrapper
└── jobs/
    └── dailyRunner.js    # Cron for auto-checks
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Start MongoDB: `mongod` or use Atlas |
| Gemini 429 error | Rate limit hit, wait 60s |
| Invalid JSON from Gemini | Code retries once automatically |
| Reflection not working | Need ≥3 days of performance data |

---

## 🏆 Key Features

- **30-Day AI Planning** - Gemini analyzes entire syllabus
- **Auto Quiz Generation** - Exam-realistic MCQs
- **Performance Tracking** - Identifies mistake patterns
- **Self-Correction** - Adjusts schedule based on weaknesses
- **Autonomous** - Runs for 30 days via cron

---

## 📝 Scripts
```bash
npm run dev    # Start with nodemon
npm run seed   # Load demo data
npm test       # Run integration tests
```

---

**Built for Gemini AI Hackathon 2026** 🚀