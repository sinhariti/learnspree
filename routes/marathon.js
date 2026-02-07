const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const DailyPlan = require('../models/DailyPlan');
const Performance = require('../models/Performance');
const { generateInitialPlan } = require('../agents/plannerAgent');
const { generateQuiz } = require('../agents/quizGenerator');
const { scoreQuiz, analyzePerformance } = require('../agents/performanceAnalyzer');
const { savePerformance } = require('../utils/performanceStorage');
const { reflectAndReschedule } = require('../agents/reflectionAgent');
const { runDailyCheck } = require('../jobs/dailyRunner');

/**
 * POST /api/start-marathon
 * Starts a new study marathon or updates an existing one.
 */
router.post('/start-marathon', async (req, res) => {
  try {
    const { examName, totalDays, hoursPerDay, syllabus } = req.body;

    if (!examName || !totalDays || !hoursPerDay || !syllabus) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const studentId = "demo_student"; // Simplified for now

    const student = await Student.findOneAndUpdate(
      { studentId },
      { examName, totalDays, hoursPerDay, syllabus, currentDay: 1 },
      { upsert: true, new: true }
    );

    console.log(`Starting marathon for student: ${studentId}`);
    await generateInitialPlan(student);

    res.json({ success: true, message: "Marathon started", studentId });
  } catch (error) {
    console.error("Error in /start-marathon:", error);
    res.status(500).json({ success: false, error: "Failed to start marathon" });
  }
});

/**
 * GET /api/today
 * Gets the current day's study plan.
 */
router.get('/today', async (req, res) => {
  try {
    const studentId = req.query.studentId || "demo_student";
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const plan = await DailyPlan.findOne({ studentId, day: student.currentDay });

    if (!plan) {
      return res.status(404).json({ success: false, error: "Plan not found for today" });
    }

    res.json({
      day: plan.day,
      date: plan.date,
      topics: plan.topics,
      tasks: plan.tasks,
      aiReasoning: plan.aiReasoning
    });
  } catch (error) {
    console.error("Error in /today:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/quiz/:topic
 * Generates an MCQ quiz for a topic.
 */
router.get('/quiz/:topic', async (req, res) => {
  try {
    const topic = decodeURIComponent(req.params.topic);
    const difficulty = req.query.difficulty || "medium";
    const numQuestions = parseInt(req.query.questions) || 5;

    const quiz = await generateQuiz(topic, difficulty, numQuestions);
    res.json(quiz);
  } catch (error) {
    console.error("Error in /quiz:", error);
    res.status(500).json({ success: false, error: "Failed to generate quiz" });
  }
});

/**
 * POST /api/submit-quiz
 * Submits quiz answers and records performance.
 */
router.post('/submit-quiz', async (req, res) => {
  try {
    const { studentId, day, topic, quizData, userAnswers, timeSpent } = req.body;

    if (!studentId || !day || !topic || !quizData || !userAnswers || !timeSpent) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const scoringResults = scoreQuiz(quizData, userAnswers);

    // Extract mistakes (topics of incorrect questions)
    const mistakes = scoringResults.incorrectQuestions.map(q => q.question); // Using question text as mistake context

    await savePerformance(
      studentId,
      day,
      topic,
      scoringResults.score,
      timeSpent,
      mistakes
    );

    res.json(scoringResults);
  } catch (error) {
    console.error("Error in /submit-quiz:", error);
    res.status(500).json({ success: false, error: "Failed to submit quiz" });
  }
});

/**
 * GET /api/performance
 * Gets performance records for a student.
 */
router.get('/performance', async (req, res) => {
  try {
    const studentId = req.query.studentId || "demo_student";
    const days = parseInt(req.query.days) || 7;

    const records = await Performance.find({ studentId })
      .sort({ completedAt: -1 })
      .limit(days * 5); // Assuming few entries per day

    res.json(records);
  } catch (error) {
    console.error("Error in /performance:", error);
    res.status(500).json({ success: false, error: "Failed to fetch performance" });
  }
});

/**
 * POST /api/reflect
 * Triggers the reflection agent for a student.
 */
router.post('/reflect', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ success: false, error: "studentId is required" });

    const result = await reflectAndReschedule(studentId);
    res.json(result);
  } catch (error) {
    console.error("Error in /reflect:", error);
    res.status(500).json({ success: false, error: "Reflection failed" });
  }
});

/**
 * GET /api/schedule
 * Gets the schedule for a range of days.
 */
router.get('/schedule', async (req, res) => {
  try {
    const studentId = req.query.studentId || "demo_student";
    const from = parseInt(req.query.from) || 1;
    const to = parseInt(req.query.to) || 30;

    const plans = await DailyPlan.find({
      studentId,
      day: { $gte: from, $lte: to }
    }).sort({ day: 1 });

    res.json(plans);
  } catch (error) {
    console.error("Error in /schedule:", error);
    res.status(500).json({ success: false, error: "Failed to fetch schedule" });
  }
});

/**
 * POST /api/fast-forward
 * Increments the current day and triggers reflection (FOR DEMO).
 */
router.post('/fast-forward', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ success: false, error: "studentId is required" });

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });

    student.currentDay += 1;
    await student.save();

    const analysis = await reflectAndReschedule(studentId);

    res.json({ newDay: student.currentDay, analysis });
  } catch (error) {
    console.error("Error in /fast-forward:", error);
    res.status(500).json({ success: false, error: "Fast-forward failed" });
  }
});
/**
 * POST /api/run-daily-check
 * Manually triggers the autonomous daily process.
 */
