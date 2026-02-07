const QuizmasterAgent = require('./personas/QuizmasterAgent');
const ExplainerAgent = require('./personas/ExplainerAgent');
const DevilsAdvocateAgent = require('./personas/DevilsAdvocateAgent');
const MotivatorAgent = require('./personas/MotivatorAgent');
const AgentConversation = require('../models/AgentConversation');
const Student = require('../models/Student');
const Performance = require('../models/Performance');
const { generateContent } = require('../utils/gemini');

/**
 * Study Group Orchestrator - Coordinates multiple AI agent personas
 * to create an adaptive, engaging learning experience.
 */
class StudyGroupOrchestrator {
    constructor(studentId) {
        this.studentId = studentId || 'demo_student';
        this.agents = {
            quizmaster: new QuizmasterAgent(),
            explainer: new ExplainerAgent(),
            advocate: new DevilsAdvocateAgent(),
            motivator: new MotivatorAgent()
        };
        this.currentSession = null;
    }

    /**
     * Initialize or resume a study session
     * @param {string} sessionId - Unique session identifier
     * @param {Object} options - Session options
     */
    async initSession(sessionId, options = {}) {
        // Try to find existing session
        let session = await AgentConversation.findOne({ sessionId });

        if (!session) {
            session = new AgentConversation({
                studentId: this.studentId,
                sessionId,
                topic: options.topic || null,
                activeAgent: null,
                messages: [],
                handoffs: []
            });
            await session.save();
        }

        this.currentSession = session;
        return session;
    }

    /**
     * Get aggregated context for agent decision-making
     * @returns {Promise<Object>} - Comprehensive context object
     */
    async getContext() {
        const student = await Student.findOne({ studentId: this.studentId });

        // Get recent performance data
        const recentPerformance = await Performance.find({ studentId: this.studentId })
            .sort({ completedAt: -1 })
            .limit(10)
            .lean();

        // Calculate metrics
        const recentScores = recentPerformance.map(p => p.score);
        const averageScore = recentScores.length > 0
            ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
            : null;

        // Session duration
        const sessionDuration = this.currentSession
            ? Math.floor((Date.now() - new Date(this.currentSession.sessionMetrics.startTime).getTime()) / 60000)
            : 0;

        // Count consecutive correct/wrong in current session
        let consecutiveCorrect = 0;
        let consecutiveWrong = 0;
        if (this.currentSession?.messages) {
            const quizMessages = this.currentSession.messages.filter(m => m.metadata?.isCorrect !== undefined);
            for (let i = quizMessages.length - 1; i >= 0; i--) {
                if (quizMessages[i].metadata.isCorrect) {
                    consecutiveCorrect++;
                } else {
                    break;
                }
            }
            for (let i = quizMessages.length - 1; i >= 0; i--) {
                if (!quizMessages[i].metadata.isCorrect) {
                    consecutiveWrong++;
                } else {
                    break;
                }
            }
        }

        return {
            student,
            topic: this.currentSession?.topic || null,
            recentScore: averageScore,
            weakTopics: student?.weakTopics || [],
            streakDays: student?.engagementMetrics?.streakDays || 0,
            sessionDuration,
            consecutiveCorrect,
            consecutiveWrong,
            lastAgent: this.currentSession?.activeAgent || null,
            messageCount: this.currentSession?.messages?.length || 0,
            explanationStyle: student?.agentPreferences?.preferredExplanationStyle || 'analogies',
            history: this.currentSession?.messages?.slice(-10) || [] // Last 10 messages for context
        };
    }

