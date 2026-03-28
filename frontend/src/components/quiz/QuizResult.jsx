import React, { useMemo, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

import { 
  Brain, AlertCircle, 
  Lightbulb, ChevronRight, Download, RefreshCcw, Video, BookOpen 
} from 'lucide-react';
import { FiTarget, FiAward, FiTrendingUp } from 'react-icons/fi';
import './QuizStyles.css';

const QuizResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { evaluation } = location.state || {};
  const user = { fullName: 'Premium Student', firstName: 'P', imageUrl: null };
  const isLoaded = true;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!evaluation) {
    return (
      <div className="qd-page-root" data-theme="dark">
        <div className="qd-centered-container">
          <h2>No evaluation data found.</h2>
          <button className="qd-primary-btn mt-4" onClick={() => navigate(-1)}>Return</button>
        </div>
      </div>
    );
  }

  const chartData = useMemo(() => {
    return evaluation.concept_analysis.map(c => ({
      name: c.concept.length > 20 ? c.concept.substring(0, 20) + '...' : c.concept,
      accuracy: parseInt(c.accuracy.replace('%', '')) || 0,
      full: 100
    }));
  }, [evaluation]);

  const overallAccuracy = parseInt(evaluation.score?.accuracy || '0');
  const getMasteryLevel = (acc) => {
    if (acc >= 90) return { label: 'Expert', color: '#10b981' };
    if (acc >= 70) return { label: 'Proficient', color: '#3b82f6' };
    if (acc >= 50) return { label: 'Developing', color: '#f59e0b' };
    return { label: 'Beginner', color: '#ef4444' };
  };
  const mastery = getMasteryLevel(overallAccuracy);

  const totalCorrect = evaluation.score?.correct || 0;
  const totalQuestions = (evaluation.score?.correct || 0) + (evaluation.score?.wrong || 0);

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
          <button className="qd-nav-btn" onClick={() => navigate('/quiz/setup')}>
            <RefreshCcw size={18} /> Retake Quiz
          </button>
          <button className="qd-nav-btn" onClick={() => window.print()}>
            <Download size={18} /> Save Report
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
          <div className="qd-kpi-card">
            <div className="qd-kpi-icon" style={{ color: 'var(--ld-text-secondary)' }}><FiTarget size={26} /></div>
            <div className="qd-kpi-data">
              <span className="qd-kpi-value">{overallAccuracy}%</span>
              <span className="qd-kpi-label">Overall Accuracy</span>
            </div>
            <div className="qd-kpi-chart-mini">
               <div className="qd-mini-progress"><div style={{ width: `${overallAccuracy}%`, background: '#3b82f6' }}></div></div>
            </div>
          </div>
          
          <div className="qd-kpi-card">
            <div className="qd-kpi-icon" style={{ color: 'var(--ld-text-secondary)' }}><FiAward size={26} /></div>
            <div className="qd-kpi-data">
              <span className="qd-kpi-value">{totalCorrect} / {totalQuestions}</span>
              <span className="qd-kpi-label">Questions Correct</span>
            </div>
            <div className="qd-kpi-chart-mini">
              <div className="qd-mini-progress"><div style={{ width: `${(totalCorrect/totalQuestions)*100}%`, background: '#10b981' }}></div></div>
            </div>
          </div>

          <div className="qd-kpi-card">
             <div className="qd-kpi-icon" style={{ color: 'var(--ld-text-secondary)' }}><FiTrendingUp size={26} /></div>
             <div className="qd-kpi-data">
               <span className="qd-kpi-value">{mastery.label}</span>
               <span className="qd-kpi-label">AI Assessed Level</span>
             </div>
             <div className="qd-kpi-chart-mini">
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Based on recent quiz performance</span>
             </div>
          </div>
        </div>

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

      </main>
    </div>
  );
};

export default QuizResult;
