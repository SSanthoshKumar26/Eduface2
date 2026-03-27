import os
import time
from gtts import gTTS
from pydub import AudioSegment
from pydub.effects import normalize

class TTSEngine:
    def __init__(self):
        self.supported_engines = ['elevenlabs', 'edge', 'gtts', 'pyttsx3']
        
        # Configure ffmpeg path for pydub
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ffmpeg_exe = os.path.join(backend_dir, 'Wav2Lip', 'ffmpeg.exe')
        if os.path.exists(ffmpeg_exe):
            AudioSegment.converter = ffmpeg_exe
            print(f"  ✅ pydub configured with ffmpeg at: {ffmpeg_exe}")
        else:
            print("  ⚠️ Wav2Lip/ffmpeg.exe not found. Audio normalization might fail.")
    
    def generate_audio_gtts(self, text, output_path, retries=3):
        """
        Generate audio using gTTS with retry logic
        
        Args:
            text: Text to convert to speech
            output_path: Path to save audio file
            retries: Number of retry attempts
            
        Returns:
            Path to generated audio file or None
        """
        if not text or len(text.strip()) < 5:
            print(f"  ❌ Text too short: '{text}'")
            return None
        
        text = text.strip()
        print(f"  📝 Converting {len(text)} characters to speech...")
        print(f"     Preview: {text[:100]}...")
        
        for attempt in range(retries):
            try:
                if attempt > 0:
                    print(f"  🔄 Retry attempt {attempt + 1}/{retries}...")
                    time.sleep(2)  # Wait before retry
                
                # Generate with gTTS
                tts = gTTS(
                    text=text,
                    lang='en',
                    slow=False,
                    lang_check=False  # Skip language check to avoid API issues
                )
                
                # Save to temporary MP3
                temp_mp3 = output_path.replace('.wav', f'_temp_{int(time.time())}.mp3')
                tts.save(temp_mp3)
                
                # Convert MP3 to WAV
                print(f"  🔄 Converting to WAV format...")
                audio = AudioSegment.from_mp3(temp_mp3)
                audio.export(output_path, format='wav')
                
                # Clean up temp file
                if os.path.exists(temp_mp3):
                    try:
                        os.remove(temp_mp3)
                    except:
                        pass
                
                print(f"  ✅ Audio generated successfully!")
                return output_path
                
            except Exception as e:
                print(f"  ⚠️ gTTS attempt {attempt + 1} failed: {str(e)}")
                if attempt == retries - 1:
                    print(f"  ❌ All gTTS attempts failed")
                    return None
        
        return None
    
    def generate_audio_edge(self, text, output_path, voice_id='edge_aria'):
        """
        Generate audio using Edge TTS (more reliable)
        
        Args:
            text: Text to convert to speech
            output_path: Path to save audio file
            voice_id: Voice ID string ('edge_aria', 'edge_guy', etc.)
            
        Returns:
            Path to generated audio file or None
        """
        try:
            import asyncio
            import edge_tts
            
            if not text or len(text.strip()) < 5:
                print(f"  ❌ Text too short: '{text}'")
                return None
            
            text = text.strip()
            
            # Map voice IDs to Edge TTS voice names
            voice_map = {
                'edge_aria': 'en-US-AriaNeural',
                'edge_guy': 'en-US-GuyNeural',
                'edge_jenny': 'en-US-JennyNeural',
                'edge_steffan': 'en-US-SteffanNeural'
            }
            
            # Get the voice name, default to Aria
            edge_voice = voice_map.get(voice_id, 'en-US-AriaNeural')
            
            print(f"  📝 Converting {len(text)} characters with Edge TTS...")
            print(f"  🎤 Using voice: {edge_voice}")
            
            async def _generate():
                communicate = edge_tts.Communicate(text, edge_voice)
                temp_mp3 = output_path.replace('.wav', f'_edge_{int(time.time())}.mp3')
                await communicate.save(temp_mp3)
                
                # Convert to WAV
                audio = AudioSegment.from_mp3(temp_mp3)
                audio.export(output_path, format='wav')
                
                # Clean up
                if os.path.exists(temp_mp3):
                    try:
                        os.remove(temp_mp3)
                    except:
                        pass
            
            asyncio.run(_generate())
            print(f"  ✅ Edge TTS succeeded!")
            return output_path
            
        except ImportError:
            print(f"  ⚠️ Edge TTS not installed. Run: pip install edge-tts")
            return None
        except Exception as e:
            print(f"  ❌ Edge TTS failed: {str(e)}")
            return None
    
    def generate_audio_pyttsx3(self, text, output_path, voice_id=0):
        """
        Generate audio using pyttsx3 (offline)
        
        Args:
            text: Text to convert to speech
            output_path: Path to save audio file
            voice_id: Voice index to use
            
        Returns:
            Path to generated audio file or None
        """
        try:
            import pyttsx3
            
            if not text or len(text.strip()) < 5:
                print(f"  ❌ Text too short: '{text}'")
                return None
            
            text = text.strip()
            print(f"  📝 Converting {len(text)} characters with pyttsx3...")
            
            engine = pyttsx3.init()
            
            # Get available voices
            voices = engine.getProperty('voices')
            if voice_id < len(voices):
                engine.setProperty('voice', voices[voice_id].id)
            
            # Set speech rate
            engine.setProperty('rate', 150)
            
            # Save audio
            temp_wav = output_path.replace('.wav', f'_pyttsx3_{int(time.time())}.wav')
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(temp_wav), exist_ok=True)
            
            # If the file exists for some reason, try to remove it
            if os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except:
                    pass
            
            engine.save_to_file(text, temp_wav)
            engine.runAndWait()
            
            # Critical: stop and delete engine to release file lock on Windows
            try:
                engine.stop()
            except:
                pass
            del engine
            
            # Wait a moment for Windows to release the file handle
            time.sleep(1)
            
            # Copy to final path
            if os.path.exists(temp_wav):
                import shutil
                # Use a try-except for the move as well
                for i in range(3):
                    try:
                        shutil.move(temp_wav, output_path)
                        break
                    except Exception as e:
                        if i == 2: raise e
                        time.sleep(1)
            
            print(f"  ✅ pyttsx3 succeeded!")
            return output_path
            
        except Exception as e:
            print(f"  ❌ pyttsx3 failed: {str(e)}")
            # Cleanup if possible
            if 'temp_wav' in locals() and os.path.exists(temp_wav):
                try: os.remove(temp_wav)
                except: pass
            return None
    
    def generate_audio_with_fallback(self, text, output_path, preferred_engine='gtts', voice_id='gtts_en'):
        """
        Try multiple TTS engines until one succeeds
        
        Args:
            text: Text to convert to speech
            output_path: Path to save audio file
            preferred_engine: Preferred TTS engine ('edge', 'gtts', 'pyttsx3')
            voice_id: Voice ID string (e.g., 'edge_aria', 'gtts_en', 'pyttsx3_0')
            
        Returns:
            Path to generated audio file or None
        """
        import re
        
        # Strip metadata from scene script if present
        spoken_text = text
        if "TEXT:" in text:
            # Extract text enclosed in quotes after TEXT:
            match = re.search(r'TEXT:\s*"([^"]+)"', text)
            if match:
                spoken_text = match.group(1).strip()
            else:
                # Fallback if no quotes used
                match = re.search(r'TEXT:\s*(.*?)(?=\n[A-Z]+:|\Z)', text, re.DOTALL)
                if match:
                    spoken_text = match.group(1).strip()
        
        print(f"\n🔊 Generating audio with fallback system...")
        print(f"   Voice ID: {voice_id}")
        print(f"   Preferred engine: {preferred_engine}")
        
        # Extract numeric ID for pyttsx3 if voice_id is a string
        numeric_voice_id = 0
        if isinstance(voice_id, str) and 'pyttsx3_' in voice_id:
            try:
                numeric_voice_id = int(voice_id.split('_')[1])
            except:
                numeric_voice_id = 0
        elif isinstance(voice_id, (int, float)):
            numeric_voice_id = int(voice_id)
        
        # Validate text
        if not spoken_text or len(spoken_text.strip()) < 2:
            print(f"❌ Invalid text: too short or empty")
            return None
        
        # Try preferred engine first
        engines_to_try = [preferred_engine]
        
        # Add other engines as fallbacks
        for engine in ['elevenlabs', 'edge', 'gtts', 'pyttsx3']:
            if engine not in engines_to_try:
                engines_to_try.append(engine)
        
        # Try each engine
        for engine in engines_to_try:
            print(f"\n  Trying {engine.upper()}...")
            
            if engine == 'elevenlabs':
                result = self.generate_audio_elevenlabs(spoken_text, output_path, voice_id)
            elif engine == 'edge':
                result = self.generate_audio_edge(spoken_text, output_path, voice_id)
            elif engine == 'gtts':
                result = self.generate_audio_gtts(spoken_text, output_path)
            elif engine == 'pyttsx3':
                result = self.generate_audio_pyttsx3(spoken_text, output_path, numeric_voice_id)
            else:
                continue
            
            if result and os.path.exists(result):
                print(f"\n✅ Audio generated successfully with {engine.upper()}!")
                return result
        
        # All engines failed
        print(f"\n❌ All TTS engines failed!")
        print(f"   Install Edge TTS for best results: pip install edge-tts")
        return None
    
    def normalize_audio(self, audio_path):
        """
        Normalize audio volume
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Path to normalized audio file
        """
        try:
            print(f"  🔊 Normalizing audio...")
            audio = AudioSegment.from_wav(audio_path)
            normalized = normalize(audio)
            
            # Save normalized version
            normalized_path = audio_path.replace('.wav', '_normalized.wav')
            normalized.export(normalized_path, format='wav')
            
            # Replace original
            os.remove(audio_path)
            os.rename(normalized_path, audio_path)
            
            print(f"  ✅ Audio normalized!")
            return audio_path
            
        except Exception as e:
            print(f"  ⚠️ Audio normalization failed: {e}")
            return audio_path
            
    def generate_audio_elevenlabs(self, text, output_path, voice_id='elevenlabs_rachel'):
        """
        Generate premium highly realistic audio using ElevenLabs (V2 SDK)
        """
        try:
            from elevenlabs.client import ElevenLabs
            
            print(f"  🎙️ Connecting to ElevenLabs API...")
            api_key = os.getenv("ELEVENLABS_API_KEY")
            client = ElevenLabs(api_key=api_key)
            
            voice_map = {
                'elevenlabs_rachel': '21m00Tcm4TlvDq8ikWAM',
                'elevenlabs_drew': '29vD33N1CtxCmqQRPOHJ',
                'elevenlabs_clyde': '2EiwWnXFnvU5JabPnv8n',
                'elevenlabs_mim': 'EXAVITQu4vr4xnSDxMaL'
            }
            
            # Use mapped ID or raw clone ID
            actual_voice_id = voice_map.get(voice_id, voice_id if voice_id else '21m00Tcm4TlvDq8ikWAM')
            
            print(f"  📝 Synthesizing with voice: {actual_voice_id}")
            audio_generator = client.text_to_speech.convert(
                text=text,
                voice_id=actual_voice_id,
                model_id="eleven_multilingual_v2"
            )
            
            print(f"  💾 Saving audio stream...")
            with open(output_path, "wb") as f:
                for chunk in audio_generator:
                    if chunk:
                        f.write(chunk)
            
            print(f"  ✅ ElevenLabs generation succeeded!")
            return output_path
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"  ❌ ElevenLabs failed: {str(e)}")
            return None

    def extract_voice_profile(self, audio_path):
        """
        Extract voice characteristics from an uploaded audio file (Instant Voice Cloning)
        """
        # Note: Following USER's strict SDK instructions
        from elevenlabs.client import ElevenLabs
        api_key = os.getenv("ELEVENLABS_API_KEY")
        
        if not api_key:
            raise ValueError("ElevenLabs API key is missing. Extraction aborted.")
            
        client = ElevenLabs(api_key=api_key)
        
        # User Rule: If 'add' is missing on voices, it's a critical SDK error OR we use the correct method
        if not hasattr(client.voices, 'add') and not hasattr(client.voices, 'ivc'):
            raise RuntimeError("Incorrect ElevenLabs SDK usage. Voice cloning method is invalid.")

        clone_name = f"EduFace_Clone_{int(time.time())}"
        
        # Using the CORRECT SDK method discovered in investigation: client.voices.ivc.create
        with open(audio_path, "rb") as f:
            voice_response = client.voices.ivc.create(
                name=clone_name,
                description="Extracted voice profile for Eduface strict pipeline",
                files=[f]
            )
        
        return voice_response.voice_id
    
    def list_voices(self):
        """
        Get list of available voices
        
        Returns:
            List of voice options with metadata
        """
        voices = []
        
        # ElevenLabs Premium Voices
        try:
            import elevenlabs
            voices.extend([
                {
                    'id': 'elevenlabs_rachel',
                    'name': 'Rachel (Female, US, ElevenLabs Premium)',
                    'engine': 'elevenlabs',
                    'language': 'en-US',
                    'gender': 'Female'
                },
                {
                    'id': 'elevenlabs_drew',
                    'name': 'Drew (Male, US, ElevenLabs Premium)',
                    'engine': 'elevenlabs',
                    'language': 'en-US',
                    'gender': 'Male'
                },
                {
                    'id': 'elevenlabs_clyde',
                    'name': 'Clyde (Male, US, ElevenLabs Premium)',
                    'engine': 'elevenlabs',
                    'language': 'en-US',
                    'gender': 'Male'
                },
                {
                    'id': 'elevenlabs_mim',
                    'name': 'Mim (Female, UK, ElevenLabs Premium)',
                    'engine': 'elevenlabs',
                    'language': 'en-UK',
                    'gender': 'Female'
                }
            ])
        except ImportError:
            print("  ℹ️ ElevenLabs not available (import failed)")

        # Edge TTS voices (best quality)
        try:
            import edge_tts
            voices.extend([
                {
                    'id': 'edge_aria',
                    'name': 'Aria (Female, US)',
                    'engine': 'edge',
                    'language': 'en-US',
                    'gender': 'Female'
                },
                {
                    'id': 'edge_guy',
                    'name': 'Guy (Male, US)',
                    'engine': 'edge',
                    'language': 'en-US',
                    'gender': 'Male'
                },
                {
                    'id': 'edge_jenny',
                    'name': 'Jenny (Female, US)',
                    'engine': 'edge',
                    'language': 'en-US',
                    'gender': 'Female'
                },
                {
                    'id': 'edge_steffan',
                    'name': 'Steffan (Male, US)',
                    'engine': 'edge',
                    'language': 'en-US',
                    'gender': 'Male'
                }
            ])
        except ImportError:
            print("  ℹ️ Edge TTS not available")
        
        # gTTS voices
        voices.append({
            'id': 'gtts_en',
            'name': 'Google TTS (English)',
            'engine': 'gtts',
            'language': 'en',
            'gender': 'Female'
        })
        
        # pyttsx3 system voices
        try:
            import pyttsx3
            engine = pyttsx3.init()
            system_voices = engine.getProperty('voices')
            for i, voice in enumerate(system_voices[:3]):  # Limit to 3
                # Try to determine gender from voice name
                voice_name = voice.name.lower()
                gender = 'Female' if any(x in voice_name for x in ['female', 'zira', 'hazel']) else 'Male'
                
                voices.append({
                    'id': f'pyttsx3_{i}',
                    'name': f'System Voice {i+1}',
                    'engine': 'pyttsx3',
                    'language': 'en',
                    'gender': gender
                })
        except Exception as e:
            print(f"  ℹ️ pyttsx3 voices not available: {e}")
        
        return voices if voices else [{
            'id': 'gtts_en',
            'name': 'Google TTS (English)',
            'engine': 'gtts',
            'language': 'en',
            'gender': 'Female'
        }]