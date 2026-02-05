const Performance = require('../models/Performance');

/**
 * Saves quiz performance metrics to MongoDB.
 * @param {string} studentId - The ID of the student.
 * @param {number} day - The study day.
 * @param {string} topic - The topic covered.
 * @param {number} quizScore - The score achieved (0-100).
 * @param {number} timeSpent - Time spent in minutes.
 * @param {Array<string>} mistakes - List of concepts where errors occurred.
 * @returns {Promise<Object>} - The saved performance document.
 */
async function savePerformance(studentId, day, topic, quizScore, timeSpent, mistakes = [], difficulty = "medium") {
  try {
    const performanceData = {
      studentId: studentId || "demo_student",
      day,
      topic,
      quizScore,
      timeSpent,
      mistakes,
      difficulty,
      completedAt: new Date()
    };

    const performance = new Performance(performanceData);
    return await performance.save();
  } catch (error) {
    console.error("Error saving performance to MongoDB:", error);
    throw error;
  }
}

module.exports = { savePerformance };
