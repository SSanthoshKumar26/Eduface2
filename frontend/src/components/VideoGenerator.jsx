import React, { useState, useEffect } from 'react';
import '../styles/VideoGenerator.css';

const API_BASE_URL = 'http://localhost:5000';

const VideoGenerator = () => {
  const [pptFile, setPptFile] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  
  const [voices, setVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('gtts_en');
  const [slangLevel, setSlangLevel] = useState('medium');
  const [quality, setQuality] = useState('medium');
  const [ttsEngine, setTtsEngine] = useState('edge');
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [videoUrl, setVideoUrl] = useState(null);
  const [scriptUrl, setScriptUrl] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [jobId, setJobId] = useState(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setVoicesLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/voices`);
      const data = await response.json();
      
      if (data.success && data.voices && data.voices.length > 0) {
        const transformedVoices = data.voices.map(voice => ({
          id: voice.id,
          name: voice.name,
          engine: voice.engine || 'gtts',
          language: voice.language || 'en',
          gender: voice.name.includes('Female') || voice.name.includes('Aria') 
            ? 'Female' 
            : voice.name.includes('Male') || voice.name.includes('Guy')
            ? 'Male'
            : 'Neutral'
        }));
        
        setVoices(transformedVoices);
        setSelectedVoice(transformedVoices[0].id);
        setTtsEngine(transformedVoices[0].engine);
      } else {
        throw new Error('No voices available');
      }
    } catch (err) {
      const defaultVoices = [
        { id: 'edge_aria', name: 'Aria (Female, US)', engine: 'edge', language: 'en-US', gender: 'Female' },
        { id: 'edge_guy', name: 'Guy (Male, US)', engine: 'edge', language: 'en-US', gender: 'Male' },
        { id: 'gtts_en', name: 'Google TTS (English)', engine: 'gtts', language: 'en', gender: 'Neutral' },
      ];
      
      setVoices(defaultVoices);
      setSelectedVoice(defaultVoices[0].id);
      setTtsEngine(defaultVoices[0].engine);
    } finally {
      setVoicesLoading(false);
    }
  };

  const handleVoiceChange = (voiceId) => {
    setSelectedVoice(voiceId);
    const voice = voices.find(v => v.id === voiceId);
    if (voice && voice.engine) {
      setTtsEngine(voice.engine);
    }
  };

  const handlePPTChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
      const validExtensions = ['.ppt', '.pptx'];
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (validTypes.includes(file.type) || validExtensions.includes(extension)) {
        setPptFile(file);
        setError(null);
      } else {
        setError('Please select a valid PowerPoint file (.ppt or .pptx)');
        setPptFile(null);
      }
    }
  };

  const handleFaceChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setFaceImage(file);
        setFacePreview(URL.createObjectURL(file));
        setError(null);
      } else {
        setError('Please select a valid image file');
        setFaceImage(null);
        setFacePreview(null);
      }
    }
  };

  const resetForm = () => {
    setPptFile(null);
    setFaceImage(null);
    setFacePreview(null);
    setError(null);
    setSuccess(null);
    setProgress('');
    setCurrentStep('');
    setVideoUrl(null);
    setScriptUrl(null);
    setAudioUrl(null);
    setJobId(null);
  };

  const handleGenerate = async () => {
    if (!pptFile) {
      setError('Please upload a PowerPoint presentation');
      return;
    }
    if (!faceImage) {
      setError('Please upload a face image');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setVideoUrl(null);
    setScriptUrl(null);
    setAudioUrl(null);

    try {
      setCurrentStep('Uploading files...');
      setProgress('Uploading your PPT and face image...');
      
      const formData = new FormData();
      formData.append('ppt', pptFile);
      formData.append('face', faceImage);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/upload-files`, {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      const { ppt_path, face_path } = uploadData;

      setCurrentStep('Processing video...');
      setProgress('Generating your AI avatar video. This may take 5-10 minutes...');
      
      const generateResponse = await fetch(`${API_BASE_URL}/api/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ppt_path,
          face_path,
          voice_id: selectedVoice,
          slang_level: slangLevel,
          quality,
          tts_engine: ttsEngine
        })
      });

      const generateData = await generateResponse.json();

      if (generateData.success) {
        const baseUrl = API_BASE_URL;
        setVideoUrl(`${baseUrl}${generateData.video_url}`);
        setScriptUrl(`${baseUrl}${generateData.script_url}`);
        setAudioUrl(`${baseUrl}${generateData.audio_url}`);
        setJobId(generateData.job_id);
        
        setSuccess('Video generated successfully! 🎉');
        setProgress('');
        setCurrentStep('');
      } else {
        throw new Error(generateData.error || 'Video generation failed');
      }
    } catch (err) {
      let errorMessage = 'An error occurred during video generation';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProgress('');
      setCurrentStep('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vg-root-container">
      {/* Header */}
      <div className="vg-header">
        <div className="vg-icon-wrapper">
          <span className="vg-icon">🎬</span>
        </div>
        <h1 className="vg-title">AI Avatar Video Generator</h1>
        <p className="vg-subtitle">Transform your presentations into engaging AI-powered videos with advanced lip-sync technology</p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="vg-alert vg-alert-danger">
          <span className="vg-alert-icon">⚠️</span>
          <div className="vg-alert-content">
            <strong>Error:</strong> {error}
          </div>
          <button onClick={() => setError(null)} className="vg-close-btn">×</button>
        </div>
      )}

      {success && (
        <div className="vg-alert vg-alert-success">
          <span className="vg-alert-icon">✅</span>
          <div className="vg-alert-content">
            <strong>Success!</strong> {success}
          </div>
          <button onClick={() => setSuccess(null)} className="vg-close-btn">×</button>
        </div>
      )}

      {/* Progress Indicator */}
      {loading && (
        <div className="vg-glass-card vg-progress-card">
          <div className="vg-progress-content">
            <div className="vg-spinner"></div>
            <div className="vg-progress-text">
              <h3 className="vg-progress-title">{currentStep}</h3>
              <p className="vg-progress-subtitle">{progress}</p>
            </div>
          </div>
          <div className="vg-progress-bar">
            <div className="vg-progress-bar-fill"></div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="vg-grid">
        {/* Upload Section */}
        <div className="vg-glass-card vg-card">
          <div className="vg-card-header">
            <span className="vg-card-icon">📁</span>
            <h2 className="vg-card-title">Step 1: Upload Files</h2>
          </div>
          
          <div className="vg-card-body">
            {/* PPT Upload */}
            <div className="vg-form-group">
              <label className="vg-label">
                PowerPoint Presentation <span className="vg-required">*</span>
              </label>
              <input
                type="file"
                className="vg-cyber-input"
                accept=".ppt,.pptx"
                onChange={handlePPTChange}
                disabled={loading}
              />
              {pptFile && (
                <div className="vg-file-info">
                  <span className="vg-checkmark">✓</span>
                  {pptFile.name} ({(pptFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              <small className="vg-hint">Upload the presentation you want to convert</small>
            </div>

            {/* Face Image Upload */}
            <div className="vg-form-group">
              <label className="vg-label">
                Avatar Face Image <span className="vg-required">*</span>
              </label>
              <input
                type="file"
                className="vg-cyber-input"
                accept="image/*"
                onChange={handleFaceChange}
                disabled={loading}
              />
              <small className="vg-hint">Clear frontal face photo with good lighting</small>
            </div>

            {/* Face Preview */}
            {facePreview && (
              <div className="vg-preview-wrapper">
                <p className="vg-preview-label">Preview</p>
                <div className="vg-image-wrapper">
                  <img
                    src={facePreview}
                    alt="Face preview"
                    className="vg-preview-image"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Configuration Section */}
        <div className="vg-glass-card vg-card vg-card-config">
          <div className="vg-card-header vg-card-header-config">
            <span className="vg-card-icon">⚙️</span>
            <h2 className="vg-card-title">Step 2: Configure Options</h2>
          </div>
          
          <div className="vg-card-body">
            {/* Voice Selection */}
            <div className="vg-form-group">
              <label className="vg-label">
                Voice Style
                {voicesLoading && <span className="vg-loading-spinner">⏳</span>}
              </label>
              <select
                className="vg-cyber-input"
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                disabled={loading || voicesLoading}
              >
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>{voice.name}</option>
                ))}
              </select>
              <small className="vg-hint">{voices.length} voices available</small>
            </div>

            {/* TTS Engine */}
            <div className="vg-form-group">
              <label className="vg-label">TTS Engine</label>
              <input 
                type="text" 
                className="vg-cyber-input"
                value={ttsEngine.toUpperCase()} 
                disabled 
                readOnly
              />
              <small className="vg-hint">Auto-selected based on voice</small>
            </div>

            {/* Speaking Style */}
            <div className="vg-form-group">
              <label className="vg-label">Speaking Style</label>
              <select
                className="vg-cyber-input"
                value={slangLevel}
                onChange={(e) => setSlangLevel(e.target.value)}
                disabled={loading}
              >
                <option value="none">Formal (Professional)</option>
                <option value="medium">Conversational (Recommended)</option>
                <option value="high">Casual (Informal)</option>
              </select>
            </div>

            {/* Video Quality */}
            <div className="vg-form-group">
              <label className="vg-label">Video Quality</label>
              <select
                className="vg-cyber-input"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                disabled={loading}
              >
                <option value="low">Fast - Low Quality (~3 min)</option>
                <option value="medium">Balanced - Medium (~5 min)</option>
                <option value="high">Best - High Quality (~10 min)</option>
              </select>
            </div>

            {/* Status Badge */}
            <div className="vg-status-badge">
              <span className="vg-status-dot"></span>
              <span>Connected ({voices.length} voices)</span>
              <button 
                onClick={fetchVoices}
                disabled={voicesLoading}
                className="vg-refresh-btn"
              >
                🔄
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="vg-button-wrapper">
        <button
          onClick={handleGenerate}
          disabled={loading || !pptFile || !faceImage}
          className="vg-cyber-button"
        >
          {loading ? '⏳ Generating...' : '🚀 Generate AI Avatar Video'}
        </button>
        
        {!loading && (pptFile || faceImage) && (
          <button
            onClick={resetForm}
            className="vg-cyber-button vg-cyber-button-secondary"
          >
            🔄 Reset
          </button>
        )}
      </div>

      {/* Results Section */}
      {videoUrl && (
        <div className="vg-glass-card vg-neon-border vg-results-card">
          <div className="vg-results-header">
            <h2 className="vg-results-title">🎉 Your Video is Ready!</h2>
          </div>
          
          <div className="vg-video-wrapper">
            <video
              controls
              src={videoUrl}
              className="vg-video"
            />
          </div>

          <div className="vg-download-buttons">
            <a href={videoUrl} download className="vg-cyber-button">
              📥 Download Video
            </a>
            {scriptUrl && (
              <a href={scriptUrl} download className="vg-cyber-button vg-cyber-button-script">
                📄 Script
              </a>
            )}
            {audioUrl && (
              <a href={audioUrl} download className="vg-cyber-button vg-cyber-button-audio">
                🎵 Audio
              </a>
            )}
            <button onClick={resetForm} className="vg-cyber-button vg-cyber-button-secondary">
              🔄 New Video
            </button>
          </div>

          {jobId && (
            <div className="vg-job-id">
              <small>Job ID: {jobId}</small>
            </div>
          )}
        </div>
      )}

      {/* Tips Section */}
      {!videoUrl && !loading && (
        <div className="vg-glass-card vg-tips-card">
          <h3 className="vg-tips-title">💡 Tips for Best Results</h3>
          <ul className="vg-tips-list">
            <li className="vg-tip-item">→ Use a clear, front-facing photo with excellent lighting</li>
            <li className="vg-tip-item">→ Single person in the image works best</li>
            <li className="vg-tip-item">→ Keep presentations concise for faster processing</li>
            <li className="vg-tip-item">→ Try "Medium Quality" for optimal balance</li>
            <li className="vg-tip-item">→ First-time processing may take longer</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;