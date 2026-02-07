const BaseAgent = require('./BaseAgent');

/**
 * Explainer Agent - Breaks down complex concepts with analogies
 * Personality: Patient, uses real-world examples
 */
class ExplainerAgent extends BaseAgent {
    constructor() {
        super();
        this.persona = {
            name: 'Dr. Clarity',
            role: 'explainer',
            style: 'patient and uses analogies',
            systemPrompt: `You are Dr. Clarity, a patient and insightful teacher who excels at making complex concepts understandable.

YOUR PERSONALITY:
- Extremely patient - never frustrated with repeated questions
- Master of analogies - you relate technical concepts to everyday life
- Adaptive - you adjust your explanation style based on what works for the student
- Socratic at times - you ask guiding questions to help students discover answers

YOUR EXPLANATION STYLES:
1. "analogies" - Use real-world analogies (e.g., "A database index is like a book's table of contents")
2. "technical" - Precise, formal explanations with proper terminology
3. "visual" - Describe concepts in visual/spatial terms ("Imagine a tree structure where...")
4. "step-by-step" - Break down into numbered, sequential steps

YOUR ROLE:
- Explain concepts that students are struggling with
- Adapt explanation style based on student preferences
- Build on previous explanations if the first attempt didn't work
- Know when the student has understood and can be handed to Quizmaster

RULES:
- Always check understanding after explaining
- If one explanation style fails, try a different one
- Never make the student feel bad for not understanding
- When student shows understanding, suggest practice with Quizmaster`
        };
    }

    getType() {
        return 'explainer';
    }

    getGreeting(context) {
        const topic = context.topic || 'this concept';
        return `📚 Hi there! I'm Dr. Clarity. I heard you'd like some help understanding ${topic}. Don't worry - by the time we're done, this will make perfect sense. What part is confusing you the most?`;
    }

    /**
     * Generate an explanation for a concept
     * @param {string} concept - The concept to explain
     * @param {string} style - Explanation style preference
     * @param {Array} previousAttempts - Previous explanations that didn't work
     */
    async explainConcept(concept, style = 'analogies', previousAttempts = []) {
        const prompt = `You are Dr. Clarity explaining "${concept}" using the "${style}" style.

${previousAttempts.length > 0 ? `PREVIOUS ATTEMPTS THAT DIDN'T CLICK:
${previousAttempts.join('\n')}

Try a DIFFERENT approach this time.` : ''}

Generate an explanation in JSON format:
{
  "explanation": "Your main explanation (2-3 paragraphs max)",
  "analogy": "A memorable real-world analogy if applicable",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "commonMistakes": ["Mistake students often make"],
  "checkQuestion": "A simple question to verify understanding"
}

Make it clear, memorable, and appropriate for competitive exam preparation.`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, true);

        try {
            const jsonString = response.replace(/```json|```/g, '').trim();
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            return JSON.parse(jsonString.substring(firstBrace, lastBrace + 1));
        } catch (error) {
            console.error('Failed to parse explanation:', error);
            return {
                explanation: response,
                keyPoints: [],
                checkQuestion: 'Does this make sense so far?'
            };
        }
    }

    /**
     * Generate an analogy for a specific concept
     * @param {string} concept - The concept
     * @param {Array} studentInterests - Student's known interests for personalization
     */
    async generateAnalogy(concept, studentInterests = []) {
        const interestContext = studentInterests.length > 0
            ? `The student is interested in: ${studentInterests.join(', ')}. Try to relate to these.`
            : '';

        const prompt = `Create a memorable analogy for "${concept}".
${interestContext}

Return JSON: { "analogy": "the analogy", "explanation": "how the analogy maps to the concept" }`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, false);

        try {
            return JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch {
            return { analogy: response, explanation: '' };
        }
    }

    /**
     * Check if student understood the explanation
     * @param {string} explanation - The explanation given
     * @param {string} studentResponse - Student's response/question
     */
    async checkUnderstanding(explanation, studentResponse) {
        const prompt = `You explained a concept. The student responded: "${studentResponse}"

Based on their response, assess:
1. Did they understand? (yes/partial/no)
2. What specific part might still be unclear?
3. Should we try a different explanation or move to practice?

Return JSON: {
  "understood": "yes|partial|no",
  "unclearParts": ["part1", "part2"],
  "recommendation": "continue_explaining|practice|different_approach",
  "followUp": "What to say next"
}`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, false);

        try {
            return JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch {
            return { understood: 'partial', recommendation: 'continue_explaining' };
        }
    }

    shouldHandoff(context) {
        // Hand off to Quizmaster when student understands
        if (context.understandingConfirmed) {
            return {
                to: 'quizmaster',
                reason: 'Student has understood the concept - time to practice'
            };
        }

        // Hand off to Motivator if student is getting frustrated
        if (context.frustrationLevel >= 3) {
            return {
                to: 'motivator',
                reason: 'Student seems frustrated - needs encouragement'
            };
        }

        return null;
    }
}

module.exports = ExplainerAgent;
