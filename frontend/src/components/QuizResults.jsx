import React from 'react';

function QuizResults({ score = 0, totalQuestions = 0, correctAnswers = 0, incorrectQuestions = [], onClose }) {
  // Safety check - if score is undefined, show error state
  if (score === undefined || score === null) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h2 style={styles.header}>Error Loading Results</h2>
          <p style={{ color: '#f87171', textAlign: 'center' }}>Unable to load quiz results. Please try again.</p>
          <button onClick={onClose} style={styles.closeButton}>Back to Timeline</button>
        </div>
      </div>
    );
  }

  const percentage = typeof score === 'number' ? score : 0;
  const isPassed = percentage >= 60;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.header}>Quiz Results</h2>

        <div style={{
          ...styles.scoreCircle,
          borderColor: isPassed ? '#4ade80' : '#f87171'
        }}>
          <span style={{
            ...styles.scoreText,
            color: isPassed ? '#4ade80' : '#f87171'
          }}>
            {percentage.toFixed(1)}%
          </span>
        </div>

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span>Total</span>
            <strong>{totalQuestions}</strong>
          </div>
          <div style={styles.statItem}>
            <span>Correct</span>
            <strong style={{ color: '#4ade80' }}>{correctAnswers}</strong>
          </div>
          <div style={styles.statItem}>
            <span>Incorrect</span>
            <strong style={{ color: '#f87171' }}>{totalQuestions - correctAnswers}</strong>
          </div>
        </div>

        {incorrectQuestions && incorrectQuestions.length > 0 && (
          <div style={styles.mistakes}>
            <h3 style={styles.mistakesHeader}>Review Mistakes</h3>
            {incorrectQuestions.map((q, idx) => (
              <div key={idx} style={styles.mistakeItem}>
                <p style={styles.mistakeQuestion}><strong>Q:</strong> {q.question}</p>
                <div style={styles.answerRow}>
                  <span style={styles.wrongLabel}>Your Answer:</span>
                  <span style={styles.wrongValue}>{q.userAnswer}</span>
                </div>
                <div style={styles.answerRow}>
                  <span style={styles.correctLabel}>Correct:</span>
                  <span style={styles.correctValue}>{q.correctAnswer}</span>
                </div>
                {q.explanation && (
                  <p style={styles.explanation}>
                    <strong>Why:</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} style={styles.closeButton}>
          Back to Timeline
        </button>
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
    zIndex: 2000,
    backdropFilter: 'blur(10px)'
  },
  modal: {
    backgroundColor: '#111317',
    borderRadius: '24px',
    padding: '50px',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '85vh',
    overflow: 'auto',
    color: '#ffffff',
    border: '1px solid #2d333d',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
  },
  header: {
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '40px'
  },
  scoreCircle: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    border: '8px solid #3b9eff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 40px',
    backgroundColor: '#1c1f26'
  },
  scoreText: {
    fontSize: '48px',
    fontWeight: 'bold'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '40px',
    textAlign: 'center'
  },
  statItem: {
    backgroundColor: '#1c1f26',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid #2d333d',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  mistakes: {
    marginTop: '40px',
    textAlign: 'left'
  },
  mistakesHeader: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#f87171'
  },
  mistakeItem: {
    backgroundColor: '#1c1f26',
    padding: '25px',
    borderRadius: '16px',
    marginBottom: '15px',
    border: '1px solid #2d333d'
  },
  mistakeQuestion: {
    fontSize: '18px',
    marginBottom: '15px',
    lineHeight: '1.5'
  },
  answerRow: {
    display: 'flex',
    marginBottom: '8px',
    fontSize: '16px'
  },
  wrongLabel: {
    width: '120px',
    color: '#666'
  },
  wrongValue: {
    color: '#f87171',
    fontWeight: 'bold'
  },
  correctLabel: {
    width: '120px',
    color: '#666'
  },
  correctValue: {
    color: '#4ade80',
    fontWeight: 'bold'
  },
  explanation: {
    color: '#888',
    fontStyle: 'italic',
    marginTop: '15px',
    fontSize: '15px',
    backgroundColor: '#111317',
    padding: '12px',
    borderRadius: '8px'
  },
  closeButton: {
    display: 'block',
    margin: '40px auto 0',
    padding: '16px 48px',
    backgroundColor: '#3b9eff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '30px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 10px 20px rgba(59, 158, 255, 0.3)'
  }
};

export default QuizResults;
