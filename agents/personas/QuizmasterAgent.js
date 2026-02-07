const BaseAgent = require('./BaseAgent');

/**
 * Quizmaster Agent - Tests knowledge through adaptive questioning
 * Personality: Encouraging but rigorous
 */
class QuizmasterAgent extends BaseAgent {
    constructor() {
        super();
        this.persona = {
            name: 'Professor Quiz',
            role: 'quizmaster',
            style: 'encouraging but rigorous',
            systemPrompt: `You are Professor Quiz, an engaging and knowledgeable quiz master for competitive exam preparation.

YOUR PERSONALITY:
- Encouraging but rigorous - you celebrate correct answers but maintain high standards
- You ask probing follow-up questions to ensure deep understanding
- You vary question types: conceptual, application-based, and numerical
- You provide hints when students struggle, but don't give away answers easily

YOUR ROLE:
- Generate adaptive quiz questions based on the topic and student's level
- Evaluate answers and provide constructive feedback
- Identify knowledge gaps through questioning patterns
- Know when to hand off to the Explainer if a student is struggling

RULES:
- Keep questions exam-realistic (GATE/JEE/UPSC style)
- Provide brief explanations for wrong answers
- Track which concepts the student gets right vs wrong
- If student scores below 50% on 3+ questions, suggest handoff to Explainer
- If student scores above 90%, suggest handoff to Devil's Advocate for deeper challenge`
        };
    }

    getType() {
        return 'quizmaster';
    }

    getGreeting(context) {
        const topic = context.topic || 'today\'s topic';
        return `🎯 Hello! I'm Professor Quiz. Ready to test your knowledge on ${topic}? Let's see what you've got! I'll start with a warm-up question.`;
    }

    /**
     * Generate an adaptive quiz question
     * @param {string} topic - The topic to quiz on
     * @param {string} difficulty - easy/medium/hard
     * @param {Array} previousQuestions - Questions already asked (to avoid repetition)
     */
    async generateQuestion(topic, difficulty = 'medium', previousQuestions = []) {
        const prompt = `You are Professor Quiz generating a ${difficulty} difficulty question.

TOPIC: ${topic}

PREVIOUSLY ASKED (avoid these):
${previousQuestions.map(q => `- ${q}`).join('\n') || 'None yet'}

Generate ONE multiple-choice question in this JSON format:
{
  "question": "The question text",
  "options": {
    "A": "Option A",
    "B": "Option B", 
    "C": "Option C",
    "D": "Option D"
  },
  "correctAnswer": "A|B|C|D",
  "explanation": "Why the correct answer is right",
  "concept": "The specific concept being tested",
  "hint": "A subtle hint if the student is struggling"
}

Make it exam-realistic and challenging but fair.`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, false);

        try {
            const jsonString = response.replace(/```json|```/g, '').trim();
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            return JSON.parse(jsonString.substring(firstBrace, lastBrace + 1));
        } catch (error) {
            console.error('Failed to parse quiz question:', error);
            throw new Error('Failed to generate quiz question');
        }
    }

    /**
     * Evaluate a student's answer
     * @param {Object} question - The question object
     * @param {string} studentAnswer - The student's answer (A/B/C/D)
     * @param {string} studentExplanation - Optional explanation from student
     */
    async evaluateAnswer(question, studentAnswer, studentExplanation = null) {
        const isCorrect = studentAnswer.toUpperCase() === question.correctAnswer;

        if (isCorrect && studentExplanation) {
            // Evaluate the quality of their explanation
            const prompt = `A student correctly answered: "${question.question}"
Their explanation: "${studentExplanation}"
Correct concept: ${question.explanation}

Is their explanation demonstrating TRUE understanding or just memorization?
Respond with JSON: { "understanding": "deep|surface|memorized", "feedback": "brief feedback" }`;

            const { generateContent } = require('../../utils/gemini');
            const response = await generateContent(prompt, false);

            try {
                const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
                return {
                    isCorrect: true,
                    understanding: parsed.understanding,
                    feedback: parsed.feedback
                };
            } catch {
                return { isCorrect: true, understanding: 'unknown', feedback: 'Good job!' };
            }
        }

        return {
            isCorrect,
            feedback: isCorrect
                ? `✅ Correct! ${question.explanation}`
                : `❌ Not quite. The correct answer is ${question.correctAnswer}. ${question.explanation}`,
            hint: !isCorrect ? question.hint : null
        };
    }

    shouldHandoff(context) {
        // Hand off to Explainer if struggling
        if (context.consecutiveWrong >= 3 || (context.recentScore && context.recentScore < 50)) {
            return {
                to: 'explainer',
                reason: 'Student is struggling with concepts and needs explanation'
            };
        }

        // Hand off to Devil's Advocate if doing too well
        if (context.consecutiveCorrect >= 5 || (context.recentScore && context.recentScore > 90)) {
            return {
                to: 'advocate',
                reason: 'Student is excelling - time for deeper challenge'
            };
        }

        return null;
    }
}

module.exports = QuizmasterAgent;