    /**
     * Calculate agent selection scores based on context
     * @param {Object} context - Current session context
     * @returns {Object} - Scores for each agent
     */
    calculateAgentScores(context) {
        const scores = {
            quizmaster: 50, // Base score - quizmaster is default
            explainer: 0,
            advocate: 0,
            motivator: 0
        };

        // Performance-based scoring
        if (context.recentScore !== null) {
            if (context.recentScore < 50) {
                scores.explainer += 60;
                scores.quizmaster -= 20;
            } else if (context.recentScore < 70) {
                scores.explainer += 30;
                scores.quizmaster += 20;
            } else if (context.recentScore > 85) {
                scores.advocate += 50;
                scores.quizmaster -= 10;
            }
        }

        // Consecutive answer patterns
        if (context.consecutiveWrong >= 3) {
            scores.explainer += 70;
            scores.motivator += 20;
        }
        if (context.consecutiveCorrect >= 5) {
            scores.advocate += 60;
            scores.motivator += 30; // Celebrate streak
        }

        // Time-based checks
        if (context.sessionDuration > 90) {
            scores.motivator += 80; // Suggest break
        } else if (context.sessionDuration > 60) {
            scores.motivator += 30;
        }

        // Streak celebration
        if (context.streakDays >= 7 && context.messageCount < 3) {
            scores.motivator += 50; // Celebrate at session start
        }

        // Last agent cooldown (avoid repetition)
        if (context.lastAgent) {
            scores[context.lastAgent] -= 20;
        }

        // First message defaults
        if (context.messageCount === 0) {
            // New session - let orchestrator introduce
            scores.quizmaster = 40;
            scores.explainer = 30;
        }

        return scores;
    }

    /**
     * Select the best agent based on scores
     * @param {Object} scores - Agent scores
     * @returns {string} - Selected agent type
     */
    selectAgent(scores) {
        let bestAgent = 'quizmaster';
        let bestScore = scores.quizmaster;

        for (const [agent, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestAgent = agent;
            }
        }

        return bestAgent;
    }

    /**
     * Detect student intent from their message
     * @param {string} message - Student's message
     * @returns {Promise<Object>} - Detected intent
     */
    async detectIntent(message) {
        const lowerMessage = message.toLowerCase();

        // Quick pattern matching for common intents
        if (/explain|help|understand|what is|how does|why/i.test(lowerMessage)) {
            return { intent: 'explain', confidence: 0.9 };
        }
        if (/quiz|test|question|practice/i.test(lowerMessage)) {
            return { intent: 'quiz', confidence: 0.9 };
        }
        if (/challenge|hard|difficult|more/i.test(lowerMessage)) {
            return { intent: 'challenge', confidence: 0.8 };
        }
        if (/tired|break|rest|overwhelmed|frustrated/i.test(lowerMessage)) {
            return { intent: 'break', confidence: 0.9 };
        }
        if (/answer is|my answer|i think/i.test(lowerMessage)) {
            return { intent: 'answer', confidence: 0.9 };
        }

        // Use AI for ambiguous intents
        const prompt = `Classify the student's intent from this message: "${message}"
Intent options: explain, quiz, challenge, break, answer, greeting, topic_change, other
Return JSON: { "intent": "...", "confidence": 0.0-1.0, "topic": "detected topic if any" }`;

        try {
            const response = await generateContent(prompt, false);
            return JSON.parse(response.replace(/```json|```/g, '').trim());
        } catch {
            return { intent: 'other', confidence: 0.5 };
        }
    }

