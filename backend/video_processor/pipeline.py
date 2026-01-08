import os
from .ppt_extractor import PPTExtractor
from .text_processor import TextProcessor
from .tts_engine import TTSEngine
from .face_processor import FaceProcessor
from .lipsync_generator import LipSyncGenerator
from .video_assembler import VideoAssembler

class VideoPipeline:
    def __init__(self, output_dir='uploads/outputs'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize all processors
        self.text_processor = TextProcessor()
        self.tts_engine = TTSEngine()
        self.face_processor = FaceProcessor()
        self.lipsync_generator = LipSyncGenerator()
        self.video_assembler = VideoAssembler()
    
    def process(self, ppt_path, face_path, options=None):
        """
        Main processing pipeline
        
        Args:
            ppt_path: Path to PPT file
            face_path: Path to face image
            options: Dict with processing options
                - voice_id: Voice style ID
                - slang_level: 'none', 'medium', 'high'
                - quality: 'low', 'medium', 'high'
                - tts_engine: 'gtts', 'edge', or 'pyttsx3'
        
        Returns:
            Dict with status and output paths
        """
        
        if options is None:
            options = {}
        
        # Extract options with better defaults
        voice_id = options.get('voice_id', 0)
        slang_level = options.get('slang_level', 'medium')
        quality = options.get('quality', 'medium')
        tts_engine = options.get('tts_engine', 'edge')  # Changed default to edge
        
        # Create unique output directory for this job
        job_id = os.path.basename(ppt_path).split('.')[0]
        job_dir = os.path.join(self.output_dir, job_id)
        os.makedirs(job_dir, exist_ok=True)
        
        results = {
            'status': 'processing',
            'steps': {},
            'job_dir': job_dir
        }
        
        try:
            # Step 1: Extract PPT content
            print("Step 1: Extracting PPT content...")
            extractor = PPTExtractor(ppt_path)
            slides_data = extractor.extract_text()
            
            if not slides_data:
                results['status'] = 'error'
                results['error'] = 'No content extracted from PPT'
                return results
            
            results['steps']['extraction'] = 'completed'
            print(f"  ✅ Extracted {len(slides_data)} slides")
            
            # Step 2: Generate script
            print("\nStep 2: Generating speech script...")
            script = self.text_processor.format_for_speech(slides_data, slang_level)
            
            if not script or len(script.strip()) < 10:
                results['status'] = 'error'
                results['error'] = 'Generated script is too short or empty'
                return results
            
            # Save script for reference
            script_path = os.path.join(job_dir, 'script.txt')
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write(script)
            
            results['script_path'] = script_path
            results['steps']['script'] = 'completed'
            print(f"  ✅ Script generated ({len(script)} characters)")
            print(f"     Preview: {script[:150]}...")
            
            # Step 3: Validate face image
            print("\nStep 3: Validating face image...")
            is_valid, message = self.face_processor.validate_image(face_path)
            if not is_valid:
                results['status'] = 'error'
                results['error'] = f'Face validation failed: {message}'
                return results
            
            results['steps']['validation'] = 'completed'
            print(f"  ✅ Face image validated")
            
            # Step 4: Preprocess face
            print("\nStep 4: Preprocessing face image...")
            processed_face = os.path.join(job_dir, 'processed_face.jpg')
            processed_face = self.face_processor.preprocess_face(face_path, processed_face)
            
            if not processed_face or not os.path.exists(processed_face):
                results['status'] = 'error'
                results['error'] = 'Face preprocessing failed'
                return results
            
            results['face_path'] = processed_face
            results['steps']['preprocessing'] = 'completed'
            print(f"  ✅ Face preprocessed")
            
            # Step 5: Generate audio with fallback system
            print("\nStep 5: Generating audio narration...")
            audio_path = os.path.join(job_dir, 'narration.wav')
            
            try:
                # Use the new fallback method with voice_id
                audio_file = self.tts_engine.generate_audio_with_fallback(
                    text=script,
                    output_path=audio_path,
                    preferred_engine=tts_engine,
                    voice_id=voice_id  # Pass the voice_id from options
                )
                
                if not audio_file or not os.path.exists(audio_file):
                    results['status'] = 'error'
                    results['error'] = 'Audio generation failed with all TTS engines'
                    results['steps']['audio'] = 'failed'
                    return results
                
                # Normalize audio
                print(f"\n  🔊 Normalizing audio volume...")
                audio_file = self.tts_engine.normalize_audio(audio_file)
                
                results['audio_path'] = audio_file
                results['steps']['audio'] = 'completed'
                print(f"  ✅ Audio generation completed!")
                
            except Exception as audio_error:
                print(f"\n  ❌ Audio generation error: {str(audio_error)}")
                results['status'] = 'error'
                results['error'] = f'Audio generation failed: {str(audio_error)}'
                results['steps']['audio'] = 'failed'
                
                import traceback
                print(f"  Full traceback:\n{traceback.format_exc()}")
                return results
            
            # Step 6: Generate lip-sync video
            print("\nStep 6: Generating lip-synced video...")
            lipsync_video = os.path.join(job_dir, 'lipsync_video.mp4')
            
            try:
                video_path, message = self.lipsync_generator.generate_video(
                    processed_face,
                    audio_file,
                    lipsync_video,
                    quality=quality
                )
                
                if not video_path or not os.path.exists(video_path):
                    results['status'] = 'error'
                    results['error'] = f'Lip-sync generation failed: {message}'
                    results['steps']['lipsync'] = 'failed'
                    return results
                
                results['video_path'] = video_path
                results['steps']['lipsync'] = 'completed'
                print(f"  ✅ Lip-sync video generated")
                
            except Exception as video_error:
                print(f"\n  ❌ Video generation error: {str(video_error)}")
                results['status'] = 'error'
                results['error'] = f'Video generation failed: {str(video_error)}'
                results['steps']['lipsync'] = 'failed'
                return results
            
            # Step 7: Final video assembly (optional enhancements)
            print("\nStep 7: Finalizing video...")
            final_video = os.path.join(job_dir, 'final_video.mp4')
            
            # Add watermark or other enhancements if needed
            # final_video = self.video_assembler.add_watermark(video_path, final_video)
            
            results['final_video'] = video_path  # or final_video if enhanced
            results['status'] = 'completed'
            results['steps']['finalization'] = 'completed'
            
            print(f"\n{'='*60}")
            print(f"✅ VIDEO GENERATION COMPLETED!")
            print(f"{'='*60}")
            print(f"   📁 Job ID: {job_id}")
            print(f"   📄 Script: {script_path}")
            print(f"   🔊 Audio: {audio_file}")
            print(f"   🎥 Video: {results['final_video']}")
            print(f"{'='*60}\n")
            
        except Exception as e:
            results['status'] = 'error'
            results['error'] = str(e)
            print(f"\n❌ Pipeline error: {e}")
            
            import traceback
            print(f"Full traceback:\n{traceback.format_exc()}")
        
        return results
    
    def get_available_voices(self):
        """Get list of available voices from TTS engine"""
        try:
            return self.tts_engine.list_voices()
        except Exception as e:
            print(f"Error getting voices: {e}")
            return [{
                'id': 'gtts_en',
                'name': 'Google TTS (English)',
                'engine': 'gtts',
                'language': 'en'
            }]