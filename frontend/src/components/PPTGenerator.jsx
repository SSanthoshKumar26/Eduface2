import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { FiArrowLeft, FiDownload, FiLoader, FiCheck, FiX } from 'react-icons/fi';
import ThemeSelector from './ThemeSelector';
import '../styles/PPTGenerator.css';

const PPTGenerator = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const generatedContent = location.state?.generatedContent || "";

  const [fileName, setFileName] = useState("AI_Generated_Presentation");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('modern_blue');
  const [customizations, setCustomizations] = useState({
    font_size: 18,
    slide_count: 5,
    theme: 'modern_blue'
  });
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    setCustomizations(prev => ({ ...prev, theme: selectedTheme }));
  }, [selectedTheme]);

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
  };

  const handleCustomizationChange = (key, value) => {
    setCustomizations(prev => ({ ...prev, [key]: value }));
  };

  const [generatedPpt, setGeneratedPpt] = useState(null);

  const handleGeneratePPT = async () => {
    if (!generatedContent) {
      alert('No content available for PPT generation!');
      return;
    }

    setIsGenerating(true);
    setStatus('generating');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => (prev >= 90 ? prev : prev + Math.random() * 10));
    }, 300);

    try {
      const pptData = {
        content: generatedContent,
        title: fileName,
        filename: fileName,
        customizations: {
          ...customizations,
          theme: selectedTheme
        }
      };

      const response = await axios.post('http://localhost:5000/api/generate-ppt', pptData, {
        responseType: 'blob',
        timeout: 120000 // Extended timeout for large PPTs
      });

      setProgress(100);

      const pptPath = response.headers['x-ppt-path'];
      const pptFilename = response.headers['x-ppt-filename'];
      
      if (pptPath) {
        setGeneratedPpt({ path: pptPath, filename: pptFilename });
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });

      saveAs(blob, `${fileName}.pptx`);
      setStatus('success');

      // Keep success status visible longer
    } catch (error) {
      console.error('PPT generation failed:', error);
      setStatus('error');
      alert('Failed to generate PPT. Please try again.');
    } finally {
      setIsGenerating(false);
      clearInterval(progressInterval);
    }
  };

  const handleUseForVideo = () => {
    if (!generatedPpt) return;
    navigate('/video-gen', { 
      state: { 
        passedPpt: {
          path: generatedPpt.path,
          name: generatedPpt.filename
        }
      } 
    });
  };

  return (
    <div className="ppt-root-container">
      <div className="ppt-header">
        <button className="ppt-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft size={20} />
          Back
        </button>
        <h1 className="ppt-page-title">Professional PPT Generator</h1>
        <div className="ppt-header-spacer"></div>
      </div>

      <div className="ppt-main-content">
        <div className="ppt-grid-wrapper">
          {/* Left Section - Content Preview */}
          <div className="ppt-left-panel">
            <div className="ppt-preview-card">
              <h3 className="ppt-card-title">Content Preview</h3>
              <div className="ppt-content-box">
                <p className="ppt-preview-text">{generatedContent.substring(0, 2000)}...</p>
              </div>
              <div className="ppt-content-info">
                <span className="ppt-info-badge">📄 {Math.ceil(generatedContent.length / 500)} pages</span>
              </div>
            </div>
          </div>

          {/* Right Section - Customization */}
          <div className="ppt-right-panel">
            {/* Theme Section */}
            <div className="ppt-settings-card">
              <h3 className="ppt-card-title">Design Theme</h3>
              <ThemeSelector selectedTheme={selectedTheme} onThemeSelect={handleThemeSelect} />
            </div>

            {/* Advanced Options */}
            <div className="ppt-settings-card">
              <h3 className="ppt-card-title">Customization</h3>
              
              <div className="ppt-form-group">
                <label className="ppt-form-label">Font Size</label>
                <div className="ppt-slider-container">
                  <input
                    type="range"
                    min="14"
                    max="28"
                    value={customizations.font_size}
                    onChange={e => handleCustomizationChange('font_size', parseInt(e.target.value))}
                    className="ppt-slider"
                  />
                  <span className="ppt-slider-value">{customizations.font_size}px</span>
                </div>
              </div>

              <div className="ppt-form-group">
                <label className="ppt-form-label">Number of Slides</label>
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={customizations.slide_count}
                  onChange={e => handleCustomizationChange('slide_count', parseInt(e.target.value))}
                  className="ppt-number-input"
                />
              </div>
            </div>

            {/* Filename Input */}
            <div className="ppt-settings-card">
              <h3 className="ppt-card-title">File Name</h3>
              <div className="ppt-form-group">
                <input
                  type="text"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="Enter presentation name"
                  className="ppt-text-input"
                />
                <small className="ppt-input-hint">.pptx will be added automatically</small>
              </div>
            </div>

            {/* Progress Section */}
            {status === 'generating' && (
              <div className="ppt-progress-card">
                <div className="ppt-progress-content">
                  <FiLoader size={24} className="ppt-progress-spinner" />
                  <div className="ppt-progress-text">
                    <p className="ppt-progress-title">Creating Presentation...</p>
                    <p className="ppt-progress-subtitle">{Math.round(progress)}% complete</p>
                  </div>
                </div>
                <div className="ppt-progress-bar">
                  <div className="ppt-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Status Messages */}
            {status === 'success' && (
              <div className="ppt-status-card ppt-status-success">
                <FiCheck size={24} className="ppt-status-icon" />
                <div>
                  <p className="ppt-status-title">Success!</p>
                  <p className="ppt-status-message">Professional PPT generated and downloaded</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="ppt-status-card ppt-status-error">
                <FiX size={24} className="ppt-status-icon" />
                <div>
                  <p className="ppt-status-title">Error!</p>
                  <p className="ppt-status-message">Generation failed. Please try again.</p>
                </div>
              </div>
            )}

            {/* Buttons Group */}
            <div className="ppt-actions-wrapper">
              <button
                className="ppt-generate-btn"
                onClick={handleGeneratePPT}
                disabled={isGenerating || !generatedContent}
              >
                <FiDownload size={20} />
                {isGenerating ? 'Generating...' : status === 'success' ? 'Regenerate PPT' : 'Generate Professional PPT'}
              </button>

              {status === 'success' && generatedPpt && (
                <button
                  className="ppt-use-btn"
                  onClick={handleUseForVideo}
                >
                  <FiCheck size={20} />
                  Use this PPT for Video
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PPTGenerator;