    /**
     * Main entry point - process student input and generate response
     * @param {string} message - Student's message
     * @param {Object} sessionOptions - Session configuration
     */
    async processStudentInput(message, sessionOptions = {}) {
        const { sessionId, topic } = sessionOptions;

        // Initialize or get session
        await this.initSession(sessionId || `session_${Date.now()}`, { topic });

        // Record student message
        this.currentSession.messages.push({
            agent: 'student',
            content: message,
            timestamp: new Date(),
            metadata: { topic }
        });

        // Get context and detect intent
        const context = await this.getContext();
        const intent = await this.detectIntent(message);

        // Override agent selection based on explicit intent
        let scores = this.calculateAgentScores(context);

        if (intent.intent === 'explain' && intent.confidence > 0.7) {
            scores.explainer += 100;
        } else if (intent.intent === 'quiz' && intent.confidence > 0.7) {
            scores.quizmaster += 100;
        } else if (intent.intent === 'challenge' && intent.confidence > 0.7) {
            scores.advocate += 100;
        } else if (intent.intent === 'break' && intent.confidence > 0.7) {
            scores.motivator += 100;
        }

        // Select and activate agent
        const selectedAgentType = this.selectAgent(scores);
        const selectedAgent = this.agents[selectedAgentType];

        // Record handoff if agent changed
        let handoffReason = null;
        if (this.currentSession.activeAgent && this.currentSession.activeAgent !== selectedAgentType) {
            handoffReason = `Student intent: ${intent.intent}, context-based selection`;
            this.currentSession.handoffs.push({
                from: this.currentSession.activeAgent,
                to: selectedAgentType,
                reason: handoffReason,
                context: {
                    topic: context.topic,
                    studentConfidence: intent.confidence
                },
                timestamp: new Date()
            });
        }

        this.currentSession.activeAgent = selectedAgentType;

        // Generate response
        const response = await selectedAgent.generateResponse(message, {
            ...context,
            topic: topic || context.topic,
            studentIntent: intent.intent
        });

        // Check if agent wants to hand off
        const handoffRecommendation = response.metadata.suggestedHandoff;

        // Record agent response
        this.currentSession.messages.push({
            agent: selectedAgentType,
            content: response.content,
            timestamp: new Date(),
            metadata: response.metadata
        });

        // Update topic if detected
        if (intent.topic && !this.currentSession.topic) {
            this.currentSession.topic = intent.topic;
        }

        await this.currentSession.save();

        // Update student engagement
        await this.updateStudentEngagement();

        // Calculate topic mastery for progress indicator
        const masteryData = this.calculateTopicMastery();

        return {
            sessionId: this.currentSession.sessionId,
            agent: selectedAgentType,
            agentName: response.agentName,
            message: response.content,
            metadata: {
                ...response.metadata,
                sessionDuration: context.sessionDuration,
                messageCount: this.currentSession.messages.length,
                handoffHistory: this.currentSession.handoffs.slice(-3)
            },
            suggestedHandoff: handoffRecommendation,
            masteryProgress: masteryData
        };
    }

