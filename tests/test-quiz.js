const { generateQuiz } = require('../agents/quizGenerator');
require('dotenv').config();

async function testQuiz() {
  console.log('--- Quiz Generator Test ---');

  const testParams = {
    topic: "Operating Systems - Deadlocks",
    difficulty: "medium",
    numQuestions: 3
  };

  try {
    console.log(`Generating a ${testParams.numQuestions}-question ${testParams.difficulty} quiz on: ${testParams.topic}...`);

    const quiz = await generateQuiz(testParams.topic, testParams.difficulty, testParams.numQuestions);

    console.log('\n✅ Quiz Generated Successfully!');
    console.log(`Topic: ${quiz.topic}`);
    console.log(`Difficulty: ${quiz.difficulty}`);
    console.log(`Number of Questions: ${quiz.questions.length}`);

    quiz.questions.forEach((q, i) => {
      console.log(`\nQ${i + 1}: ${q.question}`);
      Object.entries(q.options).forEach(([key, value]) => {
        console.log(`   ${key}) ${value}`);
      });
      console.log(`Correct Answer: ${q.correctAnswer}`);
      console.log(`Explanation: ${q.explanation}`);
    });

    // Verification Logic
    const isCorrectLength = quiz.questions.length === testParams.numQuestions;
    const hasAllFields = quiz.questions.every(q => q.question && q.options.A && q.correctAnswer && q.explanation);
    const validAnswers = quiz.questions.every(q => ['A', 'B', 'C', 'D'].includes(q.correctAnswer));

    if (isCorrectLength && hasAllFields && validAnswers) {
      console.log('\n✅ All verification checks passed!');
    } else {
      console.error('\n❌ Verification failed.');
      if (!isCorrectLength) console.error(`- Expected ${testParams.numQuestions} questions, got ${quiz.questions.length}`);
      if (!hasAllFields) console.error('- Some questions are missing required fields');
      if (!validAnswers) console.error('- Some questions have invalid correct answers');
    }

  } catch (error) {
    console.error('\n❌ Quiz generation failed:', error.message);
  }
}

testQuiz();
