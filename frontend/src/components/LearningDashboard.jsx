import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, MessageCircle, Maximize2, Subtitles, Download, FileText, Music, LogOut, Lightbulb, Sparkles 
} from 'lucide-react';
import TutorPanel from './dashboard/TutorPanel';
import '../styles/LearningDashboard.css';

const API_BASE_URL = 'http://localhost:5000';

const LearningDashboard = ({ videoUrl, scriptUrl, audioUrl, jobId, resetForm }) => {
  const [lessonContext, setLessonContext] = useState('');
  const [currentCaption, setCurrentCaption] = useState('');
  const [showCaptions, setShowCaptions] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Eduface AI. Ask me anything about this premium lesson." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

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
    if (!rawText) return "Extracting lesson highlights...";
    // Remove technical metadata: [00:00], [SCENE START], FACE:, EYES:, HEAD:, HANDS:, BODY:, TIMING:, TEXT: "..."
    let clean = rawText
      .replace(/\[\d{2}:\d{2}\]/g, '')
      .replace(/\[SCENE START\]/g, '')
      .replace(/FACE:.*?(?=EYES:|HEAD:|HANDS:|BODY:|TIMING:|TEXT:|\Z)/gs, '')
      .replace(/EYES:.*?(?=HEAD:|HANDS:|BODY:|TIMING:|TEXT:|\Z)/gs, '')
      .replace(/HEAD:.*?(?=HANDS:|BODY:|TIMING:|TEXT:|\Z)/gs, '')
      .replace(/HANDS:.*?(?=BODY:|TIMING:|TEXT:|\Z)/gs, '')
      .replace(/BODY:.*?(?=TIMING:|TEXT:|\Z)/gs, '')
      .replace(/TIMING:.*?(?=TEXT:|\Z)/gs, '')
      .replace(/TEXT:\s*"([^"]*)"/gs, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return clean.length > 300 ? clean.substring(0, 300) + "..." : clean;
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
        <button onClick={resetForm} className="ld-exit-btn"><LogOut size={16} /> End Session</button>
      </header>

      <main className="ld-main">
        <div className="ld-left-col">
          <div className="ld-video-wrapper" onClick={togglePlay}>
            <div className={`ld-video-overlay ${!isPlaying ? 'show' : ''}`}>
              {isPlaying ? <Pause size={64} fill="currentColor" /> : <Play size={64} fill="currentColor" />}
            </div>
            <video 
              ref={videoRef} 
              src={videoUrl} 
              className="ld-video" 
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <div className="ld-video-controls-hint">Click to {isPlaying ? 'Pause' : 'Play'}</div>
          </div>
          
          <div className="ld-info-card">
            <h3><Lightbulb size={21} /> Brief Lesson Overview</h3>
            <div className="ld-lesson-content">
               <p>{getCleanDescription(lessonContext)}</p>
            </div>
          </div>
          
          <div className="ld-actions">
            <a href={videoUrl} className="ld-action-btn" download><Download size={16} /> Save Video</a>
            <a href={scriptUrl} className="ld-action-btn" download><FileText size={16} /> Download Script</a>
            <a href={audioUrl} className="ld-action-btn" download><Music size={16} /> Narration Audio</a>
          </div>
        </div>

        <div className="ld-right-col">
          <div className="ld-chat-container">
            <TutorPanel 
              messages={messages} input={chatInput} setInput={setChatInput}
              onSendMessage={handleSendMessage} isTyping={isTyping} 
              formatText={(t) => t} setIsChatOpen={() => {}}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LearningDashboard;
