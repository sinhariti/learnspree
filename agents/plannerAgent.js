const { generateContent } = require('../utils/gemini');
const DailyPlan = require('../models/DailyPlan');

/**
 * Generates an initial 30-day study plan using Gemini.
 * @param {Object} studentData - Data including studentId, examName, totalDays, hoursPerDay, syllabus.
 * @returns {Promise<Array>} - Array of generated DailyPlan objects.
 */
async function generateInitialPlan(studentData) {
  const { studentId, examName, totalDays, hoursPerDay, syllabus } = studentData;
  const targetMinutes = hoursPerDay * 60;

  const prompt = `You are an expert study planner for competitive exams.
   
   Student details:
   - Exam: ${examName}
   - Days available: ${totalDays}
   - Daily study hours: ${hoursPerDay}
   - Syllabus: ${syllabus.join(', ')}
   
   Generate a detailed ${totalDays}-day study schedule.
   
   For each day, provide:
   1. Topics to cover
   2. Specific tasks (theory/quiz/practice/revision)
   3. Time allocation (in minutes)
   4. Brief reasoning for this day's focus
   
   IMPORTANT RULES:
   - Start with foundational topics before advanced ones
   - Include theory, practice, and quiz tasks
   - Use ONLY these types for tasks: "theory", "quiz", "practice", "revision"
   - Distribute topics evenly across days
   - Include revision days (every 7 days)
   - Each day should use approximately ${targetMinutes} minutes
   
   Return ONLY valid JSON in this exact format:
   {
     "schedule": [
       {
         "day": 1,
         "topics": ["Topic Name"],
         "tasks": [
           {
             "topic": "Topic Name",
             "type": "theory",
             "duration": 90,
             "description": "Task description"
           }
         ],
         "reasoning": "Reason for today's focus"
       }
     ]
   }
   
   Do not include markdown formatting or explanations outside the JSON.`;

  let retryCount = 0;
  let schedule = null;

  const validTypes = ["theory", "quiz", "practice", "revision"];

  while (retryCount < 2) {
    try {
      const responseText = await generateContent(prompt, true);

      // Clean up potential markdown formatting if Gemini ignored "ONLY valid JSON"
      const jsonString = responseText.replace(/```json|```/g, '').trim();
      const data = JSON.parse(jsonString);

      if (!data.schedule || !Array.isArray(data.schedule)) {
        throw new Error("Invalid response format: Missing 'schedule' array");
      }

      // Normalization and validation
      data.schedule.forEach((day, index) => {
        if (!day.day || !day.topics || !day.tasks || !day.reasoning) {
          throw new Error(`Missing fields in schedule at index ${index}`);
        }
        day.tasks.forEach((task, tIndex) => {
          if (!task.topic || !task.type || !task.duration || !task.description) {
            throw new Error(`Missing fields in task at day ${day.day}, index ${tIndex}`);
          }

          // Normalize type if it's slightly off
          let type = task.type.toLowerCase();
          if (!validTypes.includes(type)) {
            if (type.includes('theory')) type = 'theory';
            else if (type.includes('quiz')) type = 'quiz';
            else if (type.includes('practice')) type = 'practice';
            else if (type.includes('revision')) type = 'revision';
            else type = 'theory'; // Default fallback
            task.type = type;
          }
        });
      });

      schedule = data.schedule;
      break;
    } catch (error) {
      retryCount++;
      console.error(`Attempt ${retryCount} failed to parse/validate Gemini response:`, error.message);
      if (retryCount >= 2) throw new Error("Failed to generate valid schedule after 2 attempts.");
    }
  }

  // Save to MongoDB
  try {
    const dailyPlans = schedule.map(day => ({
      studentId: studentId || "demo_student",
      day: day.day,
      date: new Date(Date.now() + (day.day - 1) * 24 * 60 * 60 * 1000),
      topics: day.topics,
      tasks: day.tasks,
      aiReasoning: day.reasoning
    }));

    // Clear existing plans for this student to avoid duplicates
    await DailyPlan.deleteMany({ studentId: studentId || "demo_student" });

    // Bulk insert
    const savedPlans = await DailyPlan.insertMany(dailyPlans);
    return savedPlans;
  } catch (error) {
    console.error("Failed to save schedule to MongoDB:", error);
    throw error;
  }
}

module.exports = { generateInitialPlan };
