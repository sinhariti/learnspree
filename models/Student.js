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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Student', studentSchema);
