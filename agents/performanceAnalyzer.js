const Performance = require('../models/Performance');
const { generateContent } = require('../utils/gemini');

/**
 * Scores a quiz based on user answers.
 * @param {Object} quizData - The quiz object from quizGenerator.
 * @param {Object} userAnswers - User's answers (e.g., {"1": "B", "2": "A"}).
 * @returns {Object} - Scoring results.
 */
function scoreQuiz(quizData, userAnswers) {
  const questions = quizData.questions;
  let correctCount = 0;
  const incorrectQuestions = [];

  questions.forEach(q => {
    const userAnswer = userAnswers[q.id];
    if (!userAnswer) {
      throw new Error(`Missing user answer for question ID: ${q.id}`);
    }

    if (userAnswer === q.correctAnswer) {
      correctCount++;
    } else {
      incorrectQuestions.push({
        id: q.id,
        question: q.question,
        userAnswer: userAnswer,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      });
    }
  });

  const totalQuestions = questions.length;
  const score = totalQuestions > 0 ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;

  return {
    score,
    totalQuestions,
    correctAnswers: correctCount,
    incorrectQuestions
  };
}

/**
 * Analyzes student performance trends using Gemini.
 * @param {string} studentId - The ID of the student.
 * @param {number} lastNDays - Number of days to look back.
 * @returns {Promise<Object>} - Analysis and recommendations.
 */
async function analyzePerformance(studentId, lastNDays = 3) {
  try {
    const performanceData = await Performance.find({ studentId: studentId || "demo_student" })
      .sort({ day: -1 })
      .limit(lastNDays * 10); // Rough limit to capture multiple entries per day if any

    if (performanceData.length === 0) {
      return {
        weakTopics: [],
        improvingTopics: [],
        urgentTopics: [],
        recommendations: ["Not enough data yet. Complete more quizzes!"],
        reasoning: "No performance records found in the database."
      };
    }

    const prompt = `You are analyzing a student's exam preparation performance.
      
      Performance data from last ${lastNDays} days:
      ${JSON.stringify(performanceData)}
      
      Analyze and identify:
      1. Topics where student consistently scores below 60%
      2. Topics showing improvement (score increasing over days)
      3. Topics that need urgent attention
      4. Recommended next steps
      
      Return ONLY valid JSON:
      {
        "weakTopics": ["topic1", "topic2"],
        "improvingTopics": ["topic3"],
        "urgentTopics": ["topic4"],
        "recommendations": [
          "Increase practice on topic1",
          "Continue current approach for topic3"
        ],
        "reasoning": "Brief explanation of analysis"
      }
      
      No markdown or extra text.`;

    try {
      const responseText = await generateContent(prompt, true); // useThinking: true
      const jsonString = responseText.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonString);
    } catch (apiError) {
      console.error("Gemini analysis failed:", apiError.message);
      return {
        weakTopics: [],
        improvingTopics: [],
        urgentTopics: [],
        recommendations: ["Continue following your study plan."],
        reasoning: "Analysis temporarily unavailable due to API error."
      };
    }
  } catch (error) {
    console.error("Error in analyzePerformance:", error);
    throw error;
  }
}

module.exports = { scoreQuiz, analyzePerformance };
