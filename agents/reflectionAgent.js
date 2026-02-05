const Student = require('../models/Student');
const Performance = require('../models/Performance');
const DailyPlan = require('../models/DailyPlan');
const { generateContent } = require('../utils/gemini');

/**
 * The Reflection Agent gathers performance data and upcoming plans,
 * uses Gemini to evaluate progress, and adapts the future schedule.
 * @param {string} studentId - The ID of the student.
 * @returns {Promise<Object|null>} - The analysis and adjustments performed.
 */
async function reflectAndReschedule(studentId) {
  try {
    // Step 1: Gather data
    const student = await Student.findOne({ studentId: studentId || "demo_student" });
    if (!student) {
      console.error("Reflection Error: Student not found.");
      return null;
    }

    // Get last entries to analyze performance patterns
    const performanceData = await Performance.find({ studentId: student.studentId })
      .sort({ day: -1 })
      .limit(20)
      .lean();

    if (performanceData.length === 0) {
      console.log("No performance data found for reflection. Skipping.");
      return null;
    }

    // Get upcoming plans for the next 7 days
    const upcomingPlans = await DailyPlan.find({
      studentId: student.studentId,
      day: { $gt: student.currentDay, $lte: student.currentDay + 7 }
    })
      .sort({ day: 1 })
      .lean();

    if (upcomingPlans.length === 0) {
      console.log("No upcoming plans found for rescheduling.");
      return null;
    }

    // Step 2: Call Gemini with extended thinking
    const targetMinutes = student.hoursPerDay * 60;
    const prompt = `You are an adaptive study coach that learns from student performance.
   
   STUDENT CONTEXT:
   - Exam: ${student.examName}
   - Current Day: ${student.currentDay}
   - Daily hours: ${student.hoursPerDay}
   - Full syllabus: ${student.syllabus.join(', ')}
   
   RECENT PERFORMANCE (Past logs):
   ${JSON.stringify(performanceData, null, 2)}
   
   CURRENT UPCOMING PLAN (Next 7 days):
   ${JSON.stringify(upcomingPlans, null, 2)}
   
   TASK:
   Analyze the performance data and current plan. Think step-by-step:
   
   1. Which topics is the student struggling with? (score < 60%)
   2. Which topics is the student excelling at? (score > 80%)
   3. Is the current plan allocating enough time to weak areas?
   4. What adjustments should be made to the next 7 days?
   
   ADJUSTMENT RULES:
   - If a topic shows consistent failure, ADD 30-60 more minutes of practice or revision
   - If a topic is mastered (score > 80%), REDUCE time or mark as "revision" to free up time
   - Weak topics MUST appear in MULTIPLE upcoming days
   - Don't completely remove any syllabus topic
   - Maintain total daily time around ${targetMinutes} minutes
   
   Return ONLY valid JSON in this exact format:
   {
     "analysis": {
       "weakTopics": ["topic1"],
       "strongTopics": ["topic2"],
       "reasoning": "Detailed explanation of why adjustments are needed"
     },
     "adjustments": [
       {
         "day": 5,
         "changes": [
           {
             "action": "add",
             "task": {
               "topic": "DBMS",
               "type": "practice",
               "duration": 45,
               "description": "Additional practice"
             },
             "reason": "Scored low on previous quiz"
           },
           {
             "action": "remove",
             "taskIndex": 2,
             "reason": "Mastered topic"
           },
           {
             "action": "modify",
             "taskIndex": 0,
             "newDuration": 60,
             "reason": "Needs more adjustment"
           }
         ]
       }
     ]
   }
   
   No markdown or explanations outside JSON.`;

    let retryCount = 0;
    let result = null;

    while (retryCount < 2) {
      try {
        const responseText = await generateContent(prompt, true); // extended thinking
        const jsonString = responseText.replace(/```json|```/g, '').trim();
        result = JSON.parse(jsonString);
        break;
      } catch (err) {
        retryCount++;
        if (retryCount >= 2) throw err;
      }
    }

    // Step 4: Apply adjustments to DailyPlan documents
    if (result && result.adjustments) {
      for (const adj of result.adjustments) {
        const plan = await DailyPlan.findOne({
          studentId: student.studentId,
          day: adj.day
        });

        if (!plan) continue;

        // Sort removals by index descending to avoid index shifting problems
        const removals = adj.changes
          .filter(c => c.action === 'remove' && typeof c.taskIndex === 'number')
          .sort((a, b) => b.taskIndex - a.taskIndex);

        const modifications = adj.changes
          .filter(c => c.action === 'modify' && typeof c.taskIndex === 'number');

        const additions = adj.changes
          .filter(c => c.action === 'add' && c.task);

        // Apply removals
        removals.forEach(c => {
          if (plan.tasks[c.taskIndex]) {
            plan.tasks.splice(c.taskIndex, 1);
          }
        });

        // Apply modifications
        modifications.forEach(c => {
          if (plan.tasks[c.taskIndex]) {
            if (c.newDuration) plan.tasks[c.taskIndex].duration = c.newDuration;
            if (c.newDescription) plan.tasks[c.taskIndex].description = c.newDescription;
          }
        });

        // Apply additions
        additions.forEach(c => {
          plan.tasks.push(c.task);
        });

        // Update reasoning
        plan.aiReasoning = `[Rescheduled] ${result.analysis.reasoning}`;
        await plan.save();
      }

      // Step 5: Update Student weakTopics
      const uniqueWeakTopics = [...new Set([...student.weakTopics, ...result.analysis.weakTopics])];
      student.weakTopics = uniqueWeakTopics;
      await student.save();
    }

    return result;

  } catch (error) {
    console.error("Critical Error in Reflection Agent:", error);
    throw error;
  }
}

module.exports = { reflectAndReschedule };
