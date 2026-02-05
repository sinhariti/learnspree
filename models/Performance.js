const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  day: {
    type: Number,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  quizScore: {
    type: Number,
    default: null
  },
  questionsAttempted: {
    type: Number,
    default: 0
  },
  questionsCorrect: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    required: true
  },
  mistakes: [String],
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Performance', performanceSchema);
