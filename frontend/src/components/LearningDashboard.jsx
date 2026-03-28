import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, MessageCircle, Maximize, Maximize2, Subtitles, Download, FileText, Music, LogOut, Lightbulb, Sparkles, Share2, Trash2 
} from 'lucide-react';
import TutorPanel from './dashboard/TutorPanel';
import { useNavigate } from 'react-router-dom';
import { BookOpen, X } from 'lucide-react';
import '../styles/LearningDashboard.css';

const API_BASE_URL = 'http://localhost:5000';

const LearningDashboard = ({ videoUrl, scriptUrl, audioUrl, jobId, resetForm }) => {
  const navigate = useNavigate();
  const [lessonContext, setLessonContext] = useState('');
  const [currentCaption, setCurrentCaption] = useState('');
  const [showCaptions, setShowCaptions] = useState(true);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Eduface AI. Ask me anything about this premium lesson." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const videoWrapperRef = useRef(null);
  
  const handleClearChat = () => {
    setMessages([{ role: 'assistant', content: "Hi! I'm Eduface AI. Chat cleared! Let's start over." }]);
  };
  
  // Format time in MM:SS
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTimeUpdate = () => {
    if (!isScrubbing) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };

  const handleScrubberChange = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback to direct link if fetch fails
      window.open(url, '_blank');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (videoWrapperRef.current.requestFullscreen) {
        videoWrapperRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const getCleanDescription = (rawText) => {
    if (!rawText) return "Analyzing lesson context...";
    
    let clean = rawText
      .replace(/\[.*?\]/g, '') // Remove all bracketed [SCENE START], [00:00]
      .replace(/[A-Z]+:\s*("([^"]*)")?/g, (match, p1, p2) => p2 ? p2 + ' ' : '') // Clean TEXT: "..." or EYES: ...
      .replace(/\s+/g, ' ')
      .trim();
      
    // Find the actual start of the lesson meaning (skipping repeated title intro words)
    const matchStart = clean.search(/(What is|How to|Why do|In this lesson|\b[A-Z][A-Za-z]+ is a\b|\b[A-Z][A-Za-z]+ is an\b)/i);
    if (matchStart !== -1 && matchStart < 150) {
      clean = clean.substring(matchStart);
    } else {
      // If none found, aggressively strip the first few repeated title words
      const words = clean.split(' ');
      if (words.length > 10) {
        clean = words.slice(Math.min(words.length - 1, 6)).join(' '); 
      }
    }
    
    clean = clean.replace(/^(Hello everyone.*?today we will|Welcome to this lesson|Let's dive into|Moving on to)/i, '');
    clean = clean.trim();
    if (clean.length > 0) {
       clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    
    if (clean.length > 220) {
      clean = clean.substring(0, 220).trim();
      const lastSentenceEnd = Math.max(clean.lastIndexOf('. '), clean.lastIndexOf('? '));
      if (lastSentenceEnd > 100) {
        clean = clean.substring(0, lastSentenceEnd + 1);
      } else {
        clean += '...';
      }
    }
    
    return clean || "Welcome to this premium lesson. Watch the video to get started.";
  };

  useEffect(() => {
    if (scriptUrl) {
      fetch(scriptUrl).then(res => res.text()).then(text => setLessonContext(text));
    }
  }, [scriptUrl]);

  const handleSendMessage = async (text = null) => {
    const userInput = text || chatInput;
    if (!userInput.trim()) return;
    const newMessages = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages); setChatInput(''); setIsTyping(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: `Context: ${lessonContext}` }, ...newMessages] })
      });
      const data = await resp.json();
      if (data.success) setMessages([...newMessages, { role: 'assistant', content: data.message.content }]);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  return (
    <div className="ld-root">
      <header className="ld-header">
        <div className="ld-brand"><Sparkles size={20} /> <h2>Eduface Learning Console</h2></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate('/quiz/setup', { state: { lessonContent: lessonContext } })} 
            className="ld-action-btn" 
            style={{ 
              background: 'var(--ld-accent, #2563eb)', 
              color: 'white', 
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: 0.95
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '0.95'}
          >
            Generate Quiz
          </button>
          <button onClick={resetForm} className="ld-exit-btn"><LogOut size={16} /> End Session</button>
        </div>
      </header>

      <main className="ld-main">
        <div className="ld-left-col">
          <div 
            ref={videoWrapperRef}
            className={`ld-video-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}
            onMouseEnter={() => setIsHoveringVideo(true)}
            onMouseLeave={() => setIsHoveringVideo(false)}
          >
            <div className={`ld-video-overlay ${!isPlaying ? 'show' : ''}`} onClick={togglePlay}>
              {isPlaying ? <Pause size={64} fill="currentColor" /> : <Play size={64} fill="currentColor" />}
            </div>
            <video 
              ref={videoRef} 
              src={videoUrl} 
              className="ld-video" 
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            
            {/* Custom YouTube-style Scrubber */}
            <div className={`ld-video-controls ${isHoveringVideo || !isPlaying ? 'visible' : ''}`} onClick={e => e.stopPropagation()}>
              <div className="ld-scrubber-container">
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 100} 
                  value={currentTime} 
                  onChange={handleScrubberChange}
                  onMouseDown={() => setIsScrubbing(true)}
                  onMouseUp={() => setIsScrubbing(false)}
                  onTouchStart={() => setIsScrubbing(true)}
                  onTouchEnd={() => setIsScrubbing(false)}
                  className="ld-scrubber"
                  style={{ '--progress': `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <div className="ld-controls-row">
                <div className="ld-controls-left">
                  <button onClick={togglePlay} className="ld-play-pause-btn">
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <div className="ld-time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                <div className="ld-controls-right">
                  <button onClick={toggleFullscreen} className="ld-play-pause-btn">
                    <Maximize size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ld-actions">
            <button onClick={() => handleDownload(videoUrl, `eduface_${jobId}_video.mp4`)} className="ld-action-btn">
              <Download size={16} /> Save Video
            </button>
          </div>

          <div className="ld-overview-premium">
            <h3><Lightbulb size={18} /> Lesson Overview</h3>
            <div className="ld-lesson-content">
               <p>{getCleanDescription(lessonContext)}</p>
            </div>
          </div>
        </div>

        <div className="ld-right-col">
          <div className="ld-chat-container">
            <TutorPanel 
              messages={messages} input={chatInput} setInput={setChatInput}
              onSendMessage={handleSendMessage} isTyping={isTyping} 
              formatText={(t) => t} onClearChat={handleClearChat}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LearningDashboard;
