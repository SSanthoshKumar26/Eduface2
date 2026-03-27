import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, MessageSquare, Lightbulb, FileText, HelpCircle, X, Trash2, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ShareModal from './ShareModal';

const TutorPanel = ({ messages, input, setInput, onSendMessage, isTyping, formatText, onClearChat }) => {
  const chatEndRef = useRef(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickActions = [
    { label: "Explain Concept", icon: <MessageSquare size={14} /> },
    { label: "Show Example", icon: <Lightbulb size={14} /> },
    { label: "Summarize Lesson", icon: <FileText size={14} /> },
    { label: "Generate Quiz", icon: <HelpCircle size={14} /> }
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleShareChat = async () => {
    try {
      // In production, use the actual backend URL instead of hardcoded localhost
      const resp = await fetch('http://localhost:5000/api/share-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, visibility: 'public' })
      });
      const data = await resp.json();
      if (data.success) {
        setShareUrl(data.share_url);
        setIsShareModalOpen(true);
      } else {
        alert("Failed to share chat.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error sharing the chat.");
    }
  };

  return (
    <div className="ld-tutor-panel">
      <div className="ld-tutor-header">
        <div className="ld-tutor-title-group">
          <div className="ld-tutor-icon">
            <Sparkles size={16} />
          </div>
          <div>
            <h3>Eduface AI</h3>
            <div className="ld-tutor-status">
              STUDIO CONNECTED
            </div>
          </div>
        </div>
        <div className="ld-tutor-header-actions">
          <button className="ld-header-btn" title="Share Chat securely" onClick={handleShareChat}>
            <Share2 size={16} />
          </button>
          <button className="ld-header-btn" title="Clear Chat messages" onClick={onClearChat}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="ld-tutor-messages">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`ld-chat-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            {msg.role === 'assistant' && (
              <span className="ld-chat-role">Eduface AI</span>
            )}
            <div className="ld-chat-bubble">
              <div className="ld-chat-text">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="ld-chat-wrapper assistant">
            <span className="ld-chat-role">Eduface AI</span>
            <div className="ld-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        shareUrl={shareUrl} 
      />

      <div className="ld-tutor-footer">
        <div className="ld-tutor-quick-actions">
          {quickActions.map((action, idx) => (
            <button 
              key={idx}
              onClick={() => onSendMessage(action.label)}
              disabled={isTyping}
              className="ld-quick-btn"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>

        <div className="ld-tutor-input-area">
          <input 
            type="text" 
            placeholder="Ask your tutor about this lesson..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            className="ld-chat-input"
          />
          <button 
            onClick={() => onSendMessage()}
            disabled={isTyping || !input.trim()}
            className="ld-chat-send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorPanel;
