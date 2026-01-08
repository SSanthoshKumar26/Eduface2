// src/components/ContentGen.jsx
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiSend, FiMic, FiPlus, FiLoader, FiArrowLeft, FiBook } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "../styles/ContentGen.css";

export default function ContentGen() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("Quick Response");
  const [isTyping, setIsTyping] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const modes = [
    { key: "Quick Response", label: "⚡ Quick Response", desc: "Fast and concise" },
    { key: "Detailed", label: "📋 Detailed", desc: "In-depth explanation" },
    { key: "Creative", label: "🎨 Creative", desc: "Engaging and unique" }
  ];

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const generate = async (promptText, promptMode) => {
    setOutput("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, mode: promptMode })
      });
      const raw = await res.text();
      if (!raw) throw new Error("Empty response");
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw);
      }
      setOutput(data.output || "[No output]");
    } catch (err) {
      setOutput(`**Error:** ${err.message}\n\nPlease try again or check your connection.`);
    } finally {
      setLoading(false);
    }
  };

  const sendText = () => {
    const prompt = text.trim();
    if (!prompt) return;
    setIsTyping(true);
    generate(prompt, mode).finally(() => setIsTyping(false));
    setText("");
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
      </div>

      {/* Main Grid Layout */}
      <div className="cge-main-wrapper">
        {/* LEFT - EDITOR */}
        <div className="cge-editor">
          <div className="cge-editor-title">
            <FiBook size={24} style={{ color: "var(--cyan-primary)" }} />
            Create Your Content
          </div>

          <textarea
            ref={textareaRef}
            className="cge-textarea"
            value={text}
            placeholder="Enter your topic, title, or description here...&#10;Tip: Be specific for better results!"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="cge-controls">
            <div className="cge-mode-section">
              <label className="cge-mode-label">Content Style</label>
              <div className="cge-dropdown">
                <button className="cge-dd-toggle" onClick={toggleDropdown}>
                  <span>{modes.find((m) => m.key === mode).label}</span>
                  <span style={{ fontSize: "1.2rem" }}>▼</span>
                </button>
                {dropdownOpen && (
                  <ul className="cge-dd-menu">
                    {modes.map(({ key, label }) => (
                      <li
                        key={key}
                        className="cge-dd-item"
                        onClick={() => selectMode(key)}
                      >
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="cge-actions">
              {isTyping ? (
                <div className="cge-loading-state">
                  <FiLoader className="cge-spinner" />
                  Generating...
                </div>
              ) : (
                <>
                  <button className="cge-icon-btn" disabled title="Add attachment (Coming soon)">
                    <FiPlus />
                  </button>
                  <button className="cge-icon-btn" disabled title="Voice input (Coming soon)">
                    <FiMic />
                  </button>
                  <button
                    className="cge-submit-btn"
                    onClick={sendText}
                    disabled={!text.trim() || loading}
                  >
                    <FiSend />
                    Generate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT - OUTPUT */}
        <div className="cge-output-section">
          <div className="cge-output-card">
            <div className="cge-output">
              {loading ? (
                <div className="cge-output-loading">
                  <div className="cge-output-loading-icon">⚙️</div>
                  <div className="cge-output-loading-text">Generating your content...</div>
                </div>
              ) : output ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
              ) : (
                <div className="cge-placeholder">
                  <div className="cge-placeholder-icon">✨</div>
                  <div>Your generated content will appear here</div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>Fill in the topic and click Generate!</div>
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