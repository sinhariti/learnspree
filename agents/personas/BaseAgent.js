const { generateContent } = require('../../utils/gemini');

/**
 * Base class for all Study Group agent personas.
 * Provides common functionality for persona-based AI interactions.
 */
class BaseAgent {
    constructor() {
        if (this.constructor === BaseAgent) {
            throw new Error('BaseAgent is an abstract class and cannot be instantiated directly');
        }

        // Must be overridden by subclasses
        this.persona = {
            name: 'Base Agent',
            role: 'assistant',
            style: 'neutral',
            systemPrompt: ''
        };
    }

    /**
     * Get the agent type identifier
     * @returns {string}
     */
    getType() {
        throw new Error('getType() must be implemented by subclass');
    }

    /**
     * Generate a response using the agent's persona
     * @param {string} userMessage - The user's message
     * @param {Object} context - Additional context (topic, history, etc.)
     * @returns {Promise<Object>} - The agent's response with metadata
     */
    async generateResponse(userMessage, context = {}) {
        const prompt = this._buildPrompt(userMessage, context);

        try {
            const responseText = await generateContent(prompt, true);
            const parsed = this._parseResponse(responseText);

            return {
                agent: this.getType(),
                agentName: this.persona.name,
                content: parsed.message,
                metadata: {
                    intent: parsed.intent || null,
                    confidence: parsed.confidence || 0.8,
                    suggestedHandoff: parsed.handoff || null,
                    topic: context.topic || null
                }
            };
        } catch (error) {
            console.error(`Error in ${this.persona.name}:`, error);
            throw error;
        }
    }

    /**
     * Build the full prompt with persona and context
     * @private
     */
    _buildPrompt(userMessage, context) {
        const conversationHistory = context.history
            ? context.history.map(m => `${m.agent}: ${m.content}`).join('\n')
            : '';

        return `${this.persona.systemPrompt}

CURRENT CONTEXT:
- Topic: ${context.topic || 'General study session'}
- Student Performance: ${context.recentScore !== undefined ? `${context.recentScore}% on recent quiz` : 'No recent data'}
- Session Duration: ${context.sessionDuration || 0} minutes
- Student's Weak Topics: ${context.weakTopics?.join(', ') || 'None identified'}
- Explanation Style Preference: ${context.explanationStyle || 'analogies'}

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n` : ''}

STUDENT MESSAGE: "${userMessage}"

Respond as ${this.persona.name} would. Be concise but helpful.
Your response MUST be valid JSON in this format:
{
  "message": "Your response to the student",
  "intent": "explain|quiz|challenge|motivate|clarify",
  "confidence": 0.0-1.0,
  "handoff": null or { "to": "quizmaster|explainer|advocate|motivator", "reason": "why handoff is needed" }
}

Do not include markdown formatting outside the JSON.`;
    }

    /**
     * Parse the AI response and extract structured data
     * @private
     */
    _parseResponse(responseText) {
        try {
            // Clean up potential markdown
            const jsonString = responseText.replace(/```json|```/g, '').trim();

            // Find JSON object
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');

            if (firstBrace === -1 || lastBrace === -1) {
                return { message: responseText, intent: null, confidence: 0.5 };
            }

            const parsed = JSON.parse(jsonString.substring(firstBrace, lastBrace + 1));
            return parsed;
        } catch (error) {
            console.warn('Failed to parse agent response as JSON, using raw text');
            return { message: responseText, intent: null, confidence: 0.5 };
        }
    }

    /**
     * Determine if this agent should hand off to another
     * @param {Object} context - Current session context
     * @returns {Object|null} - Handoff recommendation or null
     */
    shouldHandoff(context) {
        // Override in subclasses for specific handoff logic
        return null;
    }

    /**
     * Get the agent's greeting for starting a conversation
     * @param {Object} context - Session context
     * @returns {string}
     */
    getGreeting(context) {
        return `Hello! I'm ${this.persona.name}. How can I help you today?`;
    }
}

module.exports = BaseAgent;
