import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, MessageCircle, Maximize, Maximize2, Subtitles, Download, FileText, Music, LogOut, Lightbulb, Sparkles, Share2, Trash2 
} from 'lucide-react';
import TutorPanel from './dashboard/TutorPanel';
import { useNavigate } from 'react-router-dom';
import { BookOpen, X } from 'lucide-react';
import '../styles/LearningDashboard.css';

const API_BASE_URL = 'http://localhost:5000';

const LearningDashboard = ({ videoUrl, scriptUrl, audioUrl, summaryUrl, jobId, facePreview, resetForm }) => {
  const navigate = useNavigate();
  const [lessonContext, setLessonContext] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [currentCaption, setCurrentCaption] = useState('');
  const [showCaptions, setShowCaptions] = useState(true);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('eduface_chat_messages');
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: "Hi! I'm Eduface AI. Ask me anything about this premium lesson." }
    ];
  });
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
    const defaultMsg = [{ role: 'assistant', content: "Hi! I'm Eduface AI. Chat cleared! Let's start over." }];
    setMessages(defaultMsg);
    localStorage.setItem('eduface_chat_messages', JSON.stringify(defaultMsg));
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
    if (lessonSummary) return lessonSummary;
    
    // Extract only narrative text from the script format
    const textMatches = [...rawText.matchAll(/TEXT:\s*"([^"]+)"/g)];
    let combinedText = textMatches.length > 0 ? textMatches.map(m => m[1]).join(' ') : rawText;
    
    let clean = combinedText
      .replace(/\[.*?\]/g, '') // Remove [SCENE START]
      .replace(/[A-Z]+:\s*.*/g, '') // Remove KEY: value tags
      .replace(/^\s*-.*$/gm, '') // Remove bullet direction lines (- smile)
      .replace(/\.{3,}/g, ' ') // Remove pauses (...)
      .replace(/\s+/g, ' ')
      .trim();
      
    // Remove tutorial/meta phrases
    const metaPhrases = [
      /Hello everyone/i, /Welcome to (this|our) (presentation|lesson)/i,
      /Moving on to our next point/i, /Let's break this down/i,
      /Focus on this part/i, /Today we will be discussing/i
    ];
    
    metaPhrases.forEach(p => { clean = clean.replace(p, ''); });
    clean = clean.replace(/^\W+/, '').trim();
    
    if (clean.length > 0) {
       clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    
    // Truncate to a clean sentence ending
    const maxLength = 220;
    if (clean.length > maxLength) {
      clean = clean.substring(0, maxLength);
      const lastSent = Math.max(clean.lastIndexOf('.'), clean.lastIndexOf('?'), clean.lastIndexOf('!'));
      if (lastSent > 80) {
        clean = clean.substring(0, lastSent + 1);
      } else {
        clean = clean.replace(/\s+\w+$/, '') + ".";
      }
    } else if (clean.length > 5 && !/[.!?]$/.test(clean)) {
      clean += ".";
    }
    
    return clean || "Welcome to this premium lesson. Watch the synchronized AI presentation to explore the key concepts and practical applications.";
  };

  useEffect(() => {
    if (scriptUrl) {
      fetch(scriptUrl).then(res => res.text()).then(text => setLessonContext(text));
    }
    if (summaryUrl) {
      fetch(summaryUrl).then(res => res.text()).then(text => setLessonSummary(text));
    }
  }, [scriptUrl, summaryUrl]);

  const handleSendMessage = async (text = null) => {
    const userInput = text || chatInput;
    if (!userInput.trim()) return;
    const newMessages = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages); 
    localStorage.setItem('eduface_chat_messages', JSON.stringify(newMessages));
    setChatInput(''); setIsTyping(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: `Context: ${lessonContext}` }, ...newMessages] })
      });
      const data = await resp.json();
      if (data.success) {
        const updatedMessages = [...newMessages, { role: 'assistant', content: data.message.content }];
        setMessages(updatedMessages);
        localStorage.setItem('eduface_chat_messages', JSON.stringify(updatedMessages));
      }
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
               <p>{lessonSummary || getCleanDescription(lessonContext)}</p>
            </div>
          </div>
        </div>

        <div className="ld-right-col">
          <div className="ld-chat-container">
            <TutorPanel 
              messages={messages} input={chatInput} setInput={setChatInput}
              onSendMessage={handleSendMessage} isTyping={isTyping} 
              formatText={(t) => t} onClearChat={handleClearChat}
              facePreview={facePreview}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LearningDashboard;
