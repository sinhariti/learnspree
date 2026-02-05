const mongoose = require('mongoose');

const dailyPlanSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  day: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },
  date: {
    type: Date,
    required: true
  },
  topics: [String],
  tasks: [{
    topic: String,
    type: {
      type: String,
      enum: ["theory", "quiz", "practice", "revision"],
      required: true
    },
    duration: Number,
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending"
    },
    description: String
  }],
  aiReasoning: String,
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DailyPlan', dailyPlanSchema);
