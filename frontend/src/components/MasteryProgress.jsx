import React from 'react';

/**
 * Mastery Progress Component
 * Displays visual progress indicator for topic mastery
 */
const MasteryProgress = ({ masteryData, topic }) => {
    if (!masteryData) return null;

    const { level, percentage, questionsAnswered, correctAnswers, accuracy, milestones } = masteryData;

    const levelConfig = {
        beginner: { emoji: '🌱', color: '#6b7280', label: 'Just Started' },
        understanding: { emoji: '📖', color: '#3b82f6', label: 'Understanding' },
        practicing: { emoji: '🎯', color: '#f59e0b', label: 'Practicing' },
        proficient: { emoji: '⭐', color: '#10b981', label: 'Proficient' },
        mastered: { emoji: '🏆', color: '#8b5cf6', label: 'Mastered' }
    };

    const config = levelConfig[level] || levelConfig.beginner;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.emoji}>{config.emoji}</span>
                <div style={styles.headerText}>
                    <span style={styles.topic}>{topic || 'Topic'} Mastery</span>
                    <span style={{ ...styles.level, color: config.color }}>{config.label}</span>
                </div>
                <span style={styles.percentage}>{percentage}%</span>
            </div>

            {/* Progress Bar */}
            <div style={styles.progressContainer}>
                <div style={styles.progressTrack}>
                    <div
                        style={{
                            ...styles.progressFill,
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, ${config.color}80 0%, ${config.color} 100%)`
                        }}
                    />
                    {/* Milestones */}
                    {[25, 50, 75, 100].map((milestone, index) => (
                        <div
                            key={milestone}
                            style={{
                                ...styles.milestone,
                                left: `${milestone}%`,
                                backgroundColor: percentage >= milestone ? config.color : '#374151'
                            }}
                        >
                            {percentage >= milestone && (
                                <span style={styles.milestoneCheck}>✓</span>
                            )}
                        </div>
                    ))}
                </div>
                <div style={styles.milestoneLabels}>
                    <span style={{ opacity: milestones?.understanding ? 1 : 0.4 }}>Understanding</span>
                    <span style={{ opacity: milestones?.practicing ? 1 : 0.4 }}>Practicing</span>
                    <span style={{ opacity: milestones?.proficient ? 1 : 0.4 }}>Proficient</span>
                    <span style={{ opacity: milestones?.mastered ? 1 : 0.4 }}>Mastered</span>
                </div>
            </div>

            {/* Stats */}
            <div style={styles.stats}>
                <div style={styles.stat}>
                    <span style={styles.statValue}>{questionsAnswered || 0}</span>
                    <span style={styles.statLabel}>Questions</span>
                </div>
                <div style={styles.stat}>
                    <span style={styles.statValue}>{correctAnswers || 0}</span>
                    <span style={styles.statLabel}>Correct</span>
                </div>
                <div style={styles.stat}>
                    <span style={{ ...styles.statValue, color: accuracy >= 70 ? '#10b981' : accuracy >= 50 ? '#f59e0b' : '#ef4444' }}>
                        {accuracy || 0}%
                    </span>
                    <span style={styles.statLabel}>Accuracy</span>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: '#111317',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #2d333d'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
    },
    emoji: {
        fontSize: '28px'
    },
    headerText: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    topic: {
        color: '#fff',
        fontSize: '14px',
        fontWeight: '600'
    },
    level: {
        fontSize: '12px',
        fontWeight: '500'
    },
    percentage: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#fff'
    },
    progressContainer: {
        marginBottom: '16px'
    },
    progressTrack: {
        height: '8px',
        backgroundColor: '#1f2937',
        borderRadius: '4px',
        position: 'relative',
        overflow: 'visible'
    },
    progressFill: {
        height: '100%',
        borderRadius: '4px',
        transition: 'width 0.5s ease'
    },
    milestone: {
        position: 'absolute',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: '2px solid #111317',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    milestoneCheck: {
        fontSize: '10px',
        color: '#fff'
    },
    milestoneLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '8px',
        fontSize: '10px',
        color: '#9ca3af',
        paddingLeft: '20px',
        paddingRight: '0'
    },
    stats: {
        display: 'flex',
        justifyContent: 'space-around',
        borderTop: '1px solid #2d333d',
        paddingTop: '12px'
    },
    stat: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    statValue: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#fff'
    },
    statLabel: {
        fontSize: '11px',
        color: '#6b7280'
    }
};

export default MasteryProgress;
