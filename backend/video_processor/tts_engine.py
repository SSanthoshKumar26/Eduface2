import os
import time
from gtts import gTTS
from pydub import AudioSegment
from pydub.effects import normalize

class TTSEngine:
    def __init__(self):
        self.supported_engines = ['edge', 'gtts', 'pyttsx3']
    
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
                temp_mp3 = output_path.replace('.wav', '_temp.mp3')
                tts.save(temp_mp3)
                
                # Convert MP3 to WAV
                print(f"  🔄 Converting to WAV format...")
                audio = AudioSegment.from_mp3(temp_mp3)
                audio.export(output_path, format='wav')
                
                # Clean up temp file
                if os.path.exists(temp_mp3):
                    os.remove(temp_mp3)
                
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
                temp_mp3 = output_path.replace('.wav', '_edge.mp3')
                await communicate.save(temp_mp3)
                
                # Convert to WAV
                audio = AudioSegment.from_mp3(temp_mp3)
                audio.export(output_path, format='wav')
                
                # Clean up
                if os.path.exists(temp_mp3):
                    os.remove(temp_mp3)
            
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
            temp_wav = output_path.replace('.wav', '_pyttsx3.wav')
            engine.save_to_file(text, temp_wav)
            engine.runAndWait()
            
            # Copy to final path
            if os.path.exists(temp_wav):
                import shutil
                shutil.move(temp_wav, output_path)
            
            print(f"  ✅ pyttsx3 succeeded!")
            return output_path
            
        except Exception as e:
            print(f"  ❌ pyttsx3 failed: {str(e)}")
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
        if not text or len(text.strip()) < 5:
            print(f"❌ Invalid text: too short or empty")
            return None
        
        # Try preferred engine first
        engines_to_try = [preferred_engine]
        
        # Add other engines as fallbacks
        for engine in ['edge', 'gtts', 'pyttsx3']:
            if engine not in engines_to_try:
                engines_to_try.append(engine)
        
        # Try each engine
        for engine in engines_to_try:
            print(f"\n  Trying {engine.upper()}...")
            
            if engine == 'edge':
                result = self.generate_audio_edge(text, output_path, voice_id)
            elif engine == 'gtts':
                result = self.generate_audio_gtts(text, output_path)
            elif engine == 'pyttsx3':
                result = self.generate_audio_pyttsx3(text, output_path, numeric_voice_id)
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
    
    def list_voices(self):
        """
        Get list of available voices
        
        Returns:
            List of voice options with metadata
        """
        voices = []
        
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