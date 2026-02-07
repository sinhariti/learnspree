import React from 'react';

/**
 * Agent Avatar Component
 * Displays a visual representation of each AI agent persona
 */
const AgentAvatar = ({ agent, isActive, isTyping, size = 'medium' }) => {
    const agentConfig = {
        quizmaster: {
            name: 'Professor Quiz',
            emoji: '🎯',
            color: '#3b82f6', // Blue
            bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            description: 'Tests your knowledge'
        },
        explainer: {
            name: 'Dr. Clarity',
            emoji: '📚',
            color: '#10b981', // Green
            bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            description: 'Explains concepts'
        },
        advocate: {
            name: 'The Challenger',
            emoji: '😈',
            color: '#8b5cf6', // Purple
            bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            description: 'Challenges mastery'
        },
        motivator: {
            name: 'Coach Spark',
            emoji: '💪',
            color: '#f59e0b', // Orange
            bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            description: 'Keeps you motivated'
        },
        student: {
            name: 'You',
            emoji: '👤',
            color: '#6b7280', // Gray
            bgGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
            description: ''
        }
    };

    const config = agentConfig[agent] || agentConfig.student;

    const sizeStyles = {
        small: { width: 32, height: 32, fontSize: '16px' },
        medium: { width: 48, height: 48, fontSize: '24px' },
        large: { width: 64, height: 64, fontSize: '32px' }
    };

    const sizeStyle = sizeStyles[size] || sizeStyles.medium;

    return (
        <div style={styles.container}>
            <div
                style={{
                    ...styles.avatar,
                    ...sizeStyle,
                    background: config.bgGradient,
                    boxShadow: isActive ? `0 0 20px ${config.color}50` : 'none',
                    animation: isTyping ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }}
            >
                <span style={styles.emoji}>{config.emoji}</span>
                {isActive && <div style={{ ...styles.activeIndicator, backgroundColor: config.color }} />}
            </div>
            {size !== 'small' && (
                <div style={styles.info}>
                    <span style={{ ...styles.name, color: config.color }}>{config.name}</span>
                    {config.description && (
                        <span style={styles.description}>{config.description}</span>
                    )}
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    avatar: {
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.3s ease'
    },
    emoji: {
        userSelect: 'none'
    },
    activeIndicator: {
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: '2px solid #1c1f26'
    },
    info: {
        display: 'flex',
        flexDirection: 'column'
    },
    name: {
        fontWeight: '600',
        fontSize: '14px'
    },
    description: {
        fontSize: '12px',
        color: '#9ca3af'
    }
};

export default AgentAvatar;
