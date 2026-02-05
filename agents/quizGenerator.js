const { generateContent } = require('../utils/gemini');

/**
 * Generates topic-specific MCQ quizzes using Gemini.
 * @param {string} topic - The study topic (e.g., "DBMS - Normalization").
 * @param {string} difficulty - Difficulty level ("easy", "medium", "hard").
 * @param {number} numQuestions - Number of questions to generate.
 * @returns {Promise<Object>} - The generated quiz object.
 */
async function generateQuiz(topic, difficulty, numQuestions = 5) {
  const prompt = `You are an expert at creating competitive exam questions.
   
   Topic: ${topic}
   Difficulty: ${difficulty}
   Number of questions: ${numQuestions}
   
   Generate ${numQuestions} multiple-choice questions for this topic.
   
   REQUIREMENTS:
   - Questions should be exam-realistic (GATE/JEE/UPSC style)
   - 4 options each (A, B, C, D)
   - Only ONE correct answer
   - Include brief explanation for correct answer
   - Vary question types (concept, application, numerical)
   
   Return ONLY valid JSON in this exact format:
   {
     "quiz": {
       "topic": "${topic}",
       "difficulty": "${difficulty}",
       "questions": [
         {
           "id": 1,
           "question": "Question text here?",
           "options": {
             "A": "Option A",
             "B": "Option B",
             "C": "Option C",
             "D": "Option D"
           },
           "correctAnswer": "A",
           "explanation": "Explanation for why A is correct."
         }
       ]
     }
   }
   
   Do not include markdown or extra text.`;

  let retryCount = 0;
  let quizData = null;

  while (retryCount < 2) {
    let rawResponse = '';
    try {
      rawResponse = await generateContent(prompt, false); // useThinking: false

      // Clean up potential markdown formatting
      const jsonString = rawResponse.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonString);

      if (!parsed.quiz || !Array.isArray(parsed.quiz.questions)) {
        throw new Error("Invalid format: Missing 'quiz' object or 'questions' array");
      }

      const questions = parsed.quiz.questions;
      if (questions.length !== numQuestions) {
        console.warn(`Gemini returned ${questions.length} questions instead of ${numQuestions}.`);
      }

      // Validation
      questions.forEach((q, index) => {
        if (!q.id || !q.question || !q.options || !q.correctAnswer || !q.explanation) {
          throw new Error(`Missing required fields in question at index ${index}`);
        }
        const optionKeys = Object.keys(q.options);
        if (optionKeys.length !== 4 || !optionKeys.includes('A') || !optionKeys.includes('B') || !optionKeys.includes('C') || !optionKeys.includes('D')) {
          throw new Error(`Invalid options format in question ${q.id}. Expected A, B, C, D.`);
        }
        if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
          throw new Error(`Invalid correctAnswer '${q.correctAnswer}' in question ${q.id}. Must be A, B, C, or D.`);
        }
      });

      quizData = parsed.quiz;
      break;
    } catch (error) {
      retryCount++;
      console.error(`Attempt ${retryCount} failed to parse/validate Quiz JSON:`, error.message);
      if (retryCount >= 2) {
        console.error("Raw response:", rawResponse);
        throw new Error("Failed to generate a valid quiz after 2 attempts.");
      }
    }
  }

  return quizData;
}

module.exports = { generateQuiz };
