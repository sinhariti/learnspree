import React, { useState, useRef, useEffect, useCallback } from 'react';
import AgentAvatar from './AgentAvatar';
import MasteryProgress from './MasteryProgress';
import AgentThinking from './AgentThinking';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';

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
    const [pendingResponse, setPendingResponse] = useState(null);
    const [quizMode, setQuizMode] = useState(false);
    const [quizCount, setQuizCount] = useState(0);
    const [correctStreak, setCorrectStreak] = useState(0);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, showThinking]);

    // Handle thinking animation complete
    const handleThinkingComplete = useCallback(() => {
        setShowThinking(false);
        setThinkingSteps(null);

        // Add the pending response after thinking animation
        if (pendingResponse) {
            setMessages(prev => [...prev, {
                type: 'handoff',
                from: pendingResponse.from,
                to: pendingResponse.to,
                reason: pendingResponse.reason,
                timestamp: new Date()
            }, {
                agent: pendingResponse.agent,
                agentName: pendingResponse.agentName,
                content: pendingResponse.message,
                timestamp: new Date(),
                metadata: pendingResponse.metadata
            }]);
            setPendingResponse(null);
        }
    }, [pendingResponse]);

    const startSession = async (selectedAgent = 'explainer') => {
        if (!topic.trim()) return;

        setShowTopicInput(false);
        setIsLoading(true);

        // Check if quiz mode
        if (selectedAgent === 'quizmaster') {
            setQuizMode(true);
            setQuizCount(0);
            setCorrectStreak(0);
        }

        try {
            const response = await fetch(`${API_BASE}/study-group/trigger/${selectedAgent}`, {
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

                // Initialize mastery data
                setMasteryData({
                    level: 'beginner',
                    percentage: 0,
                    questionsAnswered: 0,
                    correctAnswers: 0,
                    accuracy: 0,
                    milestones: {
                        understanding: false,
                        practicing: false,
                        proficient: false,
                        mastered: false
                    }
                });
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
            // Check if this looks like an actual quiz answer (not just "yes", "ready", etc.)
            const isLikelyAnswer = (msg) => {
                const lowered = msg.toLowerCase().trim();
                const conversationalResponses = ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'ready', 'let\'s go', 'lets go', 'go', 'start', 'i\'m ready', 'im ready', 'yes please', 'go ahead', 'next', 'continue'];
                // It's an answer if it's NOT just a short conversational response
                // or if it contains option letters like A, B, C, D
                if (conversationalResponses.includes(lowered) || conversationalResponses.some(r => lowered === r)) {
                    return false;
                }
                // Check if it's an option selection (A, B, C, D) or has enough content to be an answer
                if (/^[abcd]$/i.test(lowered) || /^option\s*[abcd]/i.test(lowered) || lowered.length > 10) {
                    return true;
                }
                return lowered.length > 5; // Short responses probably not answers
            };

            // If in quiz mode and answering with a real answer, use score-answer endpoint
            if (quizMode && activeAgent === 'quizmaster' && isLikelyAnswer(userMessage)) {
                const lastAgentMessage = messages.filter(m => m.agent === 'quizmaster').pop();

                const response = await fetch(`${API_BASE}/study-group/score-answer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: 'demo_student',
                        sessionId,
                        question: lastAgentMessage?.content || 'Quiz question',
                        studentAnswer: userMessage,
                        topic
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Update quiz tracking
                    const newQuizCount = quizCount + 1;
                    setQuizCount(newQuizCount);

                    if (data.isCorrect) {
                        setCorrectStreak(prev => prev + 1);
                    } else {
                        setCorrectStreak(0);
                    }

                    // Update mastery data
                    if (data.masteryProgress) {
                        setMasteryData(data.masteryProgress);
                    }

                    // Add feedback message
                    setMessages(prev => [...prev, {
                        agent: 'quizmaster',
                        agentName: 'Professor Quiz',
                        content: `${data.isCorrect ? '✅' : '❌'} ${data.feedback}\n\n📊 Score: ${data.score || 0}%`,
                        timestamp: new Date(),
                        metadata: { isQuizFeedback: true, score: data.score }
                    }]);

                    // Check for auto-handoff
                    if (data.autoHandoff) {
                        // Show thinking animation
                        if (data.thinkingSteps && data.thinkingSteps.length > 0) {
                            setThinkingSteps(data.thinkingSteps);
                            setShowThinking(true);
                            setPendingResponse({
                                from: 'quizmaster',
                                to: data.autoHandoff.to,
                                reason: data.autoHandoff.reason,
                                agent: data.autoHandoff.to,
                                agentName: getAgentName(data.autoHandoff.to),
                                message: `🎯 ${data.autoHandoff.reason}\n\nLet's test your true mastery with some challenging scenarios!`,
                                metadata: { handoff: true }
                            });
                            setActiveAgent(data.autoHandoff.to);
                            setQuizMode(false); // Exit quiz mode
                        } else {
                            // Direct handoff without animation
                            setMessages(prev => [...prev, {
                                type: 'handoff',
                                from: 'quizmaster',
                                to: data.autoHandoff.to,
                                reason: data.autoHandoff.reason,
                                timestamp: new Date()
                            }]);
                            setActiveAgent(data.autoHandoff.to);
                            setQuizMode(false);
                        }
                    } else {
                        // Continue quiz - ask next question
                        setTimeout(() => askNextQuestion(), 1000);
                    }
                }
            } else {
                // Regular chat flow
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
                            setPendingResponse({
                                from: activeAgent,
                                to: data.agent,
                                agent: data.agent,
                                agentName: data.agentName,
                                message: data.message,
                                metadata: data.metadata
                            });
                        } else {
                            setMessages(prev => [...prev, {
                                type: 'handoff',
                                from: activeAgent,
                                to: data.agent,
                                timestamp: new Date()
                            }, {
                                agent: data.agent,
                                agentName: data.agentName,
                                content: data.message,
                                timestamp: new Date(),
                                metadata: data.metadata
                            }]);
                        }
                    } else {
                        // Same agent response
                        setMessages(prev => [...prev, {
                            agent: data.agent,
                            agentName: data.agentName,
                            content: data.message,
                            timestamp: new Date(),
                            metadata: data.metadata
                        }]);
                    }

                    setActiveAgent(data.agent);
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

    const askNextQuestion = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/study-group/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: 'demo_student',
                    message: 'Give me the next question',
                    sessionId,
                    topic
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessages(prev => [...prev, {
                    agent: 'quizmaster',
                    agentName: 'Professor Quiz',
                    content: data.message,
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Failed to get next question:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerAgent = async (agentType) => {
        setIsLoading(true);

        // Enable quiz mode if switching to quizmaster
        if (agentType === 'quizmaster') {
            setQuizMode(true);
            setQuizCount(0);
            setCorrectStreak(0);
        } else {
            setQuizMode(false);
        }

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
                    <div style={styles.handoffContent}>
                        <span>Handing off from <strong>{getAgentName(msg.from)}</strong> to <strong>{getAgentName(msg.to)}</strong></span>
                        {msg.reason && <div style={styles.handoffReason}>{msg.reason}</div>}
                    </div>
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
                    {msg.metadata?.score !== undefined && (
                        <div style={styles.scoreIndicator}>
                            <span style={{
                                color: msg.metadata.score >= 80 ? '#10b981' : msg.metadata.score >= 50 ? '#f59e0b' : '#ef4444'
                            }}>
                                Score: {msg.metadata.score}%
                            </span>
                        </div>
                    )}
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
                        {quizMode && <span style={styles.quizBadge}>🎯 Quiz Mode</span>}
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
                                    title={agent === 'quizmaster' ? 'Quiz Mode - answer questions to unlock challenges!' : getAgentName(agent)}
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

                {/* Mastery Progress Bar - Always show when session is active */}
                {!showTopicInput && (
                    <div style={styles.masteryContainer}>
                        <MasteryProgress masteryData={masteryData} topic={topic} />
                    </div>
                )}

                {/* Quiz Stats */}
                {quizMode && (
                    <div style={styles.quizStats}>
                        <span>📝 Questions: {quizCount}</span>
                        <span>🔥 Streak: {correctStreak}</span>
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                            (Hit 3+ correct to unlock Deep Challenge!)
                        </span>
                    </div>
                )}

                {/* Messages Area */}
                <div style={styles.messagesArea}>
                    {showTopicInput ? (
                        <div style={styles.welcomeScreen}>
                            <div style={styles.welcomeEmoji}>🎓</div>
                            <h3 style={styles.welcomeTitle}>Welcome to Your AI Study Group!</h3>
                            <p style={styles.welcomeText}>
                                Choose how you'd like to learn:
                            </p>
                            <div style={styles.agentIntro}>
                                <div style={styles.agentOption} onClick={() => topic.trim() && startSession('quizmaster')}>
                                    <AgentAvatar agent="quizmaster" size="medium" />
                                    <span style={styles.agentOptionLabel}>Quiz Me!</span>
                                    <span style={styles.agentOptionDesc}>Answer questions → unlock challenges</span>
                                </div>
                                <div style={styles.agentOption} onClick={() => topic.trim() && startSession('explainer')}>
                                    <AgentAvatar agent="explainer" size="medium" />
                                    <span style={styles.agentOptionLabel}>Explain First</span>
                                    <span style={styles.agentOptionDesc}>Learn concepts, then practice</span>
                                </div>
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
                            <div style={styles.startButtons}>
                                <button
                                    onClick={() => startSession('quizmaster')}
                                    disabled={!topic.trim() || isLoading}
                                    style={{
                                        ...styles.startButton,
                                        ...styles.quizStartButton,
                                        opacity: (!topic.trim() || isLoading) ? 0.5 : 1
                                    }}
                                >
                                    🎯 Start Quiz Mode
                                </button>
                                <button
                                    onClick={() => startSession('explainer')}
                                    disabled={!topic.trim() || isLoading}
                                    style={{
                                        ...styles.startButton,
                                        opacity: (!topic.trim() || isLoading) ? 0.5 : 1
                                    }}
                                >
                                    📚 Start Learning
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => renderMessage(msg, index))}

                            {/* Agent Thinking Animation */}
                            {showThinking && thinkingSteps && (
                                <AgentThinking
                                    thinkingSteps={thinkingSteps}
                                    agentType={pendingResponse?.to || activeAgent}
                                    onComplete={handleThinkingComplete}
                                />
                            )}

                            {isLoading && !showThinking && (
                                <div style={styles.typingIndicator}>
                                    <AgentAvatar agent={activeAgent || 'explainer'} size="small" isTyping />
                                    <span style={styles.typingText}>
                                        {quizMode ? 'Checking your answer...' : 'Thinking...'}
                                    </span>
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
                            placeholder={quizMode ? "Type your answer..." : "Ask a question, request a quiz, or just chat..."}
                            style={styles.messageInput}
                            disabled={isLoading || showThinking}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputValue.trim() || isLoading || showThinking}
                            style={{
                                ...styles.sendButton,
                                opacity: (!inputValue.trim() || isLoading || showThinking) ? 0.5 : 1
                            }}
                        >
                            {quizMode ? 'Submit' : 'Send'}
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
        padding: '16px 20px',
        borderBottom: '1px solid #2d333d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
    },
    title: {
        margin: 0,
        fontSize: '22px',
        color: '#fff'
    },
    topicBadge: {
        backgroundColor: '#3b82f620',
        color: '#3b82f6',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '13px'
    },
    quizBadge: {
        backgroundColor: '#f59e0b20',
        color: '#f59e0b',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '600'
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
        padding: '10px 20px',
        borderBottom: '1px solid #2d333d',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    agentBarLabel: {
        color: '#9ca3af',
        fontSize: '13px'
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
    quizStats: {
        padding: '8px 20px',
        borderBottom: '1px solid #2d333d',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        fontSize: '14px',
        color: '#f59e0b',
        backgroundColor: '#f59e0b10'
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
        fontSize: '56px',
        marginBottom: '16px'
    },
    welcomeTitle: {
        color: '#fff',
        fontSize: '26px',
        marginBottom: '8px'
    },
    welcomeText: {
        color: '#9ca3af',
        fontSize: '15px',
        marginBottom: '20px'
    },
    agentIntro: {
        display: 'flex',
        gap: '20px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    agentOption: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 24px',
        backgroundColor: '#111317',
        borderRadius: '12px',
        border: '2px solid #2d333d',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    agentOptionLabel: {
        color: '#fff',
        fontSize: '14px',
        fontWeight: '600'
    },
    agentOptionDesc: {
        color: '#6b7280',
        fontSize: '11px'
    },
    topicInput: {
        width: '100%',
        maxWidth: '500px',
        padding: '14px 20px',
        fontSize: '15px',
        backgroundColor: '#111317',
        border: '1px solid #2d333d',
        borderRadius: '12px',
        color: '#fff',
        marginBottom: '16px',
        outline: 'none'
    },
    startButtons: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    startButton: {
        padding: '12px 24px',
        fontSize: '15px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: '30px',
        cursor: 'pointer',
        fontWeight: '600'
    },
    quizStartButton: {
        backgroundColor: '#f59e0b'
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
        fontSize: '14px',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap'
    },
    scoreIndicator: {
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #2d333d',
        fontSize: '12px',
        fontWeight: '600'
    },
    timestamp: {
        fontSize: '11px',
        color: '#6b7280',
        marginTop: '6px',
        textAlign: 'right'
    },
    handoffNotification: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 16px',
        backgroundColor: '#8b5cf620',
        borderRadius: '12px',
        border: '1px solid #8b5cf640',
        alignSelf: 'center',
        maxWidth: '80%'
    },
    handoffIcon: {
        fontSize: '18px'
    },
    handoffContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    handoffReason: {
        color: '#a78bfa',
        fontSize: '12px'
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
        padding: '14px 20px',
        borderTop: '1px solid #2d333d',
        display: 'flex',
        gap: '12px'
    },
    messageInput: {
        flex: 1,
        padding: '12px 18px',
        fontSize: '14px',
        backgroundColor: '#111317',
        border: '1px solid #2d333d',
        borderRadius: '30px',
        color: '#fff',
        outline: 'none'
    },
    sendButton: {
        padding: '12px 24px',
        fontSize: '14px',
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
        fontSize: '11px',
        color: '#6b7280',
        textAlign: 'center'
    }
};

export default StudyGroupChat;
