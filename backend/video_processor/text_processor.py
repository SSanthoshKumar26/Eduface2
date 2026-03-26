import re

class TextProcessor:
    def __init__(self):
        # Conversational replacements
        self.formal_to_casual = {
            'presentation': 'talk',
            'demonstrate': 'show',
            'utilize': 'use',
            'implement': 'create',
            'furthermore': 'also',
            'therefore': 'so',
            'however': 'but',
            'nevertheless': 'still',
            'consequently': 'as a result',
        }
        
        # Filler words for natural speech
        self.fillers = ['you know', 'like', 'basically', 'actually']
    
    def add_conversational_style(self, text, slang_level='medium'):
        """Convert formal text to conversational style"""
        if slang_level == 'none':
            return text
        
        # Apply replacements
        for formal, casual in self.formal_to_casual.items():
            pattern = r'\b' + formal + r'\b'
            text = re.sub(pattern, casual, text, flags=re.IGNORECASE)
        
        # Add natural pauses
        text = text.replace('. ', '... ')
        
        # Add occasional filler words if high slang
        if slang_level == 'high':
            sentences_list = text.split('... ')
            result_sentences = []
            for i, sentence in enumerate(sentences_list):
                words = sentence.split()
                if len(words) > 12 and i % 3 == 0:
                    insert_pos = len(words) // 2
                    words.insert(insert_pos, 'you know')
                    result_sentences.append(' '.join(words))
                else:
                    result_sentences.append(sentence)
            text = '... '.join(result_sentences)
        
        return text
    
    def format_for_speech(self, slides_data, slang_level='medium'):
        """Convert slides to speech-ready script"""
        script_parts = []
        
        for i, slide in enumerate(slides_data):
            # Introduction for first slide
            if i == 0:
                intro = f"Hey everyone! Welcome to our presentation. "
                script_parts.append(intro)
            
            # Use speaker notes if available, otherwise use slide content
            content = slide['notes'] if slide['notes'] else slide['content']
            
            # Skip empty slides
            if not content or len(content.strip()) < 10:
                continue
            
            # Add slide transition
            if i > 0:
                transition = f"Moving on to our next point. "
                script_parts.append(transition)
            
            # Process content
            processed = self.add_conversational_style(content, slang_level)
            script_parts.append(processed)
            
            # Add pause between slides
            script_parts.append(" ... ")
        
        # Conclusion
        script_parts.append("And that wraps up our presentation. Thanks for watching!")
        
        full_script = ' '.join(script_parts)
        
        # Clean up multiple spaces and pauses
        full_script = re.sub(r'\s+', ' ', full_script)
        full_script = re.sub(r'\.{3,}', '...', full_script)
        
        return full_script.strip()

    def _clean_for_speech(self, text):
        """Cleans text so text-to-speech doesn't fail on code or weird symbols."""
        if not text: return ""
        # Remove URLs
        text = re.sub(r'http[s]?://\S+', '', text)
        # Handle common symbols
        text = text.replace('&', ' and ').replace('+', ' plus ').replace('@', ' at ')
        text = text.replace('_', ' ').replace('{', ' ').replace('}', ' ')
        text = text.replace('[', ' ').replace(']', ' ').replace('*', ' ')
        # Remove any weird standalone punctuation. Hyphen MUST be at the end of the regex class.
        text = re.sub(r'[^\w\s.,?!;:\'"-]', ' ', text)
        # Collapse multiple spaces
        return re.sub(r'\s+', ' ', text).strip()

    def format_for_speech_per_slide(self, slides_data, slang_level='medium'):
        """
        Returns a list of narration strings — one per slide.
        Each string is the spoken script for that slide only.
        """
        import os
        import requests
        
        OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        AI_MODEL = os.getenv("OLLAMA_MODEL", "tinyllama")
        
        scripts = []
        total = len(slides_data)
        for i, slide in enumerate(slides_data):
            
            content = slide.get('notes') or slide.get('content', '')
            content = content.strip()
            
            clean_content = self._clean_for_speech(content)
            if len(clean_content) < 10:
                title = slide.get('title', f"Slide {i+1}")
                clean_title = self._clean_for_speech(title)
                clean_content = f"This slide covers {clean_title}."
                
            # Create Scene Script via LLM Prompt
            sys_prompt = f"""Your job is to generate an AI presenter script.
1. Spoken dialogue (natural teaching voice)
2. Facial expressions (eyes, eyebrows, blinking, gaze)
3. Head movement
4. Hand gestures
5. Body posture shifts
6. Timing cues

STYLE: Friendly, confident, slightly energetic teacher. Speak like explaining to a real student.

OUTPUT FORMAT (STRICT):
[SCENE START]
TEXT: "[Insert spoken text here]"
FACE:
- [face action]
EYES:
- [eye action]
HEAD:
- [head action]
HANDS:
- [hand action]
BODY:
- [body action]
TIMING:
- duration: [X]s

Content to teach:
{clean_content}
"""
            
            # Failsafe default script
            slide_script = f"""[SCENE START]
TEXT: "{self.add_conversational_style(clean_content, slang_level)}"
FACE:
- slight smile
- attentive
EYES:
- look straight at viewer
HEAD:
- small nod
HANDS:
- subtle gestures
BODY:
- upright posture
TIMING:
- duration: {len(clean_content)//15}s"""
            
            try:
                # Try to use Ollama API to generate
                print(f"  🤖 Generating Director Script for Slide {i+1} via Ollama...")
                payload = {
                    "model": AI_MODEL,
                    "prompt": sys_prompt,
                    "stream": False,
                    "temperature": 0.7
                }
                response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=20)
                if response.status_code == 200:
                    generated = response.json().get('response', '').strip()
                    if "[SCENE START]" in generated and "TEXT:" in generated:
                        slide_script = generated
            except Exception as e:
                print(f"  ⚠️ LLM Script generation failed, using fallback: {e}")

            scripts.append(slide_script)

        return scripts