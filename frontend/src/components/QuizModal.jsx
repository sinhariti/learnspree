import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5001/api';

// Helper function to clean markdown formatting from text
const cleanMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold **text**
    .replace(/\*(.+?)\*/g, '$1')      // Remove italic *text*
    .replace(/__(.+?)__/g, '$1')      // Remove bold __text__
    .replace(/_(.+?)_/g, '$1')        // Remove italic _text_
    .replace(/`(.+?)`/g, '$1')        // Remove inline code `text`
    .replace(/^#+\s*/gm, '')          // Remove headers
    .replace(/^[-*]\s+/gm, '')        // Remove list markers
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
    .trim();
};

function QuizModal({ topic, onClose, onComplete }) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [startTime] = useState(Date.now());
  const [hoveredOption, setHoveredOption] = useState(null);

  useEffect(() => {
    console.log('QuizModal mounted for topic:', topic);
    fetchQuiz();
  }, []);

  const fetchQuiz = async () => {
    try {
      console.log('Fetching quiz for topic:', topic);
      const encodedTopic = encodeURIComponent(topic);
      const response = await fetch(
        `${API_BASE}/quiz/${encodedTopic}?difficulty=medium&questions=5`
      );
      const data = await response.json();

      // Backend returns quiz object directly (not nested under 'quiz' property)
      // Handle both formats for backward compatibility
      const quizData = data.quiz || data;

      if (!quizData || !quizData.questions) {
        throw new Error('Invalid quiz data received');
      }

      setQuiz(quizData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Failed to load quiz');
      onClose();
    }
  };

  const handleOptionSelect = (questionId, option) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Use seconds instead of minutes to avoid 0 for quick completions
    const timeSpent = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    onComplete(quiz, userAnswers, timeSpent);
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Generating quiz for {topic}...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const selectedAnswer = userAnswers[currentQuestion.id];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Submit Button - Top Right */}
        <button
          onClick={handleSubmit}
          style={styles.submitButton}
          disabled={Object.keys(userAnswers).length < quiz.questions.length}
        >
          Submit
        </button>

        {/* Question */}
        <div style={styles.questionBox}>
          <h2 style={styles.questionText}>Question {currentQuestionIndex + 1}</h2>
          <p style={styles.questionContent}>{cleanMarkdown(currentQuestion.question)}</p>
        </div>

        {/* Options */}
        <div style={styles.optionsContainer}>
          {['A', 'B', 'C', 'D'].map(optionKey => {
            const isSelected = selectedAnswer === optionKey;
            const isHovered = hoveredOption === optionKey && !isSelected;
            return (
              <div
                key={optionKey}
                onClick={() => handleOptionSelect(currentQuestion.id, optionKey)}
                onMouseEnter={() => setHoveredOption(optionKey)}
                onMouseLeave={() => setHoveredOption(null)}
                style={{
                  ...styles.optionCard,
                  borderColor: isSelected || isHovered ? '#3b9eff' : '#2d333d',
                  boxShadow: isSelected
                    ? '0 0 30px rgba(59, 158, 255, 0.3)'
                    : isHovered
                      ? '0 0 20px rgba(59, 158, 255, 0.2)'
                      : 'none',
                  backgroundColor: isSelected ? 'rgba(59, 158, 255, 0.1)' : '#1c1f26',
                  transform: isHovered ? 'translateY(-2px)' : 'none'
                }}
              >
                <span style={styles.optionText}>
                  Option {optionKey}
                </span>
                <p style={styles.optionContent}>
                  {cleanMarkdown(currentQuestion.options[optionKey])}
                </p>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={styles.navigation}>
          <button
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            style={{
              ...styles.navButton,
              ...(currentQuestionIndex === 0 ? styles.navButtonDisabled : {})
            }}
          >
            Prev
          </button>

          <span style={styles.questionCounter}>
            {currentQuestionIndex + 1} / {quiz.questions.length}
          </span>

          <button
            onClick={handleNext}
            disabled={currentQuestionIndex === quiz.questions.length - 1}
            style={{
              ...styles.navButton,
              ...(currentQuestionIndex === quiz.questions.length - 1 ? styles.navButtonDisabled : {})
            }}
          >
            Next
          </button>
        </div>
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
    backgroundColor: 'rgba(5, 5, 8, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)'
  },
  modal: {
    backgroundColor: '#111317',
    borderRadius: '24px',
    padding: '60px',
    maxWidth: '1000px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    border: '1px solid #2d333d',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
  },
  loadingContainer: {
    textAlign: 'center'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #1c1f26',
    borderTop: '5px solid #3b9eff',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '24px',
    color: '#ffffff',
    fontWeight: '500'
  },
  submitButton: {
    position: 'absolute',
    top: '30px',
    right: '30px',
    padding: '12px 30px',
    backgroundColor: '#3b9eff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  questionBox: {
    backgroundColor: '#1c1f26',
    borderRadius: '16px',
    padding: '40px',
    marginBottom: '40px',
    border: '1px solid #2d333d'
  },
  questionText: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#3b9eff',
    marginBottom: '15px'
  },
  questionContent: {
    fontSize: '22px',
    color: '#ffffff',
    lineHeight: '1.5',
    margin: 0
  },
  optionsContainer: {
    display: 'grid',
    gap: '20px',
    marginBottom: '40px'
  },
  optionCard: {
    backgroundColor: '#1c1f26',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#2d333d',
    borderRadius: '16px',
    padding: '24px 30px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  optionText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#3b9eff',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  optionContent: {
    fontSize: '18px',
    color: '#ffffff',
    margin: 0
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px'
  },
  navButton: {
    padding: '12px 36px',
    backgroundColor: '#1c1f26',
    color: '#ffffff',
    border: '1px solid #2d333d',
    borderRadius: '30px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  navButtonDisabled: {
    backgroundColor: '#111317',
    borderColor: '#222',
    color: '#444',
    cursor: 'not-allowed'
  },
  questionCounter: {
    fontSize: '16px',
    color: '#666',
    fontWeight: '600'
  }
};

export default QuizModal;
