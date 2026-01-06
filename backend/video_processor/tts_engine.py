from gtts import gTTS
import pyttsx3
import os
from pydub import AudioSegment

class TTSEngine:
    def __init__(self):
        self.engine = pyttsx3.init()
        self.available_voices = self._get_voices()
    
    def _get_voices(self):
        """Get available system voices"""
        voices = self.engine.getProperty('voices')
        voice_list = []
        
        for i, voice in enumerate(voices):
            voice_info = {
                'id': i,
                'name': voice.name,
                'gender': 'Male' if 'male' in voice.name.lower() or 'david' in voice.name.lower() else 'Female',
                'system_id': voice.id
            }
            voice_list.append(voice_info)
        
        return voice_list
    
    def list_voices(self):
        """Return available voices for frontend"""
        return self.available_voices
    
    def generate_audio_gtts(self, text, output_file, lang='en', slow=False):
        """Generate audio using Google TTS (online, better quality)"""
        try:
            tts = gTTS(text=text, lang=lang, slow=slow)
            tts.save(output_file)
            return output_file
        except Exception as e:
            print(f"gTTS error: {e}")
            return None
    
    def generate_audio_pyttsx3(self, text, output_file, voice_id=0, rate=150):
        """Generate audio using pyttsx3 (offline)"""
        try:
            if voice_id < len(self.available_voices):
                self.engine.setProperty('voice', self.available_voices[voice_id]['system_id'])
            
            self.engine.setProperty('rate', rate)
            self.engine.setProperty('volume', 1.0)
            
            self.engine.save_to_file(text, output_file)
            self.engine.runAndWait()
            
            return output_file
        except Exception as e:
            print(f"pyttsx3 error: {e}")
            return None
    
    def normalize_audio(self, input_file, output_file=None):
        """Normalize audio for better lip-sync"""
        if output_file is None:
            output_file = input_file
        
        try:
            audio = AudioSegment.from_file(input_file)
            
            # Normalize to target dBFS
            normalized = audio.normalize()
            
            # Export
            normalized.export(output_file, format='wav')
            return output_file
        except Exception as e:
            print(f"Audio normalization error: {e}")
            return input_file