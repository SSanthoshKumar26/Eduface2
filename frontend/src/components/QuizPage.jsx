import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Brain, List, Timer, ChevronRight, Settings, Sparkles, ArrowLeft, 
  BarChart3, TrendingUp, Award, CheckCircle2, 
  AlertTriangle, BookOpen 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import axios from 'axios';
import '../styles/QuizPage.css';

const API_BASE_URL = 'http://localhost:5000';

const QuizPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lessonContent, numQuestions: initialNum, difficulty: initialDiff } = location.state || {};

  const [step, setStep] = useState('form'); 
  const [numQuestions, setNumQuestions] = useState(initialNum || 5);
  const [difficulty, setDifficulty] = useState(initialDiff || 'medium');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState([]);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    if (!lessonContent) navigate('/video-gen');
  }, [lessonContent, navigate]);

  // Memoized Chart Data
  const chartData = useMemo(() => {
    if (!evaluation) return null;
    return {
      bar: evaluation.concept_analysis.map(c => ({
        name: c.concept.length > 15 ? c.concept.substring(0, 15) + '...' : c.concept,
        accuracy: parseInt(c.accuracy.replace('%', '')),
        full: 100
      })),
      pie: [
        { name: 'Correct', value: evaluation.score.correct, color: '#10b981' },
        { name: 'Wrong', value: evaluation.score.wrong, color: '#ef4444' }
      ]
    };
  }, [evaluation]);

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/quiz`, {
        lesson_content: lessonContent,
        num_questions: numQuestions,
        difficulty: difficulty,
        user_answers: {}
      });
      if (response.data.success) {
        setQuiz(response.data.data.quiz);
        setStep('attempt');
      }
    } catch (error) {
      console.error("Quiz generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/quiz`, {
        lesson_content: lessonContent,
        num_questions: numQuestions,
        difficulty: difficulty,
        user_answers: currentAnswers
      });
      if (response.data.success) {
        setEvaluation(response.data.data.evaluation);
        setStep('analytics');
      }
    } catch (error) {
      console.error("Quiz submission failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        <div className="loader-container">
          <div className="loader-spinner"></div>
          <h2 style={{ marginTop: '20px' }}>Generating Quiz...</h2>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        <button className="back-nav-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="quiz-card-premium animate-fade-in">
          <div className="quiz-card-header">
            <div className="icon-badge"><Brain size={32} /></div>
            <h1>Quiz Configuration</h1>
            <p>Tailor your learning assessment to your preference.</p>
          </div>
          <div className="quiz-form-body">
            <div className="config-section">
              <label><Settings size={18} /> Difficulty Level</label>
              <div className="difficulty-grid">
                {['easy', 'medium', 'hard'].map((d) => (
                  <div 
                    key={d}
                    className={`diff-option ${difficulty === d ? 'active' : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
            <div className="config-section">
              <label><List size={18} /> Number of Questions: <strong>{numQuestions}</strong></label>
              <input
                type="range"
                min="3"
                max="15"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                className="premium-range"
              />
            </div>
            <button className="primary-action-btn" onClick={handleGenerateQuiz}>
              Build My Quiz <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'attempt') {
    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        <button className="back-nav-btn" onClick={() => setStep('form')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="quiz-attempt-wrapper animate-slide-up">
          <div className="attempt-nav">
             <div className="nav-left" style={{ display: 'flex', gap: '20px' }}>
                <span className="q-counter">{Object.keys(currentAnswers).length} / {quiz.length} Answered</span>
             </div>
             <div className="timer-pill" style={{ color: 'var(--ld-text-secondary)', fontSize: '0.8rem' }}><Timer size={14} /> Active Session</div>
          </div>
          
          <div className="questions-scroll-area">
            {quiz.map((q, idx) => (
              <div key={q.id} className="modern-q-card">
                <span className="q-index">Question {idx + 1}</span>
                <h2 className="q-statement">{q.question}</h2>
                <div className="options-vertical-grid">
                  {Object.entries(q.options).map(([key, val]) => (
                    <button 
                      key={key} 
                      className={`modern-opt-btn ${currentAnswers[q.id] === key ? 'selected' : ''}`}
                      onClick={() => setCurrentAnswers({...currentAnswers, [q.id]: key})}
                    >
                      <div className="opt-marker">{key}</div>
                      <div className="opt-content">{val}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="quiz-submit-bar">
             <button 
               className="submit-sequence-btn" 
               disabled={Object.keys(currentAnswers).length < quiz.length}
               onClick={handleSubmitQuiz}
             >
               Submit Quiz
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analytics') {
    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        <button className="back-nav-btn" onClick={() => setStep('attempt')}>
          <ArrowLeft size={16} /> Edit Answers
        </button>
        <div className="analytics-layout animate-fade-in">
          <aside className="analytics-sidebar">
            <div className="sidebar-header">
              <div className="user-score-large">{evaluation?.score?.accuracy}</div>
              <div style={{ color: 'var(--ld-accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem', marginBottom: '32px' }}>
                {evaluation?.learning_level}
              </div>
            </div>
            
            <div className="sidebar-stats" style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
              <div style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{evaluation?.score?.correct}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--ld-text-secondary)', textTransform: 'uppercase' }}>Correct</div>
              </div>
              <div style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{evaluation?.score?.wrong}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--ld-text-secondary)', textTransform: 'uppercase' }}>Wrong</div>
              </div>
            </div>

            <div className="sidebar-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => navigate('/video-gen')}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--ld-accent)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                End Session
              </button>
              <button 
                onClick={() => setStep('form')}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--ld-border)', background: 'transparent', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                Retake Quiz
              </button>
            </div>
          </aside>

          <main className="analytics-main">
            <div className="dashboard-card">
              <div className="card-head"><BarChart3 size={18} /> <h3>Mastery by Concept</h3></div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData.bar}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                    <Bar dataKey="accuracy" fill="var(--ld-accent)" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="insights-flex" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="insight-box strength">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#10b981', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <Award size={14} /> Strengths
                 </div>
                 <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--ld-text-secondary)' }}>
                    {evaluation?.strengths.map((s,i) => <li key={i}>{s}</li>)}
                 </ul>
              </div>
              <div className="insight-box weakness">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <AlertTriangle size={14} /> Weak Areas
                 </div>
                 <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--ld-text-secondary)' }}>
                    {evaluation?.weaknesses.map((w,i) => <li key={i}>{w}</li>)}
                 </ul>
              </div>
            </div>

            <div className="dashboard-card" style={{ marginTop: '24px' }}>
              <div className="card-head"><Sparkles size={18} /> <h3>Improvement Strategy</h3></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {evaluation?.suggestions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ld-accent)', marginTop: '6px' }}></div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ld-text-secondary)' }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizPage;
