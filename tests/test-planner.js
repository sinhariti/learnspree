const mongoose = require('mongoose');
const { generateInitialPlan } = require('../agents/plannerAgent');
const Student = require('../models/Student');
const DailyPlan = require('../models/DailyPlan');
require('dotenv').config();

async function testPlanner() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI missing from .env');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Create/Update test student
    const studentData = {
      studentId: "planner_test_student",
      examName: "GATE CSE 2026",
      totalDays: 7, // 7 days for testing
      hoursPerDay: 3,
      syllabus: ["Operating Systems", "DBMS"]
    };

    console.log('Setting up test student...');
    await Student.findOneAndUpdate(
      { studentId: studentData.studentId },
      studentData,
      { upsert: true, new: true }
    );

    // 2. Call generateInitialPlan
    console.log(`\nCalling Planner Agent for ${studentData.totalDays} days... (This may take a moment with thinking model)`);
    const schedule = await generateInitialPlan(studentData);

    // 3. Log results
    console.log('\n--- Generated Schedule ---');
    schedule.forEach(day => {
      const totalMinutes = day.tasks.reduce((sum, task) => sum + task.duration, 0);
      console.log(`Day ${day.day}: ${day.topics.join(', ')} (${totalMinutes} mins)`);
      console.log(`  Reasoning: ${day.aiReasoning.substring(0, 100)}...`);
    });

    // 4. Verify MongoDB
    const planCount = await DailyPlan.countDocuments({ studentId: studentData.studentId });
    console.log(`\n✅ MongoDB Verification: Found ${planCount} DailyPlan documents.`);

    if (planCount === studentData.totalDays) {
      console.log('✅ Success: Correct number of days generated and stored.');
    } else {
      console.error(`❌ Error: Expected ${studentData.totalDays} plans, but found ${planCount}.`);
    }

  } catch (error) {
    console.error('❌ Planner test failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testPlanner();
