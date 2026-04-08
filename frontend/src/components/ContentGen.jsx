// src/components/ContentGen.jsx
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiSend, FiMic, FiPlus, FiLoader, FiArrowLeft, FiBook, FiTrash2 } from "react-icons/fi";
import { Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/ContentGen.css";

export default function ContentGen() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("Quick Response");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! I'm your Eduface AI tutor. What would you like to build or learn about today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const modes = [
    { key: "Quick Response", label: "⚡ Quick Response", desc: "Fast and concise" },
    { key: "Detailed", label: "📋 Detailed", desc: "In-depth explanation" },
    { key: "Creative", label: "🎨 Creative", desc: "Engaging and unique" }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('eduface_content_gen');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.output) setOutput(parsed.output);
        if (parsed.messages) setMessages(parsed.messages);
      } catch (e) {}
    }
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    localStorage.setItem('eduface_content_gen', JSON.stringify({ mode, output, messages }));
  }, [mode, output, messages]);

  const generate = async (promptText, promptMode) => {
    setOutput("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: promptText, 
          mode: promptMode,
          context: output 
        })
      });
      const raw = await res.text();
      if (!raw) throw new Error("Empty response");
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw);
      }
      
      const resText = data.output || "[No output]";
      if (resText.includes("[CHAT]") && resText.includes("[DOCUMENT]")) {
        const parts = resText.split("[DOCUMENT]");
        const chatContent = parts[0].replace("[CHAT]", "").trim();
        const docContent = parts[1].trim();
        setMessages(prev => [...prev, { role: "assistant", text: chatContent }]);
        setOutput(docContent);
      } else {
        if (resText.startsWith("[Error]")) {
          setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${resText.replace("[Error]: ", "")}` }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: "I've updated the document for you." }]);
          setOutput(resText);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const sendText = () => {
    const prompt = text.trim();
    if (!prompt) return;
    setMessages(prev => [...prev, { role: "user", text: prompt }]);
    setIsTyping(true);
    setText("");
    generate(prompt, mode).finally(() => setIsTyping(false));
  };

  const startListening = () => {
    if (isListening) return; // Prevent multiple starts

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support the Web Speech API");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setText(prev => prev ? prev + ' ' + speechResult : speechResult);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  const toggleDropdown = () => setDropdownOpen((o) => !o);
  
  const selectMode = (key) => {
    setMode(key);
    setDropdownOpen(false);
  };

  const goHome = () => {
    navigate("/");
  };

  const handleClear = () => {
    localStorage.removeItem('eduface_content_gen');
    setText("");
    setOutput("");
    setMode("Quick Response");
  };

  const handleGeneratePPT = () => {
    if (output.trim()) {
      navigate("/ppt-generator", { state: { generatedContent: output } });
    } else {
      alert("⚠️ Please generate content first!");
    }
  };

  return (
    <div className="cge-container">
      {/* Header */}
      <div className="cge-header">
        <button className="cge-back-button" onClick={goHome}>
          <FiArrowLeft size={18} />
          Back to Home
        </button>
        <button className="cge-back-button" style={{ borderColor: '#ff4d4d', color: '#ff4d4d' }} onClick={handleClear}>
          <FiTrash2 size={18} />
          Clear Content
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="cge-main-wrapper">
        {/* LEFT - CHAT CONVERSATION */}
        <div className="cge-chat-section">
          <div className="cge-chat-window">
            <div className="cge-messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`cge-msg-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                  {msg.role === 'assistant' && <div className="cge-msg-avatar"><Bot size={20} color="white" /></div>}
                  <div className="cge-msg-bubble">
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="cge-msg-row assistant">
                  <div className="cge-msg-avatar"><Bot size={20} color="white" /></div>
                  <div className="cge-msg-bubble is-typing">
                    <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="cge-chat-input-area">
            <div className="cge-input-wrapper">
              <textarea
                ref={textareaRef}
                className="cge-chat-textarea"
                value={text}
                placeholder="Ask anything..."
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button 
                className={`cge-chat-icon-btn mic-btn ${isListening ? 'active' : ''}`} 
                onClick={startListening}
                title={isListening ? "Listening..." : "Dictate message"}
              >
                <FiMic />
              </button>
              <button
                className={`cge-chat-icon-btn send-btn ${text.trim() && !loading ? 'active' : ''}`}
                onClick={sendText}
                disabled={!text.trim() || loading}
              >
                <FiSend />
              </button>
            </div>
            
            <div className="cge-chat-extras">
              <div className="cge-mode-pill">
                Mode: <strong>{modes.find((m) => m.key === mode).label}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT - OUTPUT */}
        <div className="cge-output-section">
          <div className="cge-output-card">
            <div className="cge-output">
              {loading && !output && (
                <div className="cge-output-loading">
                  <div className="cge-output-loading-icon">⚙️</div>
                  <div className="cge-output-loading-text">Building document...</div>
                </div>
              )}
              {output ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
              ) : (
                <div className="cge-placeholder">
                  <div className="cge-placeholder-icon">📄</div>
                  <div>Your Live Document</div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>Ask me anything on the left to start building!</div>
                </div>
              )}
            </div>
          </div>

          <div className="cge-ppt-wrapper">
            <button
              onClick={handleGeneratePPT}
              className="gen-ppt-btn"
              disabled={!output.trim() || loading}
            >
              📊 Convert to PowerPoint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}