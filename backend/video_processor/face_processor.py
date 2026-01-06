import cv2
import numpy as np
from PIL import Image
import os

class FaceProcessor:
    def __init__(self):
        # Load face detection cascade
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
    
    def validate_image(self, image_path):
        """Validate that image contains a detectable face"""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return False, "Could not read image file"
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) == 0:
                return False, "No face detected in image. Please use a clear frontal face photo."
            elif len(faces) > 1:
                return False, "Multiple faces detected. Please use an image with a single face."
            
            return True, "Face detected successfully"
        except Exception as e:
            return False, f"Error processing image: {str(e)}"
    
    def preprocess_face(self, image_path, output_path, target_size=(512, 512)):
        """Preprocess face image for avatar generation"""
        try:
            # Open image
            img = Image.open(image_path)
            
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Get original dimensions
            width, height = img.size
            
            # Crop to square (centered)
            if width != height:
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                right = left + size
                bottom = top + size
                img = img.crop((left, top, right, bottom))
            
            # Resize to target size
            img = img.resize(target_size, Image.LANCZOS)
            
            # Save
            img.save(output_path, quality=95, optimize=True)
            
            return output_path
        except Exception as e:
            print(f"Face preprocessing error: {e}")
            return None