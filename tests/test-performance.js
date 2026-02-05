const mongoose = require('mongoose');
const { scoreQuiz, analyzePerformance } = require('../agents/performanceAnalyzer');
const { savePerformance } = require('../utils/performanceStorage');
require('dotenv').config();

async function testPerformance() {
  console.log('--- Performance Analyzer Test ---');

  const mongoUri = process.env.MONGODB_URI;
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const studentId = "perf_test_student";

    // 1. Mock Quiz Data
    const mockQuiz = {
      questions: [
        { id: 1, question: "Q1", correctAnswer: "A", explanation: "Exp1" },
        { id: 2, question: "Q2", correctAnswer: "B", explanation: "Exp2" },
        { id: 3, question: "Q3", correctAnswer: "C", explanation: "Exp3" }
      ]
    };

    // 2. Test Scoring Logic
    console.log('\n[Scoring Tests]');

    // 100% Correct
    const result100 = scoreQuiz(mockQuiz, { "1": "A", "2": "B", "3": "C" });
    console.log(`100% Test: ${result100.score}% (Expected 100)`);

    // 66.67% Correct
    const result66 = scoreQuiz(mockQuiz, { "1": "A", "2": "B", "3": "A" });
    console.log(`66.67% Test: ${result66.score}% (Expected 66.67)`);
    console.log(`  Incorrect Q ID: ${result66.incorrectQuestions[0].id}`);

    // 0% Correct
    const result0 = scoreQuiz(mockQuiz, { "1": "B", "2": "C", "3": "A" });
    console.log(`0% Test: ${result0.score}% (Expected 0)`);

    // 3. Save Performance Data (Simulating 3 days)
    console.log('\n[Storage Test]');
    await mongoose.connection.collection('performances').deleteMany({ studentId });

    console.log('Saving mock performance records...');
    await savePerformance(studentId, 1, "Operating Systems", 40, 60, ["Process Synchronization"]);
    await savePerformance(studentId, 2, "Operating Systems", 55, 60, ["Deadlock Avoidance"]);
    await savePerformance(studentId, 3, "DBMS", 90, 45, []);

    // 4. Test AI Analysis
    console.log('\n[AI Analysis Test] (Requesting Gemini analysis...)');
    const analysis = await analyzePerformance(studentId, 3);

    console.log('\n--- AI Performance Report ---');
    console.log('Weak Topics:', analysis.weakTopics.join(', ') || 'None');
    console.log('Improving Topics:', analysis.improvingTopics.join(', ') || 'None');
    console.log('Urgent Topics:', analysis.urgentTopics.join(', ') || 'None');
    console.log('Recommendations:', analysis.recommendations.map(r => `\n  - ${r}`).join(''));
    console.log('Reasoning:', analysis.reasoning);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Performance test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testPerformance();