router.post('/run-daily-check', async (req, res) => {
  try {
    const result = await runDailyCheck();
    res.json(result);
  } catch (error) {
    console.error("Error in /run-daily-check:", error);
    res.status(500).json({ success: false, error: "Daily check failed" });
  }
});

// ==========================================
// STUDY GROUP ORCHESTRATOR ENDPOINTS
// ==========================================

const StudyGroupOrchestrator = require('../agents/orchestrator');
const AgentConversation = require('../models/AgentConversation');

/**
 * POST /api/study-group/chat
 * Main endpoint for interacting with the AI study group.
 * Orchestrator selects the best agent based on context.
 */
router.post('/study-group/chat', async (req, res) => {
  try {
    const { studentId, message, sessionId, topic } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "Message is required" });
    }

    const orchestrator = new StudyGroupOrchestrator(studentId || 'demo_student');
    const response = await orchestrator.processStudentInput(message, {
      sessionId: sessionId || `session_${Date.now()}`,
      topic
    });

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error("Error in /study-group/chat:", error);
    res.status(500).json({ success: false, error: "Chat processing failed", details: error.message });
  }
});

/**
 * GET /api/study-group/session/:sessionId
 * Get conversation history for a session.
 */
router.get('/study-group/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await AgentConversation.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    res.json({
      success: true,
      sessionId: session.sessionId,
      studentId: session.studentId,
      topic: session.topic,
      status: session.status,
      activeAgent: session.activeAgent,
      messages: session.messages,
      handoffs: session.handoffs,
      metrics: session.sessionMetrics,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    });
  } catch (error) {
    console.error("Error in /study-group/session:", error);
    res.status(500).json({ success: false, error: "Failed to fetch session" });
  }
});

/**
 * POST /api/study-group/trigger/:agentType
 * Manually trigger a specific agent (useful for demos).
 */
router.post('/study-group/trigger/:agentType', async (req, res) => {
  try {
    const { agentType } = req.params;
    const { studentId, topic, sessionId } = req.body;

    const validAgents = ['quizmaster', 'explainer', 'advocate', 'motivator'];
    if (!validAgents.includes(agentType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid agent type. Must be one of: ${validAgents.join(', ')}`
      });
    }

    const orchestrator = new StudyGroupOrchestrator(studentId || 'demo_student');
    const response = await orchestrator.triggerAgent(agentType, {
      topic,
      sessionId: sessionId || `demo_${Date.now()}`
    });

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error("Error in /study-group/trigger:", error);
    res.status(500).json({ success: false, error: "Agent trigger failed", details: error.message });
  }
});

/**
 * GET /api/study-group/sessions
 * Get all sessions for a student.
 */
router.get('/study-group/sessions', async (req, res) => {
  try {
    const studentId = req.query.studentId || 'demo_student';
    const limit = parseInt(req.query.limit) || 10;

    const sessions = await AgentConversation.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('sessionId topic status activeAgent sessionMetrics createdAt');

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error("Error in /study-group/sessions:", error);
    res.status(500).json({ success: false, error: "Failed to fetch sessions" });
  }
});

/**
 * POST /api/study-group/handoff
 * Manually execute a handoff between agents.
 */
router.post('/study-group/handoff', async (req, res) => {
  try {
    const { studentId, sessionId, toAgent, reason } = req.body;

    if (!sessionId || !toAgent) {
      return res.status(400).json({ success: false, error: "sessionId and toAgent are required" });
    }

    const orchestrator = new StudyGroupOrchestrator(studentId || 'demo_student');
    await orchestrator.initSession(sessionId);

    const result = await orchestrator.executeHandoff(toAgent, { reason });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error in /study-group/handoff:", error);
    res.status(500).json({ success: false, error: "Handoff failed", details: error.message });
  }
});

/**
 * POST /api/study-group/score-answer
 * Score a quiz answer and trigger automatic handoff if high performance.
 * Returns thinking steps for UI animation.
 */
router.post('/study-group/score-answer', async (req, res) => {
  try {
    const { studentId, sessionId, question, studentAnswer, correctAnswer, topic } = req.body;

    if (!sessionId || !question || !studentAnswer) {
      return res.status(400).json({
        success: false,
        error: "sessionId, question, and studentAnswer are required"
      });
    }

    const orchestrator = new StudyGroupOrchestrator(studentId || 'demo_student');
    const result = await orchestrator.scoreQuizAnswer(question, studentAnswer, correctAnswer, {
      sessionId,
      topic
    });

    res.json({
      success: true,
      ...result,
      thinkingSteps: result.autoHandoff?.thinking || null
    });
  } catch (error) {
    console.error("Error in /study-group/score-answer:", error);
    res.status(500).json({ success: false, error: "Scoring failed", details: error.message });
  }
});

/**
 * GET /api/study-group/mastery/:sessionId
 * Get topic mastery progress for a session.
 */
router.get('/study-group/mastery/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.query.studentId || 'demo_student';

    const orchestrator = new StudyGroupOrchestrator(studentId);
    await orchestrator.initSession(sessionId);

    const masteryData = orchestrator.calculateTopicMastery();

    res.json({
      success: true,
      sessionId,
      topic: orchestrator.currentSession?.topic,
      ...masteryData
    });
  } catch (error) {
    console.error("Error in /study-group/mastery:", error);
    res.status(500).json({ success: false, error: "Failed to get mastery data" });
  }
});

module.exports = router;
