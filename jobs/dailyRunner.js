const Student = require('../models/Student');
const DailyPlan = require('../models/DailyPlan');
const { reflectAndReschedule } = require('../agents/reflectionAgent');

/**
 * Checks for student progress and triggers reflection/notifications.
 * Should be run daily.
 */
async function runDailyCheck() {
  console.log('--- Daily Agent Check Started ---');

  try {
    const studentId = "demo_student"; // Simplified for demo
    const student = await Student.findOne({ studentId });

    if (!student) {
      console.log('No student found for daily check.');
      return;
    }

    console.log(`Checking progress for Student: ${studentId}, Day: ${student.currentDay}`);

    // Trigger Reflection if enough data exists (>= Day 3)
    if (student.currentDay >= 3) {
      console.log('Triggering Reflection Agent...');
      const reflection = await reflectAndReschedule(studentId);
      if (reflection) {
        console.log('Reflection Analysis:', reflection.analysis.reasoning);
        console.log(`Adjustments applied for ${reflection.adjustments.length} days.`);
      }
    }

    // Get today's plan and "notify" user
    const todayPlan = await DailyPlan.findOne({
      studentId: student.studentId,
      day: student.currentDay
    });

    if (todayPlan) {
      console.log(`\n🔔 NOTIFICATION: Day ${todayPlan.day} has begun!`);
      console.log(`Focus Topics: ${todayPlan.topics.join(', ')}`);
      console.log(`Number of tasks: ${todayPlan.tasks.length}`);
    } else {
      console.log(`No DailyPlan found for Day ${student.currentDay}.`);
    }

    console.log('\n--- Daily Agent Check Completed ---');
    return { success: true, day: student.currentDay };

  } catch (error) {
    console.error('Error in runDailyCheck:', error);
    throw error;
  }
}

module.exports = { runDailyCheck };
