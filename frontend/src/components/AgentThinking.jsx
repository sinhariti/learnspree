import React, { useState, useEffect } from 'react';

/**
 * Agent Thinking Animation Component
 * Shows animated thinking steps when agents are reasoning about handoffs
 */
const AgentThinking = ({ thinkingSteps, agentType, onComplete }) => {
    const [visibleSteps, setVisibleSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    const agentConfig = {
        quizmaster: { name: 'Professor Quiz', emoji: '🎯', color: '#3b82f6' },
        explainer: { name: 'Dr. Clarity', emoji: '📚', color: '#10b981' },
        advocate: { name: 'The Challenger', emoji: '😈', color: '#8b5cf6' },
        motivator: { name: 'Coach Spark', emoji: '💪', color: '#f59e0b' },
        orchestrator: { name: 'Orchestrator', emoji: '🧠', color: '#6366f1' }
    };

    const config = agentConfig[agentType] || agentConfig.orchestrator;

    useEffect(() => {
        if (!thinkingSteps || thinkingSteps.length === 0) {
            onComplete?.();
            return;
        }

        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev < thinkingSteps.length) {
                    setVisibleSteps(steps => [...steps, thinkingSteps[prev]]);
                    return prev + 1;
                } else {
                    clearInterval(interval);
                    setIsComplete(true);
                    setTimeout(() => onComplete?.(), 1000);
                    return prev;
                }
            });
        }, 800);

        return () => clearInterval(interval);
    }, [thinkingSteps, onComplete]);

    if (!thinkingSteps || thinkingSteps.length === 0) return null;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.brainAnimation}>
                    <span style={styles.brainEmoji}>🧠</span>
                    <div style={{ ...styles.pulseRing, borderColor: config.color }} />
                </div>
                <span style={styles.title}>Agent Reasoning...</span>
            </div>

            <div style={styles.stepsContainer}>
                {visibleSteps.map((step, index) => (
                    <div
                        key={index}
                        style={{
                            ...styles.step,
                            animation: 'fadeSlideIn 0.4s ease forwards',
                            borderLeftColor: config.color
                        }}
                    >
                        <span style={styles.stepIcon}>
                            {index === visibleSteps.length - 1 && !isComplete ? '⏳' : '✓'}
                        </span>
                        <span style={styles.stepText}>{step}</span>
                    </div>
                ))}

                {!isComplete && currentStep < thinkingSteps.length && (
                    <div style={styles.loadingStep}>
                        <div style={styles.dots}>
                            <span style={{ ...styles.dot, animationDelay: '0ms' }}>●</span>
                            <span style={{ ...styles.dot, animationDelay: '200ms' }}>●</span>
                            <span style={{ ...styles.dot, animationDelay: '400ms' }}>●</span>
                        </div>
                    </div>
                )}
            </div>

            {isComplete && (
                <div style={{ ...styles.decision, borderColor: config.color }}>
                    <span style={styles.decisionIcon}>{config.emoji}</span>
                    <span style={styles.decisionText}>
                        Handing off to {config.name}
                    </span>
                </div>
            )}

            <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #4f46e5',
        alignSelf: 'center',
        maxWidth: '90%'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
    },
    brainAnimation: {
        position: 'relative',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    brainEmoji: {
        fontSize: '20px',
        zIndex: 1
    },
    pulseRing: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        border: '2px solid',
        animation: 'pulse 1.5s infinite'
    },
    title: {
        color: '#a5b4fc',
        fontSize: '14px',
        fontWeight: '600'
    },
    stepsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    step: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        borderLeft: '3px solid'
    },
    stepIcon: {
        fontSize: '12px',
        color: '#10b981'
    },
    stepText: {
        color: '#e5e7eb',
        fontSize: '13px',
        lineHeight: '1.4'
    },
    loadingStep: {
        padding: '8px 12px'
    },
    dots: {
        display: 'flex',
        gap: '4px'
    },
    dot: {
        color: '#6366f1',
        fontSize: '10px',
        animation: 'bounce 0.6s infinite'
    },
    decision: {
        marginTop: '12px',
        padding: '12px',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderRadius: '8px',
        border: '1px solid',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    decisionIcon: {
        fontSize: '24px'
    },
    decisionText: {
        color: '#fff',
        fontSize: '14px',
        fontWeight: '600'
    }
};

export default AgentThinking;
