import React, { useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, Lightbulb, FileText, HelpCircle, X } from 'lucide-react';

const TutorPanel = ({ messages, input, setInput, onSendMessage, isTyping, formatText, setIsChatOpen }) => {
  const chatEndRef = useRef(null);

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
              <span className="ld-status-dot"></span>
              <span className="ld-status-text">Studio Connected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ld-tutor-messages" ref={chatEndRef}>
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
                {formatText(msg.content)}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="ld-chat-wrapper assistant">
            <span className="ld-chat-role">Eduface AI</span>
            <div className="ld-chat-bubble is-typing">
              <span className="ld-typing-dot"></span>
              <span className="ld-typing-dot"></span>
              <span className="ld-typing-dot"></span>
            </div>
          </div>
        )}
      </div>

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