    /**
     * Score a quiz answer and trigger automatic handoff if high score
     * @param {string} question - The quiz question
     * @param {string} studentAnswer - Student's answer
     * @param {string} correctAnswer - Correct answer (optional)
     * @param {Object} options - Additional options
     */
    async scoreQuizAnswer(question, studentAnswer, correctAnswer, options = {}) {
        const { sessionId, topic } = options;

        await this.initSession(sessionId, { topic });

        // Use AI to evaluate free-form answers
        const evaluationPrompt = `You are evaluating a student's answer.

QUESTION: ${question}
STUDENT'S ANSWER: ${studentAnswer}
${correctAnswer ? `EXPECTED ANSWER: ${correctAnswer}` : ''}

Evaluate the answer and respond with JSON:
{
  "isCorrect": true/false,
  "score": 0-100 (percentage score),
  "feedback": "Brief feedback message",
  "understanding": "deep/surface/unclear"
}

Be fair but rigorous. A partially correct answer should get partial credit.`;

        let evaluation;
        try {
            const response = await generateContent(evaluationPrompt, false);
            const jsonStr = response.replace(/```json|```/g, '').trim();
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            evaluation = JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
        } catch (error) {
            console.error('Evaluation parse error:', error);
            // Fallback evaluation
            evaluation = {
                isCorrect: false,
                score: 0,
                feedback: 'Unable to evaluate answer. Please try again.',
                understanding: 'unclear'
            };
        }

        // Record the answer with scoring metadata
        this.currentSession.messages.push({
            agent: 'student',
            content: studentAnswer,
            timestamp: new Date(),
            metadata: {
                isAnswer: true,
                question,
                isCorrect: evaluation.isCorrect,
                score: evaluation.score,
                feedback: evaluation.feedback
            }
        });

        // Update session quiz metrics
        if (!this.currentSession.quizMetrics) {
            this.currentSession.quizMetrics = {
                totalQuestions: 0,
                correctAnswers: 0,
                scores: [],
                lastScore: null
            };
        }

        this.currentSession.quizMetrics.totalQuestions += 1;
        if (evaluation.isCorrect) {
            this.currentSession.quizMetrics.correctAnswers += 1;
        }
        this.currentSession.quizMetrics.scores.push(evaluation.score);
        this.currentSession.quizMetrics.lastScore = evaluation.score;

        // Calculate rolling average
        const recentScores = this.currentSession.quizMetrics.scores.slice(-5);
        const averageScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

        // Check for auto-handoff to Devil's Advocate on high scores
        let autoHandoff = null;
        const consecutiveCorrect = this.countConsecutiveCorrect();

        if (averageScore >= 85 && consecutiveCorrect >= 3) {
            // High performer - bring in the Challenger!
            autoHandoff = {
                to: 'advocate',
                reason: `🔥 Impressive! ${consecutiveCorrect} correct answers in a row with ${Math.round(averageScore)}% average. Time for a real challenge!`,
                thinking: [
                    `Analyzing: Student scored ${evaluation.score}% on this question`,
                    `Rolling average: ${Math.round(averageScore)}% over last ${recentScores.length} questions`,
                    `Consecutive correct: ${consecutiveCorrect}`,
                    `Decision: Score > 85% threshold → Engaging Devil's Advocate for mastery testing`
                ]
            };

            // Execute the handoff
            this.currentSession.handoffs.push({
                from: 'quizmaster',
                to: 'advocate',
                reason: autoHandoff.reason,
                context: {
                    averageScore,
                    consecutiveCorrect,
                    topic: this.currentSession.topic
                },
                timestamp: new Date()
            });

            this.currentSession.activeAgent = 'advocate';

            // Get Devil's Advocate intro
            const advocate = this.agents.advocate;
            const challengeGreeting = advocate.getGreeting({
                topic: this.currentSession.topic,
                studentPerformance: { averageScore, consecutiveCorrect }
            });

            this.currentSession.messages.push({
                agent: 'advocate',
                content: challengeGreeting,
                timestamp: new Date(),
                metadata: {
                    handoffFrom: 'quizmaster',
                    reason: 'High performance auto-handoff'
                }
            });
        }

        await this.currentSession.save();

        // Calculate mastery progress
        const masteryData = this.calculateTopicMastery();

        return {
            sessionId: this.currentSession.sessionId,
            isCorrect: evaluation.isCorrect,
            score: evaluation.score,
            feedback: evaluation.feedback,
            quizMetrics: {
                total: this.currentSession.quizMetrics.totalQuestions,
                correct: this.currentSession.quizMetrics.correctAnswers,
                accuracy: Math.round((this.currentSession.quizMetrics.correctAnswers / this.currentSession.quizMetrics.totalQuestions) * 100),
                averageScore: Math.round(averageScore),
                consecutiveCorrect
            },
            autoHandoff,
            masteryProgress: masteryData
        };
    }

