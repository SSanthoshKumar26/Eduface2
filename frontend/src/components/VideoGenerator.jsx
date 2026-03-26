import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
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

const API_BASE_URL = 'http://localhost:5000';

const VideoGenerator = () => {
  const location = useLocation();
  
  // File states
  const [pptFile, setPptFile] = useState(null);
  const [serverPptPath, setServerPptPath] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  
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
  const [jobId, setJobId] = useState(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('eduface_video_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setVideoUrl(session.videoUrl);
        setScriptUrl(session.scriptUrl);
        setAudioUrl(session.audioUrl);
        setJobId(session.jobId);
      } catch (e) {
        localStorage.removeItem('eduface_video_session');
      }
    }

    if (location.state?.passedPpt) {
      const { path, name } = location.state.passedPpt;
      setServerPptPath(path);
      setPptFile({ name, size: 0, isServerFile: true });
    }
    fetchVoices();
  }, [location.state]);

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

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) setAudioFile(file);
  };

  const resetForm = () => {
    localStorage.removeItem('eduface_video_session');
    setVideoUrl(null); setScriptUrl(null); setAudioUrl(null); setJobId(null);
    setPptFile(null); setServerPptPath(null); setFaceImage(null); setFacePreview(null);
    setAudioFile(null); setError(null); setSuccess(null);
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
      if (audioFile) formData.append('audio', audioFile);

      const uploadRes = await axios.post(`${API_BASE_URL}/api/upload-files`, formData);
      if (!uploadRes.data.success) throw new Error(uploadRes.data.error);

      setCurrentStep('generating');
      setProgress('AI is creating your lesson video...');

      const generateRes = await axios.post(`${API_BASE_URL}/api/generate-video`, {
        ppt_path: serverPptPath || uploadRes.data.ppt_path,
        face_path: uploadRes.data.face_path,
        audio_path: uploadRes.data.audio_path,
        voice_id: audioFile ? null : selectedVoice,
        slang_level: audioFile ? null : slangLevel,
        quality,
        tts_engine: audioFile ? null : ttsEngine
      });

      const baseUrl = API_BASE_URL;
      const data = generateRes.data;
      setVideoUrl(`${baseUrl}${data.video_url}`);
      setScriptUrl(`${baseUrl}${data.script_url}`);
      setAudioUrl(`${baseUrl}${data.audio_url}`);
      setJobId(data.job_id);

      localStorage.setItem('eduface_video_session', JSON.stringify({
        videoUrl: `${baseUrl}${data.video_url}`,
        scriptUrl: `${baseUrl}${data.script_url}`,
        audioUrl: `${baseUrl}${data.audio_url}`,
        jobId: data.job_id
      }));

    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setProgress('');
      setCurrentStep('');
    }
  };

  return (
    <div className="vg-root-container">
      {videoUrl ? (
        <LearningDashboard videoUrl={videoUrl} scriptUrl={scriptUrl} audioUrl={audioUrl} jobId={jobId} resetForm={resetForm} />
      ) : (
        <div className="container">
          <header className="vg-header">
            <h1 className="vg-title">Eduface Video Studio</h1>
            <p className="vg-subtitle">Transform your presentation into a professional AI-led video lesson.</p>
          </header>

          {error && <div className="vg-alert vg-alert-danger">{error}</div>}

          {loading && (
            <div className="vg-glass-card vg-progress-card">
              <div className="vg-spinner"></div>
              <h3>{currentStep}</h3>
              <p>{progress}</p>
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
                  {facePreview && <div className="mt-2"><img src={facePreview} alt="Preview" style={{width: 80, borderRadius: '50%'}} /></div>}
                </div>

                <div className="vg-form-group">
                  <label className="vg-label">Voice Sample for Cloning (Optional)</label>
                  <input type="file" className="vg-cyber-input" accept="audio/*" onChange={handleAudioChange} />
                  {audioFile && <small className="text-success d-block mt-1">Audio file selected: {audioFile.name}</small>}
                </div>
              </div>
            </div>

            <div className="vg-glass-card vg-card">
              <div className="vg-card-header"><Settings size={20} /> <h2>Step 2: Configuration</h2></div>
              <div className="vg-card-body">
                <div className="vg-form-group">
                  <label className="vg-label">AI Voice Persona {audioFile && '(Ignored - Custom Voice Clone Applied)'}</label>
                  <select className="vg-cyber-input" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} disabled={!!audioFile}>
                    {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div className="vg-form-group">
                  <label className="vg-label">Educational Tone</label>
                  <select className="vg-cyber-input" value={slangLevel} onChange={(e) => setSlangLevel(e.target.value)} disabled={!!audioFile}>

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

          <div className="vg-button-wrapper">
            <button onClick={handleGenerate} disabled={loading || !pptFile || !faceImage} className="vg-cyber-button">
              {loading ? <RefreshCcw className="vg-spin" size={18} /> : <Video size={18} />}
              {loading ? 'Processing...' : 'Generate AI Lesson'}
            </button>
            {!loading && (pptFile || faceImage) && (
              <button onClick={resetForm} className="vg-reset-btn">Reset</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;
