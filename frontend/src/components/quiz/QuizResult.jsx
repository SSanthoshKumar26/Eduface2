import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

import { 
  Brain, AlertCircle, 
  Lightbulb, ChevronRight, Download, RefreshCcw, Video, BookOpen,
  CheckCircle, XCircle
} from 'lucide-react';
import { FiTarget, FiAward, FiTrendingUp } from 'react-icons/fi';
import './QuizStyles.css';

const QuizResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  const [evaluation, setEvaluation] = useState(null);
  const [detailedReviews, setDetailedReviews] = useState(null);
  const [lessonContent, setLessonContent] = useState(null);
  const [videoCount, setVideoCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Check if we came from completing a quiz
    if (location.state?.evaluation) {
      setEvaluation(location.state.evaluation);
      setDetailedReviews(location.state.detailedReviews);
      setLessonContent(location.state.lessonContent);
      
      // Persist to local storage
      localStorage.setItem('eduface_last_quiz_eval', JSON.stringify(location.state.evaluation));
      if (location.state.detailedReviews) {
        localStorage.setItem('eduface_last_quiz_reviews', JSON.stringify(location.state.detailedReviews));
      }
      if (location.state.lessonContent) {
        localStorage.setItem('eduface_last_lesson_content', location.state.lessonContent);
      }
    } else {
      // Try to load from local storage
      const savedEval = localStorage.getItem('eduface_last_quiz_eval');
      const savedReviews = localStorage.getItem('eduface_last_quiz_reviews');
      const savedLesson = localStorage.getItem('eduface_last_lesson_content');
      
      if (savedEval) {
        setEvaluation(JSON.parse(savedEval));
        if (savedReviews) setDetailedReviews(JSON.parse(savedReviews));
        if (savedLesson) setLessonContent(savedLesson);
      } else {
        // Fallback to dummy zero-state dashboard if completely empty
        setEvaluation({
          score: { total: 0, correct: 0, wrong: 0, accuracy: "0%" },
          concept_analysis: [
            { concept: "Take a quiz to see concepts", accuracy: "0%", level: "Beginner" }
          ],
          learning_insights: ["Start taking quizzes to generate cognitive learning insights and behavior patterns."],
          strengths: ["Metrics will appear here after your first quiz."],
          weaknesses: ["Metrics will appear here after your first quiz."],
          suggestions: ["Click 'Retake Quiz' or generate a new lesson to initialize your AI learning analyst."]
        });
        setDetailedReviews(null);
      }
    }
    
    // Fetch video count
    if (isLoaded && user?.id) {
      axios.get(`http://localhost:5000/api/videos/${user.id}`)
        .then(res => {
          if (res.data.success) {
            setVideoCount(res.data.videos.length);
          }
        })
        .catch(err => console.error("Error fetching videos", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [location.state, isLoaded, user]);

  const chartData = useMemo(() => {
    if (!evaluation || !evaluation.concept_analysis) return [];
    return evaluation.concept_analysis.map(c => ({
      name: c.concept.length > 20 ? c.concept.substring(0, 20) + '...' : c.concept,
      accuracy: parseInt(c.accuracy.replace('%', '')) || 0,
      full: 100
    }));
  }, [evaluation]);

  // Wait until evaluation is loaded to render (prevents flash)
  if (!evaluation || loading) return (
    <div className="qd-loading-state" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div className="qd-loader-spinner"></div>
    </div>
  );

  const hasAttempted = evaluation && (
    Number(evaluation.score?.total) > 0 || 
    Number(evaluation.score?.correct) > 0 || 
    Number(evaluation.score?.wrong) > 0
  );

  const totalCorrect = Number(evaluation.score?.correct) || 0;
  const totalWrong = Number(evaluation.score?.wrong) || 0;
  // Use the total from the score, or calculate it if missing
  const totalQuestions = Number(evaluation.score?.total) || (totalCorrect + totalWrong);
  
  // Calculate accuracy more robustly
  const overallAccuracy = totalQuestions > 0 
    ? Math.round((totalCorrect / totalQuestions) * 100) 
    : parseInt(evaluation.score?.accuracy || '0');

  const getMasteryLevel = (acc) => {
    if (acc >= 90) return { label: 'Expert', color: '#10b981' };
    if (acc >= 70) return { label: 'Proficient', color: '#3b82f6' };
    if (acc >= 50) return { label: 'Developing', color: '#f59e0b' };
    return { label: 'Beginner', color: '#ef4444' };
  };
  const mastery = getMasteryLevel(overallAccuracy);

  return (
    <div className={`qd-page-root ${mounted ? 'mounted' : ''}`} data-theme="dark">
      {/* Sidebar Profile & Nav */}
      <aside className="qd-sidebar">
        <div className="qd-logo-area">
          <div className="qd-logo-icon"><Brain size={24} /></div>
          <h2>Eduface AI</h2>
        </div>

        <div className="qd-profile-card">
          <div className="qd-profile-avatar">
            {isLoaded && user?.imageUrl ? (
              <img src={user.imageUrl} alt="Profile" />
            ) : (
              <div className="qd-avatar-placeholder">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="qd-profile-info">
            <h3>{isLoaded && user ? user.fullName : 'Premium Student'}</h3>
            <p className="qd-profile-email">{isLoaded && user?.primaryEmailAddress?.emailAddress}</p>
            <p className="qd-status-badge" style={{ color: mastery.color, background: `${mastery.color}15`, border: `1px solid ${mastery.color}30` }}>
              {mastery.label} Scholar
            </p>
          </div>
        </div>

        <div className="qd-nav-links">
          <div className="qd-nav-label">Actions</div>
          <button className="qd-nav-btn" onClick={() => navigate('/video-gen')}>
            <Video size={18} /> Back to Studio
          </button>
          <button className="qd-nav-btn" onClick={() => navigate('/quiz/setup', { state: { lessonContent } })}>
            <RefreshCcw size={18} /> Retake Quiz
          </button>
          <button className="qd-nav-btn" onClick={() => navigate('/quiz/detailed-review', { state: { detailedReviews, evaluation } })}>
            <BookOpen size={18} /> Static detailed Review
          </button>
        </div>
        
        <div className="qd-sidebar-footer">
          <button className="qd-logout-btn" onClick={() => navigate('/')}>Exit Dashboard</button>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <main className="qd-main-content">
        <header className="qd-main-header stagger-1">
          <div>
            <h1 className="qd-greeting">Analytics Dashboard</h1>
            <p className="qd-greeting-sub">Your AI-generated performance breakdown & personalized path.</p>
          </div>
        </header>

        {/* Top KPIs */}
        <div className="qd-kpi-grid stagger-2">
          {/* Always show Video Count */}
          <div className="qd-kpi-card">
            <div className="qd-kpi-icon" style={{ color: '#8b5cf6' }}><Video size={26} /></div>
            <div className="qd-kpi-data">
              <span className="qd-kpi-value">{videoCount}</span>
              <span className="qd-kpi-label">Videos Generated</span>
            </div>
            <div className="qd-kpi-chart-mini">
               <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>AI Learning Material</span>
            </div>
          </div>

          {hasAttempted && (
            <>
              <div className="qd-kpi-card">
                <div className="qd-kpi-icon" style={{ color: '#3b82f6' }}><FiTarget size={26} /></div>
                <div className="qd-kpi-data">
                  <span className="qd-kpi-value">{overallAccuracy}%</span>
                  <span className="qd-kpi-label">Overall Accuracy</span>
                </div>
                <div className="qd-kpi-chart-mini">
                   <div className="qd-mini-progress"><div style={{ width: `${overallAccuracy}%`, background: '#3b82f6' }}></div></div>
                </div>
              </div>
              
              <div className="qd-kpi-card">
                <div className="qd-kpi-icon" style={{ color: '#10b981' }}><FiAward size={26} /></div>
                <div className="qd-kpi-data">
                  <span className="qd-kpi-value">{totalCorrect} / {totalQuestions}</span>
                  <span className="qd-kpi-label">Questions Correct</span>
                </div>
                <div className="qd-kpi-chart-mini">
                  <div className="qd-mini-progress">
                    <div style={{ 
                      width: `${totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0}%`, 
                      background: '#10b981' 
                    }}></div>
                  </div>
                </div>
              </div>

              <div className="qd-kpi-card">
                <div className="qd-kpi-icon" style={{ color: '#f59e0b' }}><FiTrendingUp size={26} /></div>
                <div className="qd-kpi-data">
                  <span className="qd-kpi-value">{mastery.label}</span>
                  <span className="qd-kpi-label">AI Assessed Level</span>
                </div>
                <div className="qd-kpi-chart-mini">
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Based on recent quiz performance</span>
                </div>
              </div>
            </>
          )}

          {!hasAttempted && (
            <div className="qd-kpi-card qd-empty-kpi" style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
               <div style={{ textAlign: 'center', padding: '10px' }}>
                 <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Take a quiz to initialize your AI performance metrics.</p>
                 <button 
                  onClick={() => navigate('/video-gen')}
                  style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}
                 >
                   Go to Studio →
                 </button>
               </div>
            </div>
          )}
        </div>

        {hasAttempted ? (
          <>
            <div className="qd-middle-grid stagger-3">
              {/* Chart Section */}
              <div className="qd-panel qd-chart-panel">
                <h3 className="qd-panel-title">Concept Mastery Mapping</h3>
                <div className="qd-chart-wrapper">
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 11 }} 
                      />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '8px', 
                          color: '#fff' 
                        }} 
                      />
                      <Bar 
                        dataKey="accuracy" 
                        fill="url(#colorUv)" 
                        radius={[6, 6, 0, 0]} 
                        barSize={40} 
                        animationDuration={1500}
                      />
                      <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Concept Breakdown List */}
              <div className="qd-panel qd-concepts-panel">
                <h3 className="qd-panel-title">Granular Analysis</h3>
                <div className="qd-concepts-scroll">
                  {evaluation.concept_analysis.map((c, i) => {
                    const acc = parseInt(c.accuracy) || 0;
                    return (
                      <div key={i} className="qd-concept-row">
                        <div className="qd-concept-header">
                          <span className="qd-concept-name">{c.concept}</span>
                          <span className="qd-concept-acc">{c.accuracy}</span>
                        </div>
                        <div className="qd-concept-bar-bg">
                          <div 
                            className="qd-concept-bar-fill"
                            style={{ 
                              width: `${acc}%`, 
                              background: acc > 70 ? '#10b981' : acc > 40 ? '#f59e0b' : '#ef4444' 
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Cognitive Analysis (Learning Insights) */}
            {evaluation.learning_insights && evaluation.learning_insights.length > 0 && (
              <div className="qd-cognitive-panel stagger-3-5" style={{ background: 'var(--ld-surface)', border: '1px solid var(--ld-border)', borderRadius: '16px', padding: '30px', marginTop: '24px', marginBottom: '24px' }}>
                <div className="qd-panel-header-icon" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Brain size={24} color="#a78bfa" />
                  <h3 className="qd-panel-title" style={{ margin: 0, color: '#a78bfa' }}>Cognitive Learning Patterns</h3>
                </div>
                <div className="qd-cognitive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {evaluation.learning_insights.map((insight, idx) => (
                    <div key={idx} className="qd-insight-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.6' }}>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Split (Insights & Recommendations) */}
            <div className="qd-bottom-grid stagger-4">
              {/* Weaknesses -> Areas for Improvement */}
              <div className="qd-panel qd-improvements-panel">
                <div className="qd-panel-header-icon">
                  <AlertCircle size={20} color="var(--ld-text-secondary)" />
                  <h3 className="qd-panel-title" style={{ margin: 0 }}>Areas Requiring Attention</h3>
                </div>
                <ul className="qd-insight-list">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i}>
                      <div className="qd-bullet" style={{ background: '#f43f5e' }}></div>
                      <p>{w}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Recommendations */}
              <div className="qd-panel qd-recommendations-panel">
                <div className="qd-panel-header-icon">
                  <BookOpen size={20} color="var(--ld-text-secondary)" />
                  <h3 className="qd-panel-title" style={{ margin: 0 }}>Curated Learning Path</h3>
                </div>
                <ul className="qd-insight-list">
                  {evaluation.suggestions.map((s, i) => (
                    <li key={i}>
                      <div className="qd-bullet" style={{ background: '#3b82f6' }}></div>
                      <p>{s}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="qd-zero-state stagger-3" style={{ marginTop: '40px', padding: '60px', textAlign: 'center', background: 'var(--ld-surface)', border: '1px solid var(--ld-border)', borderRadius: '24px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Brain size={40} color="#3b82f6" />
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '12px', color: '#fff' }}>No Quiz Insights Yet</h2>
            <p style={{ color: '#94a3b8', maxWidth: '500px', margin: '0 auto 30px', fontSize: '1.1rem', lineHeight: '1.6' }}>
              Complete your first AI-generated lesson quiz to unlock deep cognitive analysis, concept mastery mapping, and personalized learning paths.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={() => navigate('/video-gen')}
                className="qd-nav-btn" 
                style={{ background: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '12px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Video size={18} /> Generate New Lesson
              </button>
              <button 
                onClick={() => navigate('/video-gallery')}
                className="qd-nav-btn" 
                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ChevronRight size={18} /> View Video Library
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default QuizResult;