    /**
     * Count consecutive correct answers
     */
    countConsecutiveCorrect() {
        let count = 0;
        const messages = this.currentSession.messages || [];

        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.metadata?.isAnswer) {
                if (msg.metadata.isCorrect) {
                    count++;
                } else {
                    break;
                }
            }
        }

        return count;
    }

    /**
     * Calculate topic mastery progress based on session performance
     */
    calculateTopicMastery() {
        if (!this.currentSession) return null;

        const messages = this.currentSession.messages || [];
        const quizMessages = messages.filter(m => m.metadata?.isAnswer);

        if (quizMessages.length === 0) {
            return {
                level: 'beginner',
                percentage: 0,
                questionsAnswered: 0,
                correctAnswers: 0,
                milestones: {
                    understanding: false,
                    practicing: false,
                    proficient: false,
                    mastered: false
                }
            };
        }

        const correctCount = quizMessages.filter(m => m.metadata.isCorrect).length;
        const accuracy = (correctCount / quizMessages.length) * 100;
        const totalAnswered = quizMessages.length;

        // Calculate mastery level based on accuracy and volume
        let level = 'beginner';
        let percentage = 0;

        if (totalAnswered >= 1 && accuracy >= 0) {
            level = 'understanding';
            percentage = Math.min(25, totalAnswered * 5);
        }
        if (totalAnswered >= 3 && accuracy >= 50) {
            level = 'practicing';
            percentage = 25 + Math.min(25, (accuracy - 50) * 0.5);
        }
        if (totalAnswered >= 5 && accuracy >= 70) {
            level = 'proficient';
            percentage = 50 + Math.min(25, (accuracy - 70) * 0.8);
        }
        if (totalAnswered >= 8 && accuracy >= 85) {
            level = 'mastered';
            percentage = 75 + Math.min(25, (accuracy - 85) * 1.5);
        }

        return {
            level,
            percentage: Math.round(Math.min(100, percentage)),
            questionsAnswered: totalAnswered,
            correctAnswers: correctCount,
            accuracy: Math.round(accuracy),
            milestones: {
                understanding: percentage >= 25,
                practicing: percentage >= 50,
                proficient: percentage >= 75,
                mastered: percentage >= 95
            }
        };
    }

    /**
     * Trigger a specific agent manually (for demos)
     * @param {string} agentType - Agent to trigger
     * @param {Object} options - Options including topic
     */
    async triggerAgent(agentType, options = {}) {
        if (!this.agents[agentType]) {
            throw new Error(`Unknown agent type: ${agentType}`);
        }

        const sessionId = options.sessionId || `demo_${Date.now()}`;
        await this.initSession(sessionId, options);

        const context = await this.getContext();
        const agent = this.agents[agentType];

        // Get agent greeting
        const greeting = agent.getGreeting({ ...context, topic: options.topic });

        // Record activation
        if (this.currentSession.activeAgent !== agentType) {
            this.currentSession.handoffs.push({
                from: this.currentSession.activeAgent || 'orchestrator',
                to: agentType,
                reason: 'Manual trigger',
                timestamp: new Date()
            });
        }

        this.currentSession.activeAgent = agentType;
        this.currentSession.messages.push({
            agent: agentType,
            content: greeting,
            timestamp: new Date(),
            metadata: { topic: options.topic }
        });

        await this.currentSession.save();

        return {
            sessionId,
            agent: agentType,
            agentName: agent.persona.name,
            message: greeting
        };
    }

    /**
     * Execute a handoff between agents
     * @param {string} toAgent - Target agent
     * @param {Object} handoffContext - Context to pass
     */
    async executeHandoff(toAgent, handoffContext = {}) {
        if (!this.agents[toAgent]) {
            throw new Error(`Unknown agent: ${toAgent}`);
        }

        const fromAgent = this.currentSession.activeAgent;

        // Record handoff
        this.currentSession.handoffs.push({
            from: fromAgent,
            to: toAgent,
            reason: handoffContext.reason || 'Agent initiated handoff',
            context: handoffContext,
            timestamp: new Date()
        });

        this.currentSession.activeAgent = toAgent;

        // Generate handoff greeting from new agent
        const context = await this.getContext();
        const newAgent = this.agents[toAgent];
        const greeting = newAgent.getGreeting({ ...context, ...handoffContext });

        this.currentSession.messages.push({
            agent: toAgent,
            content: greeting,
            timestamp: new Date(),
            metadata: { handoffFrom: fromAgent }
        });

        await this.currentSession.save();

        return {
            success: true,
            fromAgent,
            toAgent,
            message: greeting
        };
    }

    /**
     * Update student engagement metrics
     */
    async updateStudentEngagement() {
        const student = await Student.findOne({ studentId: this.studentId });
        if (!student) return;

        // Update last active
        student.engagementMetrics.lastActiveAt = new Date();

        // Update streak (simple logic - check if studied yesterday)
        const lastActive = student.engagementMetrics.lastActiveAt;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastActive && lastActive.toDateString() === yesterday.toDateString()) {
            student.engagementMetrics.streakDays += 1;
        } else if (!lastActive || lastActive.toDateString() !== new Date().toDateString()) {
            // Reset streak if more than a day gap
            const daysSinceActive = Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceActive > 1) {
                student.engagementMetrics.streakDays = 1;
            }
        }

        await student.save();
    }

    /**
     * Get conversation history for a session
     * @param {string} sessionId - Session ID
     */
    async getSessionHistory(sessionId) {
        const session = await AgentConversation.findOne({ sessionId });
        if (!session) return null;

        return {
            sessionId: session.sessionId,
            topic: session.topic,
            status: session.status,
            activeAgent: session.activeAgent,
            messages: session.messages,
            handoffs: session.handoffs,
            metrics: session.sessionMetrics
        };
    }
}

module.exports = StudyGroupOrchestrator;
