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

module.exports = router;
