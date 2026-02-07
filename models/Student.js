const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    default: "demo_student",
    unique: true
  },
  examName: {
    type: String,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  hoursPerDay: {
    type: Number,
    required: true
  },
  syllabus: [String],
  weakTopics: [String],
  startDate: {
    type: Date,
    default: Date.now
  },
  currentDay: {
    type: Number,
    default: 1
  },
  // Agent preferences for Study Group Orchestrator
  agentPreferences: {
    preferredExplanationStyle: {
      type: String,
      enum: ['analogies', 'technical', 'visual', 'step-by-step'],
      default: 'analogies'
    },
    motivationFrequency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    challengeLevel: {
      type: String,
      enum: ['gentle', 'moderate', 'intense'],
      default: 'moderate'
    }
  },
  // Engagement metrics for tracking study patterns
  engagementMetrics: {
    averageSessionDuration: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    totalStudyMinutes: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Student', studentSchema);
