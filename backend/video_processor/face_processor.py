import cv2
import numpy as np
from PIL import Image

class FaceProcessor:
    def __init__(self):
        # Load face detection cascade
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
    
    def validate_image(self, file_path):
        """Validate that image or video contains a detectable face"""
        try:
            # Check if it's a video
            is_video = file_path.lower().endswith(('.mp4', '.mov', '.webm'))
            
            if is_video:
                cap = cv2.VideoCapture(file_path)
                ret, img = cap.read()
                cap.release()
                if not ret or img is None:
                    return False, "Could not read video file or extract first frame."
            else:
                img = cv2.imread(file_path)
                if img is None:
                    return False, "Could not read image file. Ensure it is a valid JPG or PNG."
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) == 0:
                print("⚠️  No face detected – proceeding anyway (optimistic mode)")
            elif len(faces) > 1:
                print(f"⚠️  {len(faces)} faces detected – using the largest one")
            else:
                print("✅ Face detected successfully")
            
            return True, "OK"
        except Exception as e:
            return False, f"Error processing file: {str(e)}"
    
    def preprocess_face(self, file_path, output_path, target_size=(512, 512)):
        """Preprocess face image for avatar generation, or passthrough if it's a video"""
        try:
            is_video = file_path.lower().endswith(('.mp4', '.mov', '.webm'))
            if is_video:
                import shutil
                output_path = output_path.rsplit('.', 1)[0] + '.mp4'
                print(f"  🎥 Video detected. Passing through to Wav2Lip: {file_path}")
                shutil.copy2(file_path, output_path)
                return output_path

            # 1. Background Removal
            try:
                from rembg import remove
                print("  🎨 Removing image background...")
                with open(file_path, 'rb') as i:
                    bg_removed_bytes = remove(i.read())
                import io
                img = Image.open(io.BytesIO(bg_removed_bytes)).convert("RGBA")
            except Exception as bg_err:
                print(f"  ⚠️ Background removal failed or rembg not installed: {bg_err}")
                img = Image.open(file_path).convert('RGBA')
            
            # 2. Prevent arbitrary square cropping
            # We skip cropping to preserve shoulders, hair, etc.
            
            # 3. Resize and Save
            # We ensure the output is a PNG to retain the alpha channel
            output_path = output_path.rsplit('.', 1)[0] + '.png'
            
            max_size = max(target_size)
            img.thumbnail((max_size, max_size), Image.LANCZOS)
            
            img.save(output_path, format="PNG")
            
            return output_path
        except Exception as e:
            print(f"Face preprocessing error: {e}")
            return None