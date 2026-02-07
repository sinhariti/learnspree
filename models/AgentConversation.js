const mongoose = require('mongoose');

/**
 * Schema for storing agent conversations and handoffs.
 * Tracks multi-agent interactions with students.
 */
const AgentConversationSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    topic: {
        type: String,
        default: null
    },
    messages: [{
        agent: {
            type: String,
            enum: ['quizmaster', 'explainer', 'advocate', 'motivator', 'student', 'orchestrator'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        metadata: {
            topic: String,
            intent: String,
            confidence: Number,
            questionId: String,
            isCorrect: Boolean,
            // Quiz scoring fields
            isAnswer: Boolean,
            question: String,
            score: Number,
            feedback: String,
            understanding: String,
            handoffFrom: String,
            reason: String
        }
    }],
    handoffs: [{
        from: {
            type: String,
            enum: ['quizmaster', 'explainer', 'advocate', 'motivator', 'orchestrator']
        },
        to: {
            type: String,
            enum: ['quizmaster', 'explainer', 'advocate', 'motivator']
        },
        reason: String,
        context: {
            topic: String,
            studentConfidence: Number,
            suggestedDifficulty: String,
            keyPointsCovered: [String]
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['active', 'completed', 'paused'],
        default: 'active'
    },
    activeAgent: {
        type: String,
        enum: ['quizmaster', 'explainer', 'advocate', 'motivator', null],
        default: null
    },
    sessionMetrics: {
        startTime: {
            type: Date,
            default: Date.now
        },
        endTime: Date,
        totalMessages: {
            type: Number,
            default: 0
        },
        agentSwitches: {
            type: Number,
            default: 0
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save (Mongoose 9+ compatible - no next callback)
AgentConversationSchema.pre('save', function () {
    this.updatedAt = new Date();
    this.sessionMetrics.totalMessages = this.messages.length;
    this.sessionMetrics.agentSwitches = this.handoffs.length;
});

// Index for efficient queries
AgentConversationSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('AgentConversation', AgentConversationSchema);
