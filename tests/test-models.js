const mongoose = require('mongoose');
const Student = require('../models/Student');
const DailyPlan = require('../models/DailyPlan');
const Performance = require('../models/Performance');
require('dotenv').config();

async function testModels() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI missing from .env');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Create Sample Student
    console.log('\nCreating sample student...');
    const student = await Student.findOneAndUpdate(
      { studentId: "demo_student" },
      {
        examName: "GATE 2026",
        totalDays: 30,
        hoursPerDay: 4,
        syllabus: ["Operating Systems", "DBMS", "Computer Networks"],
        weakTopics: ["DBMS Normalization"]
      },
      { upsert: true, new: true }
    );
    console.log('✅ Student Created/Updated:', student.studentId);

    // 2. Create Sample Daily Plan
    console.log('\nCreating sample daily plan...');
    const dailyPlan = await DailyPlan.create({
      studentId: student.studentId,
      day: 1,
      date: new Date(),
      topics: ["Operating Systems"],
      tasks: [
        {
          topic: "Process Management",
          type: "theory",
          duration: 60,
          description: "Learn about PCB and Context Switching"
        },
        {
          topic: "Process Management Quiz",
          type: "quiz",
          duration: 30,
          description: "Attempt 10 questions"
        }
      ],
      aiReasoning: "Focusing on core OS fundamentals for Day 1."
    });
    console.log('✅ Daily Plan Created for Day:', dailyPlan.day);

    // 3. Create Sample Performance
    console.log('\nCreating sample performance metric...');
    const performance = await Performance.create({
      studentId: student.studentId,
      day: 1,
      topic: "Process Management",
      quizScore: 85,
      questionsAttempted: 10,
      questionsCorrect: 8,
      timeSpent: 90,
      mistakes: ["Context switching overhead calculations"],
      difficulty: "medium"
    });
    console.log('✅ Performance Record Created. Score:', performance.quizScore);

    // 4. Query and Log
    console.log('\n--- Retrieving Verified Data ---');
    const retrievedStudent = await Student.findOne({ studentId: "demo_student" });
    const retrievedPlan = await DailyPlan.findOne({ studentId: "demo_student", day: 1 });
    const retrievedPerf = await Performance.findOne({ studentId: "demo_student", day: 1 });

    console.log('Retrieved Student:', retrievedStudent.examName);
    console.log('Retrieved Plan Tasks Count:', retrievedPlan.tasks.length);
    console.log('Retrieved Performance Score:', retrievedPerf.quizScore);

    console.log('\n✅ All models verified successfully!');

  } catch (error) {
    console.error('❌ Model testing failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testModels();
