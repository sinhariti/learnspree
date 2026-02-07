const BaseAgent = require('./BaseAgent');

/**
 * Motivator Agent - Maintains engagement and prevents burnout
 * Personality: Enthusiastic, celebrates wins
 */
class MotivatorAgent extends BaseAgent {
    constructor() {
        super();
        this.persona = {
            name: 'Coach Spark',
            role: 'motivator',
            style: 'enthusiastic and celebratory',
            systemPrompt: `You are Coach Spark, an enthusiastic motivator who keeps students engaged and prevents burnout.

YOUR PERSONALITY:
- Enthusiastic but genuine - your encouragement feels real, not forced
- Perceptive - you notice when students are tired, frustrated, or losing focus
- Celebratory - you make wins feel special, no matter how small
- Caring - you prioritize student wellbeing over cramming

YOUR ROLE:
- Celebrate achievements and milestones
- Suggest breaks when study sessions are too long
- Re-energize students who are losing motivation
- Provide perspective on progress and goals
- Combat imposter syndrome and self-doubt

INTERVENTION TRIGGERS:
1. Long study sessions (>90 minutes without break)
2. Declining engagement (slower responses, more errors)
3. Achievement milestones (streak days, topic completion)
4. After difficult challenges (whether passed or failed)
5. Signs of frustration or self-doubt

MOTIVATIONAL APPROACHES:
- "Progress check" - Show how far they've come
- "Celebration" - Make achievements feel special
- "Break suggestion" - Recommend strategic rest
- "Reframe" - Turn failures into learning opportunities
- "Goal reminder" - Connect current work to bigger goals

RULES:
- Never be condescending or overly cheesy
- Personalize based on student's history and achievements
- Know when to step back and let student continue studying
- Balance encouragement with productive study time`
        };
    }

    getType() {
        return 'motivator';
    }

    getGreeting(context) {
        if (context.streakDays > 0) {
            return `🔥 Hey champion! Coach Spark here! You're on a ${context.streakDays}-day streak - that's incredible dedication!`;
        }
        return `💪 Hey there! I'm Coach Spark. I'm here to make sure you stay motivated and don't burn out. How are you feeling about your study session?`;
    }

    /**
     * Generate contextual encouragement
     * @param {Object} context - Session and performance context
     */
    async generateEncouragement(context) {
        const prompt = `You are Coach Spark providing encouragement.

STUDENT CONTEXT:
- Study session duration: ${context.sessionDuration || 0} minutes
- Streak days: ${context.streakDays || 0}
- Recent performance: ${context.recentScore !== undefined ? `${context.recentScore}%` : 'No recent quiz'}
- Topics mastered: ${context.masteredTopics?.join(', ') || 'Still working on it'}
- Current topic: ${context.topic || 'General study'}
- Frustration level: ${context.frustrationLevel || 'normal'}

Generate encouragement in JSON format:
{
  "message": "Your encouraging message (2-3 sentences max)",
  "type": "celebration|progress_check|energy_boost|reframe",
  "emoji": "One or two relevant emojis",
  "suggestion": "Optional actionable suggestion",
  "funFact": "Optional fun/inspiring fact about learning or the topic"
}

Be genuine and specific to their situation. Avoid generic platitudes.`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, false);

        try {
            const jsonString = response.replace(/```json|```/g, '').trim();
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            return JSON.parse(jsonString.substring(firstBrace, lastBrace + 1));
        } catch {
            return {
                message: "You're doing great! Keep pushing forward!",
                type: 'energy_boost',
                emoji: '💪'
            };
        }
    }

    /**
     * Suggest a study break based on session metrics
     * @param {number} sessionDuration - Minutes in current session
     * @param {Object} engagementMetrics - Engagement data
     */
    async suggestBreak(sessionDuration, engagementMetrics = {}) {
        const needsBreak = sessionDuration >= 90 || engagementMetrics.errorRateIncreasing;

        if (!needsBreak) {
            return null;
        }

        const prompt = `You are Coach Spark suggesting a study break.

Session duration: ${sessionDuration} minutes
Signs of fatigue: ${engagementMetrics.errorRateIncreasing ? 'Yes' : 'Maybe'}

Generate a break suggestion in JSON:
{
  "message": "Your break recommendation",
  "breakDuration": "Suggested break in minutes",
  "activity": "A refreshing activity suggestion",
  "returnMotivation": "What to say when they return"
}

Make the break feel earned, not like giving up.`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, false);

        try {
            return JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch {
            return {
                message: `You've been studying for ${sessionDuration} minutes! That's dedication. How about a 10-minute break?`,
                breakDuration: 10,
                activity: 'Stretch, grab some water, or take a short walk'
            };
        }
    }

    /**
     * Celebrate a milestone achievement
     * @param {Object} milestone - The milestone achieved
     */
    async celebrateMilestone(milestone) {
        const prompt = `You are Coach Spark celebrating an achievement!

MILESTONE: ${JSON.stringify(milestone)}

Create a celebration in JSON:
{
  "celebration": "Your excited celebration message",
  "achievement": "What they specifically accomplished",
  "perspective": "How this fits into their bigger journey",
  "nextGoal": "A gentle nudge toward the next milestone"
}

Make it feel special! Use enthusiasm but stay genuine.`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, false);

        try {
            return JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch {
            return {
                celebration: `🎉 AMAZING! You just hit a major milestone!`,
                achievement: milestone.description || 'Great achievement'
            };
        }
    }

    /**
     * Reframe a failure as a learning opportunity
     * @param {Object} failure - The failure context
     */
    async reframeFailure(failure) {
        const prompt = `A student just failed a quiz or challenge. Help them see it positively.

Context: ${JSON.stringify(failure)}

Create a reframe in JSON:
{
  "acknowledgment": "Acknowledge the difficulty (don't dismiss it)",
  "reframe": "The positive perspective on this failure",
  "learning": "What they can take away from this",
  "encouragement": "Motivating message to continue"
}

Be empathetic first, then motivating. Don't be toxic positivity.`;

        const { generateContent } = require('../../utils/gemini');
        const response = await generateContent(prompt, false);

        try {
            return JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch {
            return {
                acknowledgment: "That was tough, and it's okay to feel frustrated.",
                reframe: "Every expert was once a beginner who kept trying.",
                learning: "Now you know exactly what to focus on next.",
                encouragement: "Ready to give it another shot?"
            };
        }
    }

    shouldHandoff(context) {
        // Hand off back to study after break
        if (context.breakCompleted) {
            return {
                to: context.nextAgent || 'quizmaster',
                reason: 'Break completed - ready to continue studying'
            };
        }

        // Hand off to Explainer if motivation is about a difficult concept
        if (context.needsExplanation) {
            return {
                to: 'explainer',
                reason: 'Student needs help understanding before continuing'
            };
        }

        return null;
    }
}

module.exports = MotivatorAgent;
