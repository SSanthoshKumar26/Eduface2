import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '@clerk/clerk-react';
import { 
  FileVideo, 
  Upload, 
  Settings, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Mic2,
  Cpu,
  Zap,
  RefreshCcw,
  Video,
  XCircle,
  Info,
  FileText,
  Volume2,
  Trash2
} from 'lucide-react';
import LearningDashboard from './LearningDashboard';
import '../styles/VideoGenerator.css';

const API_BASE_URL = 'http://127.0.0.1:5000';

const VideoGenerator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fromGallery = location.state?.fromGallery || false;

  
  // File states
  const [pptFile, setPptFile] = useState(null);
  const [serverPptPath, setServerPptPath] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  
  // Configuration states
  const [voices, setVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [slangLevel, setSlangLevel] = useState('medium');
  const [quality, setQuality] = useState('medium');
  const [ttsEngine, setTtsEngine] = useState('edge');
  
  // Process states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Result states
  const [videoUrl, setVideoUrl] = useState(null);
  const [scriptUrl, setScriptUrl] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [summaryUrl, setSummaryUrl] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [activeJobId, setActiveJobId] = useState(localStorage.getItem('eduface_active_job'));

  const { user, isSignedIn } = useUser();

    useEffect(() => {
    // 1. Priority: Check for explicit video data passed from Gallery (location.state)
    if (location.state?.videoUrl) {
      setVideoUrl(location.state.videoUrl);
      setScriptUrl(location.state.scriptUrl);
      setAudioUrl(location.state.audioUrl);
      setSummaryUrl(location.state.summaryUrl);
      setJobId(location.state.jobId);
      setFacePreview(location.state.facePreview);
    } 
    // 2. Secondary: Check for recently generated session in localStorage
    else if (isSignedIn && user?.id) {
      const savedSession = localStorage.getItem('eduface_video_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          // HARD MATCH: Only load if the session userId matches the current logged-in user
          if (session.userId === user.id) {
            setVideoUrl(session.videoUrl);
            setScriptUrl(session.scriptUrl);
            setAudioUrl(session.audioUrl);
            setSummaryUrl(session.summaryUrl);
            setJobId(session.jobId);
            setFacePreview(session.facePreview);
            
            // Restore PPT file info for the title
            if (session.pptName) {
              setPptFile({ name: session.pptName, size: 0, restored: true });
              if (session.serverPptPath) setServerPptPath(session.serverPptPath);
            }
          } else {
            // Data leakage protection: Wipe old user's session from browser
            localStorage.removeItem('eduface_video_session');
            localStorage.removeItem('eduface_chat_messages');
          }
        } catch (e) {
          localStorage.removeItem('eduface_video_session');
        }
      }
    }
    // 3. Security: If logged out, clear any existing session states for protection
    else if (isSignedIn === false) { // Explicitly check for false, not just falsy
      setVideoUrl(null);
      localStorage.removeItem('eduface_video_session');
      localStorage.removeItem('eduface_chat_messages');
      localStorage.removeItem('eduface_active_job');
    }

    // Handle PPT file passing from Content Generator
    if (location.state?.passedPpt) {
      const { path, name } = location.state.passedPpt;
      setServerPptPath(path);
      setPptFile({ name, size: 0, isServerFile: true });
    }
    fetchVoices();
  }, [isSignedIn, user?.id, location.state]);

  // --- PERSISTENT GENERATION TRACKING ---
  useEffect(() => {
    // Priority: use local state if set, else check storage
    const currentActiveJob = activeJobId || localStorage.getItem('eduface_active_job');
    if (!currentActiveJob || videoUrl) return;

    let pollInterval;
    
    const checkStatus = async () => {
      let currentJobId = activeJobId;
      
      // If we are in "generating_sync" mode, try to fetch the real job ID from the server
      if (currentJobId === 'generating_sync' && isSignedIn && user?.id) {
        try {
          const jobRes = await axios.get(`${API_BASE_URL}/api/active-job/${user.id}`);
          if (jobRes.data.jobId) {
            currentJobId = jobRes.data.jobId;
            localStorage.setItem('eduface_active_job', currentJobId);
          }
        } catch (e) { console.error("Could not fetch active job id", e); }
      }

      if (!currentJobId || currentJobId === 'generating_sync') return;

      try {
        const res = await axios.get(`${API_BASE_URL}/api/video-status/${currentJobId}`);
        if (res.data.status === 'completed') {
          clearInterval(pollInterval);
          const data = res.data;
          const baseUrl = API_BASE_URL;
          const sessionToSave = {
            videoUrl: `${baseUrl}${data.video_url}`,
            scriptUrl: `${baseUrl}${data.script_url}`,
            audioUrl: `${baseUrl}${data.audio_url}`,
            summaryUrl: `${baseUrl}${data.summary_url}`,
            jobId: data.job_id,
            facePreview: facePreview,
            userId: user?.id,
            pptName: pptFile ? pptFile.name : 'Generated Video Lesson',
            serverPptPath: serverPptPath
          };
          localStorage.setItem('eduface_video_session', JSON.stringify(sessionToSave));
          localStorage.removeItem('eduface_active_job');
          setActiveJobId(null);
          
          setScriptUrl(sessionToSave.scriptUrl);
          setAudioUrl(sessionToSave.audioUrl);
          setSummaryUrl(sessionToSave.summaryUrl);
          setJobId(sessionToSave.jobId);
          setVideoUrl(sessionToSave.videoUrl);
          setLoading(false);

          // AUTO-SAVE to Gallery upon background completion
          if (isSignedIn && user?.id) {
            try {
              await axios.post(`${API_BASE_URL}/api/videos`, {
                userId: user.id,
                videoId: data.job_id,
                videoUrl: sessionToSave.videoUrl,
                title: pptFile ? pptFile.name : 'Generated Video Lesson',
                videoData: JSON.stringify(sessionToSave)
              });
              console.log("✅ Video auto-saved to Gallery after background generation");
            } catch (saveErr) {
              console.error("❌ Failed to auto-save to gallery:", saveErr);
            }
          }
        } else if (res.data.status === 'processing') {
          setLoading(true);
          setProgress(`${res.data.progress}%`);
          setCurrentStep(res.data.step);
        } else if (res.data.status === 'error') {
          clearInterval(pollInterval);
          localStorage.removeItem('eduface_active_job');
          setError(res.data.error || "An unknown error occurred during generation.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    };

    setLoading(true);
    setCurrentStep("Resuming active generation...");
    checkStatus();
    pollInterval = setInterval(checkStatus, 3000);

    return () => clearInterval(pollInterval);
  }, [isSignedIn, user?.id, activeJobId, videoUrl]);

  const fetchVoices = async () => {
    setVoicesLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/voices`);
      if (response.data.success && response.data.voices) {
        setVoices(response.data.voices);
        if (response.data.voices.length > 0) {
          setSelectedVoice(response.data.voices[0].id);
          setTtsEngine(response.data.voices[0].engine || 'edge');
        }
      }
    } catch (err) {
      setVoices([
        { id: 'edge_aria', name: 'Aria (Female, US)', gender: 'Female', engine: 'edge' },
        { id: 'edge_guy', name: 'Guy (Male, US)', gender: 'Male', engine: 'edge' }
      ]);
      setSelectedVoice('edge_aria');
    } finally {
      setVoicesLoading(false);
    }
  };

  const handlePPTChange = (e) => {
    const file = e.target.files[0];
    if (file) setPptFile(file);
  };

  const handleFaceChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFaceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setFacePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setPptFile(null); setServerPptPath(null); setFaceImage(null); setFacePreview(null);
    setError(null); setSuccess(null);
    setVideoUrl(null);
    // Clear local session storage on "End Session" so it doesn't reload
    localStorage.removeItem('eduface_video_session');
    localStorage.removeItem('eduface_chat_messages');
    localStorage.removeItem('eduface_active_job');
    setActiveJobId(null);
    
    // If we came from gallery, go back to gallery on exit
    if (location.state?.fromGallery) {
      navigate('/video-gallery');
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCurrentStep('uploading');
    setProgress('Uploading assets...');

    try {
      const formData = new FormData();
      if (!serverPptPath) formData.append('ppt', pptFile);
      formData.append('face', faceImage);
      if (isSignedIn && user) {
        formData.append('userId', user.id);
      }

      const uploadRes = await axios.post(`${API_BASE_URL}/api/upload-files`, formData);
      if (!uploadRes.data.success) throw new Error(uploadRes.data.error);

      setCurrentStep('generating');
      setProgress('AI is creating your lesson video...');
      
      // Mark that a generation is active (using a temp flag until we get a real job ID)
      localStorage.setItem('eduface_active_job', 'generating_sync'); 
      setActiveJobId('generating_sync');

      const generateRes = await axios.post(`${API_BASE_URL}/api/generate-video`, {
        ppt_path: serverPptPath || uploadRes.data.ppt_path,
        face_path: uploadRes.data.face_path,
        voice_id: selectedVoice,
        slang_level: slangLevel,
        quality,
        tts_engine: ttsEngine
      });

      const baseUrl = API_BASE_URL;
      const data = generateRes.data;
      if (data.success) {
        // Update with the REAL job id so the poller (useEffect) can take over
        localStorage.setItem('eduface_active_job', data.job_id); 
        setActiveJobId(data.job_id);
        console.log(`🚀 Generation started in background: ${data.job_id}`);
      } else {
        throw new Error(data.error || "Failed to start generation");
      }
    } catch (err) {
      localStorage.removeItem('eduface_active_job'); // CLEAR ON ERROR
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    } finally {
      setProgress('');
      setCurrentStep('');
    }
  };

  return (
    <>
      {videoUrl ? (
        <LearningDashboard 
          key={jobId || 'session-reset'}
          videoUrl={videoUrl} 
          scriptUrl={scriptUrl} 
          audioUrl={audioUrl} 
          summaryUrl={summaryUrl}
          jobId={jobId} 
          facePreview={facePreview}
          resetForm={resetForm} 
          user={user}
          isSignedIn={isSignedIn}
          pptName={pptFile ? pptFile.name : 'Generated Video Lesson'}
          fromGallery={fromGallery}
        />
      ) : (
        <div className="vg-root-container">
          <header className="vg-header">
            <h1 className="vg-title">Eduface Video Studio</h1>
            <p className="vg-subtitle">Transform your presentation into a professional AI-led video lesson.</p>
          </header>

          {error && <div className="vg-alert vg-alert-danger">{error}</div>}

          {loading && (
            <div className="vg-premium-loading-overlay">
              <div className="vg-premium-loading-card">
                <div className="vg-loading-icon-wrapper">
                  <div className="vg-loading-orbit"></div>
                  <Sparkles className="vg-loading-sparkle" size={32} />
                </div>
                
                <div className="vg-loading-content">
                  <h3 className="vg-loading-status-title">
                    {currentStep === 'uploading' ? 'Vaulting Assets' : 'Architecting Your Lesson'}
                  </h3>
                  <p className="vg-loading-subtitle">{progress}</p>
                  
                  <div className="vg-premium-progress-container">
                    <div className="vg-premium-progress-bar">
                      <div className="vg-premium-progress-fill"></div>
                      <div className="vg-premium-progress-shimmer"></div>
                    </div>
                  </div>

                  <div className="vg-loading-features">
                    <span className="vg-feature-tag">AI Voice Synthesis</span>
                    <span className="vg-feature-tag">Neural Lip-Sync</span>
                    <span className="vg-feature-tag">HD Compositing</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="vg-grid">
            <div className="vg-glass-card vg-card">
              <div className="vg-card-header"><Upload size={20} /> <h2>Step 1: Upload Files</h2></div>
              <div className="vg-card-body">
                <div className="vg-form-group">
                  <label className="vg-label">PowerPoint Presentation <span className="vg-required">*</span></label>
                  {!serverPptPath ? (
                    <input type="file" className="vg-cyber-input" accept=".ppt,.pptx" onChange={handlePPTChange} />
                  ) : (
                    <div className="vg-server-file-info">
                      <span>{pptFile.name} (Ready)</span>
                      <button onClick={() => { setServerPptPath(null); setPptFile(null); }}>Change</button>
                    </div>
                  )}
                </div>

                <div className="vg-form-group">
                  <label className="vg-label">Avatar Face Image <span className="vg-required">*</span></label>
                  <input type="file" className="vg-cyber-input" accept="image/*" onChange={handleFaceChange} />
                  {facePreview && (
                    <div className="vg-avatar-container">
                      <div className="vg-avatar-preview-wrapper">
                        <img src={facePreview} alt="Avatar Preview" className="vg-avatar-preview" />
                        <div className="vg-avatar-badge">
                          <CheckCircle2 size={12} />
                        </div>
                      </div>
                      <span className="vg-avatar-label">Ready for Synthesis</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="vg-glass-card vg-card">
              <div className="vg-card-header"><Settings size={20} /> <h2>Step 2: Configuration</h2></div>
              <div className="vg-card-body">
                <div className="vg-form-group">
                  <label className="vg-label">AI Voice Persona</label>
                  <select className="vg-cyber-input" value={selectedVoice} onChange={(e) => {
                    const vid = e.target.value;
                    setSelectedVoice(vid);
                    // Sync backend engine preference based on voice prefix
                    if (vid.startsWith('edge_')) setTtsEngine('edge');
                    else if (vid.startsWith('elevenlabs_')) setTtsEngine('elevenlabs');
                    else if (vid.startsWith('gtts_')) setTtsEngine('gtts');
                    else if (vid.startsWith('pyttsx3_')) setTtsEngine('pyttsx3');
                  }}>
                    {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div className="vg-form-group">
                  <label className="vg-label">Educational Tone</label>
                  <select className="vg-cyber-input" value={slangLevel} onChange={(e) => setSlangLevel(e.target.value)}>
                    <option value="none">Professional</option>
                    <option value="medium">Conversational</option>
                  </select>
                </div>

                <div className="vg-form-group">
                  <label className="vg-label">Video Quality</label>
                  <select className="vg-cyber-input" value={quality} onChange={(e) => setQuality(e.target.value)}>
                    <option value="low">Standard (Fast)</option>
                    <option value="medium">High Definition</option>
                    <option value="high">Elite (Slow)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="vg-button-wrapper" style={{ marginBottom: '4rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={handleGenerate} disabled={loading || !pptFile || !faceImage} className="vg-cyber-button">
              {loading ? <RefreshCcw className="vg-spin" size={18} /> : <Video size={18} />}
              {loading ? 'Processing...' : 'Generate AI Lesson'}
            </button>

            <button 
              onClick={() => navigate(`/thinking-mode/${jobId || 'new'}`)}
              className="vg-cyber-button"
              style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}
            >
              🧠 AI Thinking Coach
            </button>

            {!loading && (pptFile || faceImage) && (
              <button onClick={resetForm} className="vg-reset-btn">Reset</button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VideoGenerator;
