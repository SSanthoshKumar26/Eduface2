from pptx import Presentation
import os

class PPTExtractor:
    def __init__(self, ppt_path):
        self.ppt_path = ppt_path
        self.presentation = Presentation(ppt_path)
    
    def extract_text(self):
        """Extract all text content from PPT slides"""
        slides_content = []
        
        for slide_num, slide in enumerate(self.presentation.slides, 1):
            slide_text = []
            
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text = shape.text.strip()
                    if text:
                        slide_text.append(text)
            
            # Extract speaker notes if available
            notes = ""
            if slide.has_notes_slide:
                notes_slide = slide.notes_slide
                if notes_slide.notes_text_frame:
                    notes = notes_slide.notes_text_frame.text
            
            slides_content.append({
                'slide_number': slide_num,
                'title': slide_text[0] if slide_text else f"Slide {slide_num}",
                'content': ' '.join(slide_text),
                'notes': notes.strip()
            })
        
        return slides_content
    
    def get_slide_count(self):
        return len(self.presentation.slides)