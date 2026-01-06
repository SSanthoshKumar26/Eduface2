import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const VideoGenerator = () => {
  // File states
  const [pptFile, setPptFile] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  
  // Configuration states
  const [voices, setVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState(0);
  const [slangLevel, setSlangLevel] = useState('medium');
  const [quality, setQuality] = useState('medium');
  const [ttsEngine, setTtsEngine] = useState('gtts');
  
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

  // Fetch available voices on mount
  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setVoicesLoading(true);
    try {
      console.log('🔍 Fetching voices from:', `${API_BASE_URL}/api/voices`);
      const response = await axios.get(`${API_BASE_URL}/api/voices`, {
        timeout: 5000
      });
      
      console.log('📥 Voice API Response:', response.data);
      
      if (response.data.success && response.data.voices) {
        setVoices(response.data.voices);
        console.log('✅ Voices loaded:', response.data.voices.length);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('❌ Could not fetch voices:', err.message);
      
      // Set default fallback voices
      const defaultVoices = [
        { id: 0, name: 'Google TTS Female', gender: 'Female' },
        { id: 1, name: 'Google TTS Male', gender: 'Male' },
        { id: 2, name: 'System Voice 1', gender: 'Female' },
        { id: 3, name: 'System Voice 2', gender: 'Male' }
      ];
      
      setVoices(defaultVoices);
      console.log('ℹ️ Using default voices (API unavailable)');
      
      // Show warning to user
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        setError('Could not connect to backend. Using default voices. Make sure backend is running on port 5000.');
      }
    } finally {
      setVoicesLoading(false);
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
        console.log('✅ PPT file selected:', file.name);
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
        console.log('✅ Face image selected:', file.name);
      } else {
        setError('Please select a valid image file (JPG, PNG)');
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
    // Validation
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
      // Step 1: Upload files
      setCurrentStep('Uploading files...');
      setProgress('Uploading your PPT and face image...');
      
      const formData = new FormData();
      formData.append('ppt', pptFile);
      formData.append('face', faceImage);

      console.log('📤 Uploading files...');
      const uploadResponse = await axios.post(
        `${API_BASE_URL}/api/upload-files`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.error || 'Upload failed');
      }

      const { ppt_path, face_path } = uploadResponse.data;
      console.log('✅ Files uploaded successfully');

      // Step 2: Generate video
      setCurrentStep('Processing video...');
      setProgress('Generating your AI avatar video. This may take 5-10 minutes...');
      
      console.log('🎥 Starting video generation...');
      const generateResponse = await axios.post(
        `${API_BASE_URL}/api/generate-video`,
        {
          ppt_path,
          face_path,
          voice_id: selectedVoice,
          slang_level: slangLevel,
          quality,
          tts_engine: ttsEngine
        },
        {
          timeout: 600000 // 10 minute timeout
        }
      );

      if (generateResponse.data.success) {
        console.log('✅ Video generated successfully!');
        
        const baseUrl = API_BASE_URL;
        setVideoUrl(`${baseUrl}${generateResponse.data.video_url}`);
        setScriptUrl(`${baseUrl}${generateResponse.data.script_url}`);
        setAudioUrl(`${baseUrl}${generateResponse.data.audio_url}`);
        setJobId(generateResponse.data.job_id);
        
        setSuccess('Video generated successfully! 🎉');
        setProgress('');
        setCurrentStep('');
      } else {
        throw new Error(generateResponse.data.error || 'Video generation failed');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      
      let errorMessage = 'An error occurred during video generation';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The video generation took too long. Please try with a shorter presentation or lower quality setting.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
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
    <div className="container mt-4">
      <div className="row mb-4">
        <div className="col-12">
          <h2 className="text-center mb-2">🎬 AI Avatar Video Generator</h2>
          <p className="text-center text-muted">
            Transform your PowerPoint presentation into an engaging AI-powered video with lip-synced avatar
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      {/* Progress Indicator */}
      {loading && (
        <div className="card mb-4 border-primary">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="spinner-border text-primary me-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-1">{currentStep}</h6>
                <p className="mb-0 text-muted small">{progress}</p>
              </div>
            </div>
            <div className="progress mt-3" style={{ height: '8px' }}>
              <div className="progress-bar progress-bar-striped progress-bar-animated" 
                   role="progressbar" 
                   style={{ width: '100%' }}>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {/* Left Column - Upload Section */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">📁 Step 1: Upload Files</h5>
            </div>
            <div className="card-body">
              {/* PPT Upload */}
              <div className="mb-4">
                <label className="form-label fw-bold">
                  PowerPoint Presentation <span className="text-danger">*</span>
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept=".ppt,.pptx"
                  onChange={handlePPTChange}
                  disabled={loading}
                />
                {pptFile && (
                  <div className="mt-2">
                    <small className="text-success">
                      ✅ {pptFile.name} ({(pptFile.size / 1024 / 1024).toFixed(2)} MB)
                    </small>
                  </div>
                )}
                <small className="text-muted d-block mt-1">
                  Upload the presentation you want to convert into a video
                </small>
              </div>

              {/* Face Image Upload */}
              <div className="mb-3">
                <label className="form-label fw-bold">
                  Avatar Face Image <span className="text-danger">*</span>
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleFaceChange}
                  disabled={loading}
                />
                <small className="text-muted d-block mt-1">
                  Clear frontal face photo with good lighting. Single person only.
                </small>
              </div>

              {/* Face Preview */}
              {facePreview && (
                <div className="text-center mt-3">
                  <p className="mb-2 fw-bold">Preview:</p>
                  <img
                    src={facePreview}
                    alt="Face preview"
                    className="img-thumbnail rounded-circle"
                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Configuration Section */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">⚙️ Step 2: Configure Options</h5>
            </div>
            <div className="card-body">
              {/* Voice Selection */}
              <div className="mb-3">
                <label className="form-label fw-bold">
                  Voice Style
                  {voicesLoading && (
                    <span className="spinner-border spinner-border-sm ms-2" role="status"></span>
                  )}
                </label>
                <select
                  className="form-select"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(Number(e.target.value))}
                  disabled={loading || voicesLoading}
                >
                  {voicesLoading ? (
                    <option value={0}>Loading voices...</option>
                  ) : voices.length > 0 ? (
                    voices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.gender})
                      </option>
                    ))
                  ) : (
                    <option value={0}>No voices available</option>
                  )}
                </select>
                <small className="text-muted">
                  {voices.length > 0 
                    ? `${voices.length} voice${voices.length !== 1 ? 's' : ''} available`
                    : 'Using default TTS engine'
                  }
                </small>
              </div>

              {/* TTS Engine */}
              <div className="mb-3">
                <label className="form-label fw-bold">TTS Engine</label>
                <select
                  className="form-select"
                  value={ttsEngine}
                  onChange={(e) => setTtsEngine(e.target.value)}
                  disabled={loading}
                >
                  <option value="gtts">Google TTS (Recommended)</option>
                  <option value="pyttsx3">System TTS (Offline)</option>
                </select>
                <small className="text-muted">Choose text-to-speech engine</small>
              </div>

              {/* Speaking Style */}
              <div className="mb-3">
                <label className="form-label fw-bold">Speaking Style</label>
                <select
                  className="form-select"
                  value={slangLevel}
                  onChange={(e) => setSlangLevel(e.target.value)}
                  disabled={loading}
                >
                  <option value="none">Formal (Professional)</option>
                  <option value="medium">Conversational (Recommended)</option>
                  <option value="high">Casual (Informal)</option>
                </select>
                <small className="text-muted">How should the avatar speak?</small>
              </div>

              {/* Video Quality */}
              <div className="mb-3">
                <label className="form-label fw-bold">Video Quality</label>
                <select
                  className="form-select"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  disabled={loading}
                >
                  <option value="low">Fast - Low Quality (~3 min)</option>
                  <option value="medium">Balanced - Medium Quality (~5 min)</option>
                  <option value="high">Best - High Quality (~10 min)</option>
                </select>
                <small className="text-muted">Higher quality takes longer to process</small>
              </div>

              {/* Backend Status Indicator */}
              <div className="mt-3 p-2 bg-light rounded">
                <small className="text-muted d-flex align-items-center">
                  <span className={`badge ${voices.length > 0 ? 'bg-success' : 'bg-warning'} me-2`}>
                    {voices.length > 0 ? '●' : '●'}
                  </span>
                  {voices.length > 0 
                    ? 'Backend connected' 
                    : 'Backend disconnected (using defaults)'
                  }
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="row mb-4">
        <div className="col-12 text-center">
          <button
            onClick={handleGenerate}
            disabled={loading || !pptFile || !faceImage}
            className="btn btn-primary btn-lg px-5"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Generating Video...
              </>
            ) : (
              <>
                🎬 Generate AI Avatar Video
              </>
            )}
          </button>
          
          {!loading && (pptFile || faceImage) && (
            <button
              onClick={resetForm}
              className="btn btn-outline-secondary btn-lg ms-3 px-4"
            >
              🔄 Reset
            </button>
          )}
        </div>
        
        {(pptFile || faceImage) && !loading && (
          <div className="col-12 text-center mt-2">
            <small className="text-muted">
              Processing time: {quality === 'low' ? '~3 minutes' : quality === 'medium' ? '~5 minutes' : '~10 minutes'}
            </small>
          </div>
        )}
      </div>

      {/* Results Section */}
      {videoUrl && (
        <div className="row">
          <div className="col-12">
            <div className="card border-success">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">🎉 Your Video is Ready!</h5>
              </div>
              <div className="card-body">
                {/* Video Player */}
                <div className="ratio ratio-16x9 mb-4">
                  <video
                    controls
                    className="rounded"
                    src={videoUrl}
                    style={{ backgroundColor: '#000' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Download Buttons */}
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  <a
                    href={videoUrl}
                    download
                    className="btn btn-success"
                  >
                    📥 Download Video (MP4)
                  </a>
                  
                  {scriptUrl && (
                    <a
                      href={scriptUrl}
                      download
                      className="btn btn-outline-primary"
                    >
                      📄 Download Script (TXT)
                    </a>
                  )}
                  
                  {audioUrl && (
                    <a
                      href={audioUrl}
                      download
                      className="btn btn-outline-info"
                    >
                      🎵 Download Audio (WAV)
                    </a>
                  )}
                  
                  <button
                    onClick={resetForm}
                    className="btn btn-outline-secondary"
                  >
                    🔄 Generate Another Video
                  </button>
                </div>

                {jobId && (
                  <div className="mt-3 text-center">
                    <small className="text-muted">Job ID: {jobId}</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      {!videoUrl && !loading && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="fw-bold mb-3">💡 Tips for Best Results:</h6>
                <ul className="mb-0">
                  <li>Use a clear, front-facing photo with good lighting</li>
                  <li>Single person in the image works best</li>
                  <li>Keep presentations concise for faster processing</li>
                  <li>Try "Medium Quality" for balanced speed and quality</li>
                  <li>First-time processing may take longer to initialize</li>
                  <li>Backend must be running on port 5000 for voice options</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;