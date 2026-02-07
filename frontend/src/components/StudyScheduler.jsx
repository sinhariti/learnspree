import React, { useState } from 'react';
import QuizModal from './QuizModal';
import QuizResults from './QuizResults';
import StudyGroupChat from './StudyGroupChat';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';

function StudyScheduler() {
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [expandedDays, setExpandedDays] = useState([]);
  const [hoveredTask, setHoveredTask] = useState(null); // Track hovered task
  const [quizMode, setQuizMode] = useState(false); // Quiz modal state
  const [currentQuizTopic, setCurrentQuizTopic] = useState(null);
  const [currentDay, setCurrentDay] = useState(null);
  const [quizResults, setQuizResults] = useState(null); // Performance results state
  const [showStudyGroup, setShowStudyGroup] = useState(false); // Study Group Chat modal

  const parseUserInput = (input) => {
    // Extract days
    const daysMatch = input.match(/(\d+)\s*days?/i);
    const days = daysMatch ? parseInt(daysMatch[1]) : 7;

    // Extract exam/goal (everything after "for")
    const examMatch = input.match(/for\s+(.+)/i);
    const exam = examMatch ? examMatch[1] : "Study Plan";

    // Extract hours (if mentioned)
    const hoursMatch = input.match(/(\d+)\s*hours?/i);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 3;

    // Infer topics based on exam keywords
    let topics = ["General Preparation"];
    const lowerExam = exam.toLowerCase();
    if (lowerExam.includes('gate')) {
      topics = ["Operating Systems", "DBMS", "Algorithms", "Computer Networks", "Digital Logic"];
    } else if (lowerExam.includes('cognizant') || lowerExam.includes('interview')) {
      topics = ["Data Structures & Algorithms", "Logical Reasoning", "Aptitude", "HR Interview Questions"];
    } else if (lowerExam.includes('react')) {
      topics = ["JSX & Components", "Hooks", "State Management", "API Integration"];
    }

    return { days, exam, hours, topics };
  };

  const handleInitialize = async () => {
    setLoading(true);
    const parsed = parseUserInput(userInput);

    try {
      // Step 1: Start marathon
      const initResponse = await fetch(`${API_BASE}/start-marathon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examName: parsed.exam,
          totalDays: parsed.days,
          hoursPerDay: parsed.hours,
          syllabus: parsed.topics
        })
      });

      if (!initResponse.ok) throw new Error('Failed to initialize');

      // Step 2: Fetch the generated schedule
      const scheduleResponse = await fetch(
        `${API_BASE}/schedule?studentId=demo_student&from=1&to=${parsed.days}`
      );

      const scheduleData = await scheduleResponse.json();
      setSchedule(scheduleData);
      setExpandedDays([1]); // Auto-expand Day 1

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate plan. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setExpandedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleTask = async (dayIndex, taskIndex) => {
    const updated = [...schedule];
    const task = updated[dayIndex].tasks[taskIndex];
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    setSchedule(updated);
  };

  const handleTakeQuiz = (topic, day) => {
    setCurrentQuizTopic(topic);
    setCurrentDay(day);
    setQuizMode(true);
  };

  const handleQuizComplete = async (quizData, userAnswers, timeSpent) => {
    try {
      const response = await fetch(`${API_BASE}/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'demo_student',
          day: currentDay,
          topic: currentQuizTopic,
          quizData: quizData,
          userAnswers: userAnswers,
          timeSpent: timeSpent
        })
      });

      const result = await response.json();

      // Check if the response indicates an error
      if (!response.ok || result.success === false) {
        throw new Error(result.error || 'Failed to submit quiz');
      }

      // Backend returns scoringResults directly (not nested under 'result' property)
      // It contains: score, totalQuestions, correctAnswers, incorrectQuestions
      if (result.score === undefined) {
        throw new Error('Invalid response: missing score');
      }

      setQuizResults(result);
      setQuizMode(false);

    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz: ' + error.message);
      setQuizMode(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.header}>Lets Schedule</h1>

        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Eg : Plan 3 days for Python test"
          style={styles.input}
        />

        <div style={styles.buttonContainer}>
          <button
            onClick={handleInitialize}
            disabled={loading || !userInput}
            style={{
              ...styles.button,
              opacity: (loading || !userInput) ? 0.6 : 1,
              cursor: (loading || !userInput) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Generating Plan...' : 'Initialise Agent'}
          </button>
          <button
            onClick={() => setShowStudyGroup(true)}
            style={styles.studyGroupButton}
          >
            🎓 AI Study Group
          </button>
        </div>

        {schedule && (
          <div style={styles.timeline}>
            <div style={styles.timelineHeaderContainer}>
              <h2 style={styles.timelineHeader}>Timeline</h2>
            </div>

            {schedule.map((day, dayIndex) => (
              <div key={day.day} style={styles.daySection}>
                <div
                  onClick={() => toggleDay(day.day)}
                  style={styles.dayHeader}
                >
                  <h3>Day {day.day}</h3>
                  <span style={styles.arrow}>{expandedDays.includes(day.day) ? '▼' : '▶'}</span>
                </div>

                {expandedDays.includes(day.day) && (
                  <div style={styles.taskList}>
                    {day.tasks.map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        style={styles.taskItem}
                        onMouseEnter={() => setHoveredTask(`${dayIndex}-${taskIndex}`)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        <div
                          onClick={() => toggleTask(dayIndex, taskIndex)}
                          style={{
                            ...styles.checkbox,
                            backgroundColor: task.status === 'completed' ? '#3b9eff' : 'transparent',
                            borderColor: task.status === 'completed' ? '#3b9eff' : '#666'
                          }}
                        >
                          {task.status === 'completed' && <span style={styles.checkMark}>✓</span>}
                        </div>
                        <label
                          style={{
                            ...styles.taskLabel,
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                            color: task.status === 'completed' ? '#888' : '#fff'
                          }}
                          onClick={() => toggleTask(dayIndex, taskIndex)}
                        >
                          <span style={styles.topicHighlight}>{task.topic}</span>
                          {task.description && `: ${task.description}`}
                        </label>

                        {hoveredTask === `${dayIndex}-${taskIndex}` && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTakeQuiz(task.topic, day.day);
                            }}
                            style={styles.quizButton}
                          >
                            Take Quizz!
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {quizMode && (
        <QuizModal
          topic={currentQuizTopic}
          onClose={() => setQuizMode(false)}
          onComplete={handleQuizComplete}
        />
      )}

      {quizResults && (
        <QuizResults
          {...quizResults}
          onClose={() => setQuizResults(null)}
        />
      )}

      {showStudyGroup && (
        <StudyGroupChat onClose={() => setShowStudyGroup(false)} />
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#111317',
    minHeight: '100vh',
    padding: '60px 20px',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    position: 'relative'
  },
  header: {
    fontSize: '64px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '50px',
    letterSpacing: '-1px'
  },
  input: {
    width: '100%',
    padding: '24px',
    fontSize: '18px',
    backgroundColor: '#1c1f26',
    border: '1px solid #2d333d',
    borderRadius: '12px',
    color: '#ffffff',
    marginBottom: '20px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '60px',
    gap: '16px'
  },
  button: {
    padding: '12px 28px',
    fontSize: '16px',
    backgroundColor: '#3490dc',
    color: '#ffffff',
    border: 'none',
    borderRadius: '30px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  studyGroupButton: {
    padding: '12px 28px',
    fontSize: '16px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '30px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
  },
  timeline: {
    marginTop: '20px',
  },
  timelineHeaderContainer: {
    backgroundColor: '#1c1f26',
    padding: '16px 24px',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid #2d333d'
  },
  timelineHeader: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0
  },
  daySection: {
    backgroundColor: '#1c1f26',
    marginBottom: '20px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #2d333d'
  },
  dayHeader: {
    padding: '24px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  taskList: {
    padding: '0 24px 24px 24px',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '18px',
    cursor: 'pointer',
    position: 'relative',
    padding: '4px',
    borderRadius: '8px'
  },
  checkbox: {
    width: '24px',
    height: '24px',
    minWidth: '24px',
    marginRight: '16px',
    border: '2px solid #666',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  checkMark: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  taskLabel: {
    fontSize: '18px',
    cursor: 'pointer',
    userSelect: 'none',
    flex: 1
  },
  topicHighlight: {
    color: '#3b9eff',
    fontWeight: '600'
  },
  arrow: {
    fontSize: '16px',
    color: '#666'
  },
  quizButton: {
    padding: '8px 16px',
    backgroundColor: '#3b9eff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(59, 158, 255, 0.4)',
    transition: 'transform 0.2s',
    marginLeft: '10px'
  }
};

export default StudyScheduler;
