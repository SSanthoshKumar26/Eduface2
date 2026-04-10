import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Download, LogOut, Lightbulb, Sparkles, Maximize, PlusCircle, CheckCircle2, ChevronRight 
} from 'lucide-react';
import TutorPanel from './dashboard/TutorPanel';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/LearningDashboard.css';

const API_BASE_URL = 'http://localhost:5000';

const LearningDashboard = ({ 
  videoUrl, 
  scriptUrl, 
  audioUrl, 
  summaryUrl, 
  jobId, 
  facePreview, 
  resetForm, 
  user, 
  isSignedIn, 
  pptName,
  fromGallery = false
}) => {
  const navigate = useNavigate();
  const [lessonContext, setLessonContext] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
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
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  
  const videoRef = useRef(null);
  const videoWrapperRef = useRef(null);
  
  const handleClearChat = () => {
    const defaultMsg = [{ role: 'assistant', content: "Hi! I'm Eduface AI. Chat cleared! Let's start over." }];
    setMessages(defaultMsg);
    localStorage.setItem('eduface_chat_messages', JSON.stringify(defaultMsg));
  };
  
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTimeUpdate = () => {
    if (!isScrubbing && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleScrubberChange = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) videoRef.current.currentTime = newTime;
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
      window.open(url, '_blank');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (videoWrapperRef.current?.requestFullscreen) videoWrapperRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleAddToGallery = async () => {
    if (isSaving) return;
    if (!isSignedIn || !user?.id) {
       toast.error("Please sign in to save videos to your gallery.");
       return;
    }
    if (!jobId) {
       toast.error("Error: Lesson ID is missing. Please try generating the video again.");
       return;
    }

    setIsSaving(true);
    try {
      const sessionToSave = { videoUrl, scriptUrl, audioUrl, summaryUrl, jobId, facePreview };
      const res = await axios.post(`${API_BASE_URL}/api/videos`, {
        userId: user.id,
        videoId: jobId,
        videoUrl: videoUrl,
        videoData: JSON.stringify(sessionToSave),
        title: pptName || 'Generated Video Lesson',
        createdAt: Date.now()
      });
      if (res.data.success) {
         toast.success("Successfully added to your Premium Gallery! 🎬");
         setIsSaved(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to add to gallery.");
    } finally {
      setIsSaving(false);
    }
  };

  const getCleanDescription = (rawText) => {
    if (!rawText) return "Analyzing lesson context...";
    const textMatches = [...rawText.matchAll(/TEXT:\s*"([^"]+)"/g)];
    let clean = textMatches.length > 0 ? textMatches.map(m => m[1]).join(' ') : rawText;
    clean = clean.replace(/\[.*?\]/g, '').replace(/[A-Z]+:\s*.*/g, '').replace(/\s+/g, ' ').trim();
    return clean; // Removed truncation to ensure full visibility
  };

  useEffect(() => {
    if (scriptUrl) fetch(scriptUrl).then(res => res.text()).then(t => setLessonContext(t));
    if (summaryUrl) fetch(summaryUrl).then(res => res.text()).then(t => setLessonSummary(t));
    
    // FETCH LATEST METADATA (including potential renames)
    if (isSignedIn && user?.id && jobId) {
      axios.get(`${API_BASE_URL}/api/videos/${user.id}`)
        .then(res => {
          if (res.data.success) {
            const videoData = res.data.videos.find(v => v.videoId === jobId);
            if (videoData) {
              setIsSaved(true);
              // Update local state if the title has changed in the DB
              if (videoData.title && videoData.title !== pptName) {
                // We'll use a local state for the display title to handle renames
                setDisplayTitle(videoData.title);
              }
            }
          }
        })
        .catch(err => console.error("Error syncing video metadata", err));
    }
  }, [scriptUrl, summaryUrl, isSignedIn, user?.id, jobId, pptName]);

  const [displayTitle, setDisplayTitle] = useState(pptName || 'Generated Video Lesson');

  useEffect(() => {
    if (pptName) setDisplayTitle(pptName);
  }, [pptName]);

  const handleSendMessage = async (text = null) => {
    const input = text || chatInput;
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages); 
    setChatInput(''); setIsTyping(true);
    try {
      const resp = await axios.post(`${API_BASE_URL}/api/chat`, {
        messages: [{ role: 'system', content: `Context: ${lessonContext}` }, ...newMessages]
      });
      if (resp.data.success) {
        setMessages([...newMessages, { role: 'assistant', content: resp.data.message.content }]);
      }
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  return (
    <div className="ld-root">
          <header className="ld-header">
        <div className="ld-brand">
          <Sparkles size={20} /> 
          <h2>Eduface AI</h2>
          {displayTitle && (
            <>
              <span className="ld-header-separator">|</span>
              <span className="ld-video-title-header">{displayTitle}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate('/quiz/setup', { state: { lessonContent: lessonContext } })} 
            className="ld-action-btn" 
            style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}
          >
            Generate Quiz
          </button>
          <button onClick={resetForm} className="ld-exit-btn"><LogOut size={16} /> End Session</button>
        </div>
      </header>

      <main className={`ld-main ${!isChatVisible ? 'chat-hidden' : ''}`}>
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
              ref={videoRef} src={videoUrl} className="ld-video" 
              onClick={togglePlay} onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)}
            />
            
            <div className={`ld-video-controls ${isHoveringVideo || !isPlaying ? 'visible' : ''}`} onClick={e => e.stopPropagation()}>
              <div className="ld-scrubber-container">
                <input 
                  type="range" min="0" max={duration || 100} value={currentTime} 
                  onChange={handleScrubberChange} onMouseDown={() => setIsScrubbing(true)} onMouseUp={() => setIsScrubbing(false)}
                  className="ld-scrubber" style={{ '--progress': `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <div className="ld-controls-row">
                <div className="ld-controls-left">
                  <button onClick={togglePlay} className="ld-play-pause-btn">
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <div className="ld-time-display">{formatTime(currentTime)} / {formatTime(duration)}</div>
                </div>
                <div className="ld-controls-right">
                  <button onClick={toggleFullscreen} className="ld-play-pause-btn"><Maximize size={18} /></button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ld-actions" style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
            <button onClick={() => handleDownload(videoUrl, `eduface_${jobId}_video.mp4`)} className="ld-action-btn">
              <Download size={16} /> Save Video
            </button>
            {isSignedIn && user && !fromGallery && !isSaved && (
              <button 
                onClick={handleAddToGallery}
                disabled={isSaving}
                className="ld-action-btn"
                style={{ background: '#4f46e5', border: 'none', color: '#fff' }}
              >
                <PlusCircle size={16} /> {isSaving ? 'Adding...' : 'Add to My Gallery'}
              </button>
            )}
            {isSaved && !fromGallery && (
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <div className="ld-saved-badge">
                   <CheckCircle2 size={16} /> Saved to Gallery
                 </div>
                 <button 
                   onClick={() => navigate('/video-gallery')}
                   className="ld-action-btn"
                   style={{ background: 'transparent', border: '1px solid var(--ld-accent)', color: 'var(--ld-accent)', flex: 'none' }}
                 >
                   View in Gallery
                 </button>
               </div>
            )}
          </div>

          <div className="ld-overview-premium">
            <h3><Lightbulb size={18} /> Lesson Overview</h3>
            <div className="ld-lesson-content">
               <p>{lessonSummary || getCleanDescription(lessonContext)}</p>
            </div>
          </div>
        </div>

        {isChatVisible ? (
          <div className="ld-right-col">
            <button 
              className="ld-chat-toggle-hide" 
              onClick={() => setIsChatVisible(false)}
              title="Collapse AI Assistant"
            >
              <ChevronRight size={18} />
            </button>
            <div className="ld-chat-container">
              <TutorPanel 
                messages={messages} input={chatInput} setInput={setChatInput}
                onSendMessage={handleSendMessage} isTyping={isTyping} 
                formatText={(t) => t} onClearChat={handleClearChat}
                facePreview={facePreview}
              />
            </div>
          </div>
        ) : (
          <button 
            className="ld-chat-toggle-show animate-pulse-glow" 
            onClick={() => setIsChatVisible(true)}
          >
            <Sparkles size={20} />
            <span>Open AI Assistant</span>
          </button>
        )}
      </main>
    </div>
  );
};

export default LearningDashboard;
