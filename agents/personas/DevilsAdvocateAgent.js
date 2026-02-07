const BaseAgent = require('./BaseAgent');

/**
 * Devil's Advocate Agent - Challenges mastered concepts to prevent false confidence
 * Personality: Provocative but fair
 */
class DevilsAdvocateAgent extends BaseAgent {
    constructor() {
        super();
        this.persona = {
            name: 'The Challenger',
            role: 'advocate',
            style: 'provocative but fair',
            systemPrompt: `You are The Challenger, an intellectual sparring partner who tests true mastery of concepts.

YOUR PERSONALITY:
- Provocative but fair - you challenge, never mock
- Skeptical - you question confident answers
- Socratic - you use questions to expose gaps in understanding
- Respectful - you acknowledge when someone truly knows their stuff

YOUR ROLE:
- Challenge students who score highly to ensure TRUE mastery vs. memorization
- Create "trap" questions that expose common misconceptions
- Ask "why" and "what if" questions to probe deeper understanding
- Distinguish between surface-level knowledge and deep comprehension

CHALLENGE TYPES:
1. "Edge cases" - What happens in unusual situations?
2. "Why not X?" - Why is the wrong answer wrong?
3. "Counter-examples" - Can you think of exceptions?
4. "Application" - How would this work in real scenario X?
5. "Connections" - How does this relate to concept Y?

RULES:
- Only challenge students who show high confidence/scores
- Be tough but never discouraging
- Celebrate true mastery when demonstrated
- If student shows gaps, recommend Explainer (don't explain yourself)
- If student passes challenges, celebrate with Motivator`
        };
    }

    getType() {
        return 'advocate';
    }

    getGreeting(context) {
        const topic = context.topic || 'this topic';
        return `😈 Well, well! I'm The Challenger. I see you've been doing well on ${topic}. But do you REALLY understand it, or have you just memorized the answers? Let's find out...`;
    }

    /**
     * Generate a challenge question for a "mastered" topic
     * @param {string} topic - The topic to challenge
     * @param {Object} studentPerformance - Their performance data
     */
    async generateChallenge(topic, studentPerformance = {}) {
        const prompt = `You are The Challenger creating a DEEP challenge for "${topic}".

The student scored ${studentPerformance.score || 90}% on basic questions. Now challenge their TRUE understanding.

Generate a challenge in JSON format:
{
  "challengeType": "edge_case|why_not|counter_example|application|connection",
  "setup": "Brief context or scenario",
  "question": "The challenging question",
  "trapAnswer": "The answer a memorizer might give",
  "correctReasoning": "What demonstrates true understanding",
  "followUp": "A follow-up question based on their answer",
  "relatedConcepts": ["concept1", "concept2"]
}

Make it thought-provoking but answerable. The goal is to deepen understanding, not frustrate.`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, true);

        try {
            const jsonString = response.replace(/```json|```/g, '').trim();
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            return JSON.parse(jsonString.substring(firstBrace, lastBrace + 1));
        } catch (error) {
            console.error('Failed to parse challenge:', error);
            throw new Error('Failed to generate challenge');
        }
    }

    /**
     * Create a "trap" question designed to catch common misconceptions
     * @param {string} concept - The concept
     * @param {Array} knownMisconceptions - Known student misconceptions
     */
    async createTrapQuestion(concept, knownMisconceptions = []) {
        const prompt = `Create a TRAP question for "${concept}" that catches common misconceptions.

${knownMisconceptions.length > 0 ? `Known misconceptions to exploit:\n${knownMisconceptions.join('\n')}` : ''}

Return JSON:
{
  "question": "The trap question",
  "trapOption": "The tempting wrong answer",
  "trapExplanation": "Why people fall for this",
  "correctAnswer": "The actual correct answer",
  "whyCorrect": "Explanation of correct reasoning",
  "misconceptionFixed": "What misconception this addresses"
}`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, false);

        try {
            return JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch {
            return null;
        }
    }

    /**
     * Assess if the student's response shows true mastery
     * @param {Object} challenge - The challenge given
     * @param {string} studentResponse - Student's response
     */
    async assessMastery(challenge, studentResponse) {
        const prompt = `The Challenger asked: "${challenge.question}"
Student answered: "${studentResponse}"
Correct reasoning should include: ${challenge.correctReasoning}

Assess their response:
- Did they demonstrate TRUE understanding or surface-level knowledge?
- What aspects of their reasoning were strong/weak?
- Do they need more explanation or are they truly mastered?

Return JSON:
{
  "masteryLevel": "true_mastery|good_understanding|surface_level|misconception",
  "strengths": ["what they got right"],
  "gaps": ["what they missed or got wrong"],
  "feedback": "Encouraging but honest feedback",
  "recommendation": "celebrate|continue_challenging|explain",
  "followUpQuestion": "Optional follow-up if continuing"
}`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, true);

        try {
            return JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch {
            return { masteryLevel: 'surface_level', recommendation: 'continue_challenging' };
        }
    }

    shouldHandoff(context) {
        // Hand off to Explainer if gaps found
        if (context.masteryLevel === 'surface_level' || context.masteryLevel === 'misconception') {
            return {
                to: 'explainer',
                reason: 'Student has gaps in understanding that need explanation'
            };
        }

        // Hand off to Motivator to celebrate true mastery
        if (context.masteryLevel === 'true_mastery' && context.challengesPassed >= 3) {
            return {
                to: 'motivator',
                reason: 'Student has demonstrated true mastery - time to celebrate!'
            };
        }

        return null;
    }
}

module.exports = DevilsAdvocateAgent;
