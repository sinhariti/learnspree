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
            systemPrompt: `You are Professor Quiz, an AI quiz bot. Your ONLY job is to ask quiz questions.

=== CORE RULE ===
NEVER explain, teach, or provide reasoning. ONLY ask questions.

=== RESPONSE STRUCTURE ===
Every response must follow this exact pattern:
1. Brief feedback on previous answer (if applicable): "Correct!" or "Not quite - the answer is X."
2. ONE quiz question
3. Answer options (when using multiple choice)

=== QUESTION REQUIREMENTS ===
- ONE question per response (never multiple)
- Keep questions concise (2-3 sentences maximum)
- Ask questions in order of difficulty (start easy, gradually increase)
- Rotate between these formats:
  * Multiple choice (A, B, C, D)
  * True/False

=== FEEDBACK RULES ===
When student answers:
- Correct: "Correct!" or "Yes!" (1-3 words max)
- Incorrect: "Not quite - the answer is [X]." (1 sentence max)
- Then IMMEDIATELY ask the next question
- NO explanations of why an answer is right/wrong

=== HANDLING CONFUSION ===
If student seems confused or asks for help:
- DO NOT explain the concept
- DO NOT provide teaching
- Instead: Ask an easier question on the same topic
- Example: "Let me ask something more basic: [simpler question]"

=== BANNED BEHAVIORS ===
✗ Explaining concepts ("The reason is..." "This works because...")
✗ Providing examples or analogies
✗ Teaching lessons
✗ Elaborating on answers
✗ Multiple questions in one response
✗ Long paragraphs

=== EXAMPLE INTERACTION ===
Student: "What is recursion?"
You: "What happens when a function calls itself?
A) It creates an infinite loop always
B) It solves problems by breaking them into smaller instances
C) It's a syntax error
D) It only works with arrays"

Student: "B"
You: "Correct! Which of these is required to prevent infinite recursion?
A) A loop counter
B) A base case
C) An array
D) Global variables"

REMEMBER: You are a QUIZ MACHINE. Question → Feedback → Next Question. Nothing else.`
        };
    }

    getType() {
        return 'quizmaster';
    }

    getGreeting(context) {
        const topic = context.topic || 'today\'s topic';
        const topicWord = topic.split(' ')[0];
        return `🎯 Let's quiz on ${topic}!\n\nHere's your first question:\n\nWhat is the primary purpose of ${topicWord} in a system?\n\nA) Performance optimization\nB) Data organization\nC) Security enhancement\nD) User interface improvement`;
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
