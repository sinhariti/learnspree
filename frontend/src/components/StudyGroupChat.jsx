import React, { useState, useRef, useEffect } from 'react';
import AgentAvatar from './AgentAvatar';
import MasteryProgress from './MasteryProgress';
import AgentThinking from './AgentThinking';

const API_BASE = 'http://localhost:5001/api';

/**
 * Study Group Chat Component
 * Interactive chat interface with multiple AI agent personas
 */
function StudyGroupChat({ onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeAgent, setActiveAgent] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [topic, setTopic] = useState('');
    const [showTopicInput, setShowTopicInput] = useState(true);
    const [handoffs, setHandoffs] = useState([]);
    const [masteryData, setMasteryData] = useState(null);
    const [thinkingSteps, setThinkingSteps] = useState(null);
    const [showThinking, setShowThinking] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, showThinking]);

    const startSession = async () => {
        if (!topic.trim()) return;

        setShowTopicInput(false);
        setIsLoading(true);

        try {
            // Trigger explainer to start the session
            const response = await fetch(`${API_BASE}/study-group/trigger/explainer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: 'demo_student',
                    topic: topic.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                setSessionId(data.sessionId);
                setActiveAgent(data.agent);
                setMessages([{
                    agent: data.agent,
                    agentName: data.agentName,
                    content: data.message,
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Failed to start study session. Please ensure the backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue('');

        // Add user message to chat
        setMessages(prev => [...prev, {
            agent: 'student',
            content: userMessage,
            timestamp: new Date()
        }]);

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/study-group/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: 'demo_student',
                    message: userMessage,
                    sessionId,
                    topic
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update mastery data if available
                if (data.masteryProgress) {
                    setMasteryData(data.masteryProgress);
                }

                // Check for agent change (handoff)
                if (activeAgent && data.agent !== activeAgent) {
                    setHandoffs(prev => [...prev, {
                        from: activeAgent,
                        to: data.agent,
                        timestamp: new Date()
                    }]);

                    // Add handoff notification with thinking animation if available
                    if (data.thinkingSteps && data.thinkingSteps.length > 0) {
                        setThinkingSteps(data.thinkingSteps);
                        setShowThinking(true);
                    } else {
                        setMessages(prev => [...prev, {
                            type: 'handoff',
                            from: activeAgent,
                            to: data.agent,
                            timestamp: new Date()
                        }]);
                    }
                }

                setActiveAgent(data.agent);

                // Add agent response (delayed if showing thinking)
                if (showThinking) {
                    // Response will be added after thinking animation
                } else {
                    setMessages(prev => [...prev, {
                        agent: data.agent,
                        agentName: data.agentName,
                        content: data.message,
                        timestamp: new Date(),
                        metadata: data.metadata
                    }]);
                }
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [...prev, {
                type: 'error',
                content: 'Failed to get response. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleThinkingComplete = () => {
        setShowThinking(false);
        setThinkingSteps(null);
        // The handoff notification was already added, agent response should follow
    };

    const triggerAgent = async (agentType) => {
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/study-group/trigger/${agentType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: 'demo_student',
                    topic,
                    sessionId
                })
            });

            const data = await response.json();

            if (data.success) {
                if (activeAgent && data.agent !== activeAgent) {
                    setMessages(prev => [...prev, {
                        type: 'handoff',
                        from: activeAgent,
                        to: data.agent,
                        timestamp: new Date()
                    }]);
                }

                setActiveAgent(data.agent);
                setMessages(prev => [...prev, {
                    agent: data.agent,
                    agentName: data.agentName,
                    content: data.message,
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Failed to trigger agent:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (showTopicInput) {
                startSession();
            } else {
                sendMessage();
            }
        }
    };

    const renderMessage = (msg, index) => {
        if (msg.type === 'handoff') {
            return (
                <div key={index} style={styles.handoffNotification}>
                    <span style={styles.handoffIcon}>🔄</span>
                    <span>Handing off from <strong>{getAgentName(msg.from)}</strong> to <strong>{getAgentName(msg.to)}</strong></span>
                </div>
            );
        }

        if (msg.type === 'error') {
            return (
                <div key={index} style={styles.errorMessage}>
                    ⚠️ {msg.content}
                </div>
            );
        }

        const isStudent = msg.agent === 'student';

        return (
            <div key={index} style={{
                ...styles.messageContainer,
                justifyContent: isStudent ? 'flex-end' : 'flex-start'
            }}>
                {!isStudent && (
                    <AgentAvatar agent={msg.agent} size="small" isActive={msg.agent === activeAgent} />
                )}
                <div style={{
                    ...styles.messageBubble,
                    ...(isStudent ? styles.studentBubble : styles.agentBubble),
                    borderColor: getAgentColor(msg.agent)
                }}>
                    {!isStudent && (
                        <div style={{ ...styles.agentNameInBubble, color: getAgentColor(msg.agent) }}>
                            {msg.agentName}
                        </div>
                    )}
                    <div style={styles.messageContent}>{msg.content}</div>
                    <div style={styles.timestamp}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        );
    };

    const getAgentColor = (agent) => {
        const colors = {
            quizmaster: '#3b82f6',
            explainer: '#10b981',
            advocate: '#8b5cf6',
            motivator: '#f59e0b',
            student: '#6b7280'
        };
        return colors[agent] || '#6b7280';
    };

    const getAgentName = (agent) => {
        const names = {
            quizmaster: 'Professor Quiz',
            explainer: 'Dr. Clarity',
            advocate: 'The Challenger',
            motivator: 'Coach Spark'
        };
        return names[agent] || agent;
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <h2 style={styles.title}>🎓 AI Study Group</h2>
                        {topic && <span style={styles.topicBadge}>{topic}</span>}
                    </div>
                    <button onClick={onClose} style={styles.closeButton}>×</button>
                </div>

                {/* Agent Bar */}
                {!showTopicInput && (
                    <div style={styles.agentBar}>
                        <span style={styles.agentBarLabel}>Switch Agent:</span>
                        <div style={styles.agentButtons}>
                            {['quizmaster', 'explainer', 'advocate', 'motivator'].map(agent => (
                                <button
                                    key={agent}
                                    onClick={() => triggerAgent(agent)}
                                    disabled={isLoading}
                                    style={{
                                        ...styles.agentButton,
                                        borderColor: getAgentColor(agent),
                                        backgroundColor: activeAgent === agent ? getAgentColor(agent) + '20' : 'transparent'
                                    }}
                                >
                                    <AgentAvatar agent={agent} size="small" isActive={activeAgent === agent} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mastery Progress Bar */}
                {!showTopicInput && masteryData && masteryData.questionsAnswered > 0 && (
                    <div style={styles.masteryContainer}>
                        <MasteryProgress masteryData={masteryData} topic={topic} />
                    </div>
                )}

                {/* Messages Area */}
                <div style={styles.messagesArea}>
                    {showTopicInput ? (
                        <div style={styles.welcomeScreen}>
                            <div style={styles.welcomeEmoji}>🎓</div>
                            <h3 style={styles.welcomeTitle}>Welcome to Your AI Study Group!</h3>
                            <p style={styles.welcomeText}>
                                You'll be learning with a team of AI tutors who adapt to your needs:
                            </p>
                            <div style={styles.agentIntro}>
                                <AgentAvatar agent="explainer" size="medium" />
                                <AgentAvatar agent="quizmaster" size="medium" />
                                <AgentAvatar agent="advocate" size="medium" />
                                <AgentAvatar agent="motivator" size="medium" />
                            </div>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="What topic would you like to study? (e.g., DBMS Normalization)"
                                style={styles.topicInput}
                                autoFocus
                            />
                            <button
                                onClick={startSession}
                                disabled={!topic.trim() || isLoading}
                                style={{
                                    ...styles.startButton,
                                    opacity: (!topic.trim() || isLoading) ? 0.5 : 1
                                }}
                            >
                                {isLoading ? 'Starting...' : 'Start Study Session'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => renderMessage(msg, index))}

                            {/* Agent Thinking Animation */}
                            {showThinking && thinkingSteps && (
                                <AgentThinking
                                    thinkingSteps={thinkingSteps}
                                    agentType={activeAgent}
                                    onComplete={handleThinkingComplete}
                                />
                            )}

                            {isLoading && !showThinking && (
                                <div style={styles.typingIndicator}>
                                    <AgentAvatar agent={activeAgent || 'explainer'} size="small" isTyping />
                                    <span style={styles.typingText}>Thinking...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                {!showTopicInput && (
                    <div style={styles.inputArea}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask a question, request a quiz, or just chat..."
                            style={styles.messageInput}
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            style={{
                                ...styles.sendButton,
                                opacity: (!inputValue.trim() || isLoading) ? 0.5 : 1
                            }}
                        >
                            Send
                        </button>
                    </div>
                )}

                {/* Session Info */}
                {sessionId && (
                    <div style={styles.sessionInfo}>
                        Session: {sessionId.substring(0, 8)}... | Messages: {messages.filter(m => !m.type).length} | Handoffs: {handoffs.length}
                        {masteryData && masteryData.percentage > 0 && (
                            <span> | Mastery: {masteryData.percentage}%</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    container: {
        width: '90%',
        maxWidth: '800px',
        height: '85vh',
        backgroundColor: '#1c1f26',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #2d333d'
    },
    header: {
        padding: '20px',
        borderBottom: '1px solid #2d333d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    title: {
        margin: 0,
        fontSize: '24px',
        color: '#fff'
    },
    topicBadge: {
        backgroundColor: '#3b82f620',
        color: '#3b82f6',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '14px'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: '#9ca3af',
        fontSize: '28px',
        cursor: 'pointer',
        padding: '0 8px'
    },
    agentBar: {
        padding: '12px 20px',
        borderBottom: '1px solid #2d333d',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    agentBarLabel: {
        color: '#9ca3af',
        fontSize: '14px'
    },
    agentButtons: {
        display: 'flex',
        gap: '8px'
    },
    agentButton: {
        background: 'none',
        border: '2px solid',
        borderRadius: '50%',
        padding: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    masteryContainer: {
        padding: '12px 20px',
        borderBottom: '1px solid #2d333d'
    },
    messagesArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    welcomeScreen: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        padding: '20px'
    },
    welcomeEmoji: {
        fontSize: '64px',
        marginBottom: '20px'
    },
    welcomeTitle: {
        color: '#fff',
        fontSize: '28px',
        marginBottom: '12px'
    },
    welcomeText: {
        color: '#9ca3af',
        fontSize: '16px',
        marginBottom: '24px'
    },
    agentIntro: {
        display: 'flex',
        gap: '24px',
        marginBottom: '32px',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    topicInput: {
        width: '100%',
        maxWidth: '500px',
        padding: '16px 20px',
        fontSize: '16px',
        backgroundColor: '#111317',
        border: '1px solid #2d333d',
        borderRadius: '12px',
        color: '#fff',
        marginBottom: '16px',
        outline: 'none'
    },
    startButton: {
        padding: '14px 32px',
        fontSize: '16px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: '30px',
        cursor: 'pointer',
        fontWeight: '600'
    },
    messageContainer: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
    },
    messageBubble: {
        maxWidth: '70%',
        padding: '12px 16px',
        borderRadius: '16px',
        borderWidth: '1px',
        borderStyle: 'solid'
    },
    studentBubble: {
        backgroundColor: '#3b82f620',
        borderColor: '#3b82f6',
        borderTopRightRadius: '4px'
    },
    agentBubble: {
        backgroundColor: '#111317',
        borderTopLeftRadius: '4px'
    },
    agentNameInBubble: {
        fontSize: '12px',
        fontWeight: '600',
        marginBottom: '4px'
    },
    messageContent: {
        color: '#fff',
        fontSize: '15px',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap'
    },
    timestamp: {
        fontSize: '11px',
        color: '#6b7280',
        marginTop: '6px',
        textAlign: 'right'
    },
    handoffNotification: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: '#8b5cf620',
        borderRadius: '20px',
        color: '#8b5cf6',
        fontSize: '13px',
        alignSelf: 'center'
    },
    handoffIcon: {
        fontSize: '16px'
    },
    errorMessage: {
        padding: '12px 16px',
        backgroundColor: '#ef444420',
        borderRadius: '12px',
        color: '#ef4444',
        fontSize: '14px',
        alignSelf: 'center'
    },
    typingIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px'
    },
    typingText: {
        color: '#9ca3af',
        fontSize: '14px',
        fontStyle: 'italic'
    },
    inputArea: {
        padding: '16px 20px',
        borderTop: '1px solid #2d333d',
        display: 'flex',
        gap: '12px'
    },
    messageInput: {
        flex: 1,
        padding: '14px 20px',
        fontSize: '15px',
        backgroundColor: '#111317',
        border: '1px solid #2d333d',
        borderRadius: '30px',
        color: '#fff',
        outline: 'none'
    },
    sendButton: {
        padding: '14px 28px',
        fontSize: '15px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: '30px',
        cursor: 'pointer',
        fontWeight: '600'
    },
    sessionInfo: {
        padding: '8px 20px',
        borderTop: '1px solid #2d333d',
        fontSize: '12px',
        color: '#6b7280',
        textAlign: 'center'
    }
};

export default StudyGroupChat;
