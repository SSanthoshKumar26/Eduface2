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
        Generate lip-synced video with automatic retries for robustness
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
            backend_dir = Path(__file__).parent.parent.resolve()
            return (backend_dir / p).resolve()

        face_abs = make_abs(face_path)
        audio_abs = make_abs(audio_path)
        output_abs = make_abs(output_path)
        
        if not face_abs.exists():
            return None, f"Face image not found: {face_abs}"
        if not audio_abs.exists():
            return None, f"Audio file not found: {audio_abs}"
        
        output_abs.parent.mkdir(parents=True, exist_ok=True)
        
        inference_script = os.path.join(self.wav2lip_path, 'inference.py')
        
        command = [
            sys.executable,
            inference_script,
            '--checkpoint_path', self.checkpoint_path,
            '--face', str(face_abs),
            '--audio', str(audio_abs),
            '--outfile', str(output_abs),
            '--fps', str(fps),
            '--resize_factor', str(resize_factor),
        ]
        
        if quality == 'high':
            command.extend(['--pads', '0', '20', '0', '0', '--nosmooth'])
        elif quality == 'medium':
            command.extend(['--pads', '0', '10', '0', '0'])
        else:
            command.extend(['--pads', '0', '5', '0', '0'])
        
        # RETRY LOGIC for LipSync Stability (with Adaptive Resizing & Batch Reduction)
        max_attempts = 4
        current_resize = int(resize_factor) 
        current_batch = 128 # Default starting batch size
        last_error = ""
        
        for attempt in range(max_attempts):
            try:
                # Update command with dynamic resize and batching
                cmd_to_run = list(command)
                
                # Check for existing resize_factor and update it
                found_resize = False
                for idx_c, val_c in enumerate(cmd_to_run):
                    if val_c == '--resize_factor' and idx_c + 1 < len(cmd_to_run):
                        cmd_to_run[idx_c + 1] = str(current_resize)
                        found_resize = True
                        break
                if not found_resize:
                    cmd_to_run.extend(['--resize_factor', str(current_resize)])
                
                # Add batch size controls
                cmd_to_run.extend(['--wav2lip_batch_size', str(current_batch)])
                cmd_to_run.extend(['--face_det_batch_size', str(max(1, current_batch // 4))])
                
                print(f"🎬 [Attempt {attempt+1}/{max_attempts}] Running Lipsync: {output_abs.name} (Resize: {current_resize}, Batch: {current_batch})")
                
                # Use subprocess.run with stream output so user sees progress bars
                result = subprocess.run(
                    cmd_to_run,
                    cwd=self.wav2lip_path,
                    stdout=None, # Stream to parent console
                    stderr=subprocess.PIPE, # Only capture errors
                    text=True,
                    timeout=1800
                )
                
                if result.returncode == 0 and os.path.exists(output_abs):
                    print(f"✅ Video generated successfully on attempt {attempt+1}")
                    return str(output_abs), "Video generated successfully"
                
                last_error = result.stderr if result.stderr else "Inference process failed without specific stderr"
                print(f"   ⚠️ Attempt {attempt+1} failed ({result.returncode}): {last_error[:200]}...")
                
                # ADAPTIVE RECOVERY
                if attempt == 0:
                    current_resize = 2 
                    current_batch = 64
                    print(f"   ♻️ Adaptive Recovery Mode 1: Resizing to 2, Batch to 64...")
                elif attempt == 1:
                    current_resize = 4 
                    current_batch = 32
                    print(f"   ♻️ Adaptive Recovery Mode 2: Resizing to 4, Batch to 32...")
                elif attempt == 2:
                    current_resize = 4 
                    current_batch = 8 # Ultra-low batch for final desperate attempt
                    print(f"   ♻️ Adaptive Recovery Mode 3: Resizing to 4, Batch to 8 (ULTRA STABLE)...")
                elif attempt == 3:
                     # FINAL ATTEMPT: Fallback to CPU to bypass GPU crashes
                    current_resize = 4
                    current_batch = 1
                    # We need a way to tell inference.py to use CPU
                    # Added a custom flag logic here (though we'd need to modify inference.py)
                    # For now, let's try to set an env var that helps torch
                    os.environ["CUDA_VISIBLE_DEVICES"] = "-1" 
                    print(f"   ♻️ Adaptive Recovery Mode 4: FORCING CPU (Safe Mode)...")
                
                import time
                time.sleep(2)
                
            except subprocess.TimeoutExpired:
                print(f"   ⚠️ Attempt {attempt+1} timed out.")
                last_error = "Timeout expired"
            except Exception as e:
                print(f"   ⚠️ Attempt {attempt+1} encountered error: {str(e)}")
                last_error = str(e)
            finally:
                # Reset environment variable if we set it
                if "CUDA_VISIBLE_DEVICES" in os.environ:
                    del os.environ["CUDA_VISIBLE_DEVICES"]
                
        return None, f"Wav2Lip failed after {max_attempts} attempts. Last error: {last_error}"

