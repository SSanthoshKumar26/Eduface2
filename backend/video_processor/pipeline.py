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
                - tts_engine: 'gtts' or 'pyttsx3'
        
        Returns:
            Dict with status and output paths
        """
        
        if options is None:
            options = {}
        
        # Extract options
        voice_id = options.get('voice_id', 0)
        slang_level = options.get('slang_level', 'medium')
        quality = options.get('quality', 'medium')
        tts_engine = options.get('tts_engine', 'gtts')
        
        # Create unique output directory for this job
        job_id = os.path.basename(ppt_path).split('.')[0]
        job_dir = os.path.join(self.output_dir, job_id)
        os.makedirs(job_dir, exist_ok=True)
        
        results = {
            'status': 'processing',
            'steps': {}
        }
        
        try:
            # Step 1: Extract PPT content
            print("Step 1: Extracting PPT content...")
            extractor = PPTExtractor(ppt_path)
            slides_data = extractor.extract_text()
            results['steps']['extraction'] = 'completed'
            
            # Step 2: Generate script
            print("Step 2: Generating speech script...")
            script = self.text_processor.format_for_speech(slides_data, slang_level)
            
            # Save script for reference
            script_path = os.path.join(job_dir, 'script.txt')
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write(script)
            results['script_path'] = script_path
            results['steps']['script'] = 'completed'
            
            # Step 3: Validate face image
            print("Step 3: Validating face image...")
            is_valid, message = self.face_processor.validate_image(face_path)
            if not is_valid:
                results['status'] = 'error'
                results['error'] = message
                return results
            results['steps']['validation'] = 'completed'
            
            # Step 4: Preprocess face
            print("Step 4: Preprocessing face image...")
            processed_face = os.path.join(job_dir, 'processed_face.jpg')
            processed_face = self.face_processor.preprocess_face(face_path, processed_face)
            if not processed_face:
                results['status'] = 'error'
                results['error'] = 'Face preprocessing failed'
                return results
            results['face_path'] = processed_face
            results['steps']['preprocessing'] = 'completed'
            
            # Step 5: Generate audio
            print("Step 5: Generating audio narration...")
            audio_path = os.path.join(job_dir, 'narration.wav')
            
            if tts_engine == 'gtts':
                audio_file = self.tts_engine.generate_audio_gtts(script, audio_path)
            else:
                audio_file = self.tts_engine.generate_audio_pyttsx3(script, audio_path, voice_id)
            
            if not audio_file or not os.path.exists(audio_file):
                results['status'] = 'error'
                results['error'] = 'Audio generation failed'
                return results
            
            # Normalize audio
            audio_file = self.tts_engine.normalize_audio(audio_file)
            results['audio_path'] = audio_file
            results['steps']['audio'] = 'completed'
            
            # Step 6: Generate lip-sync video
            print("Step 6: Generating lip-synced video...")
            lipsync_video = os.path.join(job_dir, 'lipsync_video.mp4')
            
            video_path, message = self.lipsync_generator.generate_video(
                processed_face,
                audio_file,
                lipsync_video,
                quality=quality
            )
            
            if not video_path:
                results['status'] = 'error'
                results['error'] = f'Lip-sync generation failed: {message}'
                return results
            results['video_path'] = video_path
            results['steps']['lipsync'] = 'completed'
            
            # Step 7: Final video assembly (optional enhancements)
            print("Step 7: Finalizing video...")
            final_video = os.path.join(job_dir, 'final_video.mp4')
            
            # Add watermark if needed
            # final_video = self.video_assembler.add_watermark(video_path, final_video)
            
            results['final_video'] = video_path  # or final_video if watermark applied
            results['status'] = 'completed'
            results['steps']['finalization'] = 'completed'
            
            print(f"✓ Video generation completed: {results['final_video']}")
            
        except Exception as e:
            results['status'] = 'error'
            results['error'] = str(e)
            print(f"Error in pipeline: {e}")
        
        return results
    
    def get_available_voices(self):
        """Get list of available voices"""
        return self.tts_engine.list_voices()