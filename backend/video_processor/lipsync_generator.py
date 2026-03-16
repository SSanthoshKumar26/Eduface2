import subprocess
import os
import sys
from pathlib import Path  # ✅ Added this import

class LipSyncGenerator:
    def __init__(self, wav2lip_path=None):
        """
        Initialize Wav2Lip generator
        wav2lip_path: Path to Wav2Lip installation
        """
        if wav2lip_path is None:
            # Auto-detect: look relative to this file's backend directory
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.wav2lip_path = os.path.join(backend_dir, 'Wav2Lip')
        else:
            self.wav2lip_path = wav2lip_path
        
        # FIXED: Use os.path.join for Windows compatibility
        self.checkpoint_path = os.path.join(self.wav2lip_path, 'checkpoints', 'wav2lip_gan.pth')

    def check_installation(self):
        """Check if Wav2Lip is properly installed"""
        if not os.path.exists(self.wav2lip_path):
            return False, f"Wav2Lip directory not found at: {self.wav2lip_path}"
        
        if not os.path.exists(self.checkpoint_path):
            return False, f"Wav2Lip checkpoint file not found at: {self.checkpoint_path}"
        
        return True, "Wav2Lip is properly installed"

    def generate_video(self, face_path, audio_path, output_path, 
                      fps=25, resize_factor=1, quality='high'):
        """
        Generate lip-synced video
        """
        
        # Check installation
        is_installed, message = self.check_installation()
        if not is_installed:
            return None, message

        # Convert paths to ABSOLUTE paths
        def make_abs(p):
            p_obj = Path(p)
            if p_obj.is_absolute():
                return p_obj.resolve()
            # If relative, assume it's relative to the backend workspace root
            backend_dir = Path(__file__).parent.parent.resolve()
            return (backend_dir / p).resolve()

        face_abs = make_abs(face_path)
        audio_abs = make_abs(audio_path)
        output_abs = make_abs(output_path)
        
        # FIXED: Verify files exist BEFORE calling Wav2Lip
        if not face_abs.exists():
            return None, f"Face image not found: {face_abs}"
        if not audio_abs.exists():
            return None, f"Audio file not found: {audio_abs}"
        
        # FIXED: Create output directory
        output_abs.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"✅ Using absolute paths:")
        print(f"   Face: {face_abs}")
        print(f"   Audio: {audio_abs}")
        print(f"   Output: {output_abs}")
        
        # Inference script path
        inference_script = os.path.join(self.wav2lip_path, 'inference.py')
        
        # Build command - use ABSOLUTE paths
        command = [
            sys.executable,
            inference_script,
            '--checkpoint_path', self.checkpoint_path,
            '--face', str(face_abs),        # ABSOLUTE
            '--audio', str(audio_abs),      # ABSOLUTE
            '--outfile', str(output_abs),   # ABSOLUTE
            '--fps', str(fps),
            '--resize_factor', str(resize_factor),
        ]
        
        # Add quality settings
        if quality == 'high':
            command.extend(['--pads', '0', '20', '0', '0'])
            command.append('--nosmooth')
        elif quality == 'medium':
            command.extend(['--pads', '0', '10', '0', '0'])
        else:  # low quality / fast
            command.extend(['--pads', '0', '5', '0', '0'])
        
        print(f"\n🎬 Running: {' '.join(command)}")
        
        try:
            # Run inference
            result = subprocess.run(
                command,
                cwd=self.wav2lip_path,          # Already correct
                capture_output=True,
                text=True,
                timeout=1800  # 30-minute timeout for long videos
            )
            
            if result.returncode == 0:
                if os.path.exists(output_abs):
                    print(f"✅ Video generated: {output_abs}")
                    return str(output_abs), "Video generated successfully"
                else:
                    return None, "Video generation completed but output file not found"
            else:
                error_msg = result.stderr if result.stderr else result.stdout
                print(f"❌ Wav2Lip error: {error_msg}")
                return None, f"Wav2Lip error: {error_msg}"
        
        except subprocess.TimeoutExpired:
            return None, "Video generation timed out (exceeded 10 minutes)"
        except Exception as e:
            return None, f"Error during video generation: {str(e)}"
