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
        
        # CRITICAL FIX: Add proper gaps and stoppages to headings and bullet points 
        # so they don't continuously overflow into one giant spoken sentence.
        # If a line doesn't end in punctuation, append a pause marker (...)
        text = re.sub(r'(?<![.,?!;:])\s*\n', '... \n', text)
        text = text.replace('\n', ' ')
        
        # Handle common symbols
        text = text.replace('&', ' and ').replace('+', ' plus ').replace('@', ' at ')
        text = text.replace('_', ' ').replace('{', ' ').replace('}', ' ')
        text = text.replace('[', ' ').replace(']', ' ').replace('*', ' ')
        # Remove any weird standalone punctuation. Hyphen MUST be at the end of the regex class.
        text = re.sub(r'[^\w\s.,?!;:\'"-]', ' ', text)
        # Collapse multiple spaces
        return re.sub(r'\s+', ' ', text).strip()

    def generate_summary(self, slides_data):
        """Generates a brief 2-3 sentence summary of the lesson."""
        import os
        import requests
        
        OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        AI_MODEL = os.getenv("OLLAMA_MODEL", "tinyllama")
        
        # Extract all content
        full_content = " ".join([str(s.get('content', '')) + " " + str(s.get('notes', '')) for s in slides_data])
        if len(full_content) < 50:
            full_content = " ".join([str(s.get('title', '')) for s in slides_data])
            
        prompt = f"""Summarize the following lesson content into exactly 2-3 engaging, professional sentences. 
Do NOT use bullet points. Do NOT use introductory phrases like "This lesson is about". 
Just provide the summary text directly. Ensure it ends with a period.

Content: 
{full_content[:2000]}
"""
        
        try:
            payload = {
                "model": AI_MODEL,
                "prompt": prompt,
                "stream": False,
                "temperature": 0.5
            }
            response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=60)
            if response.status_code == 200:
                summary = response.json().get('response', '').strip()
                if summary:
                    return summary.strip('"').strip("'")
        except Exception as e:
            print(f"Summary generation failed: {e}")
            
        # Fallback summary
        topics = [s.get('title', '') for s in slides_data if s.get('title')]
        topics_str = ", ".join(topics[:3])
        return f"This comprehensive lesson covers {topics_str if topics_str else 'the uploaded presentation'}. Learn the essential concepts and practical applications through this professional AI-led presentation."

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
                
            # Create Scene Script via Conversational teaching LLM Prompt
            sys_prompt = f"""You are a professional teacher creating spoken lecture audio.

This output will be converted into audio using a TTS system.
So it MUST sound natural, expressive, and human-like.

---

STRICT RULES (MANDATORY):

1. DO NOT repeat the same opening phrases (like "Alright") frequently
2. Use VARIED and PROFESSIONAL openings such as:
   - "Hello everyone..."
   - "Let’s begin with this concept..."
   - "Now, let’s take a closer look..."
   - "Let’s understand this carefully..."
   - "Here’s something important..."

3. DO NOT read the slide content directly
4. You MUST explain in your own words
5. You MUST expand beyond the slide
6. Add at least ONE real-world example
7. Add teaching emphasis phrases like:
   - "This is important..."
   - "Focus on this part..."
   - "Try to visualize this..."
   - "Think about it this way..."

---

SPEECH FORMATTING RULES (VERY IMPORTANT):

1. Each sentence MUST be on a NEW LINE
2. Each line must be SHORT (5–10 words MAX)
3. Add "..." at the end of most lines
4. Add EMPTY LINE between sentences (VERY IMPORTANT)
5. This empty line creates a natural pause in speech
6. Avoid long paragraphs completely

---

STRUCTURE:

- Start with a professional greeting (ONLY ONCE)
- Introduce the concept
- Explain step by step
- Add example
- Reinforce key idea
- Smooth ending

---

BAD OUTPUT (DO NOT DO):
- Long paragraph
- Repetitive phrases
- Direct reading

---

GOOD OUTPUT STYLE (STRICTLY FOLLOW):

Hello everyone...

Let’s understand this concept carefully...

This idea is very important...

Now focus on this part...



Think about it this way...

Imagine a real-world situation...



This makes the concept much clearer...

---

Slide Content:
{clean_content}

---

OUTPUT FORMAT (STRICT):
[SCENE START]
TEXT: "
[Insert ONLY the teaching narration in this format]
"
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
- duration: [X]s (approx 1 second per 15 characters of text)
"""
            
            # Failsafe default script with varied natural openings
            openings = [
                "Hello everyone...\nToday we will be discussing this topic...\n\n",
                "Moving on to our next point...\nLet's break this down...\n\n",
                "Now, pay attention to this part...\nIt's quite important...\n\n",
                "Let's look at another aspect of this...\n\n",
                "To continue with our discussion...\n\n"
            ]
            opening = openings[i % len(openings)] if i > 0 else openings[0]
            
            formatted_failsafe = self.add_conversational_style(clean_content, slang_level).replace('. ', '...\n\n')
            slide_script = f"""[SCENE START]
TEXT: "
{opening}
{formatted_failsafe}
"
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
                print(f"  [AI] Generating Director Script for Slide {i+1} via Ollama...")
                payload = {
                    "model": AI_MODEL,
                    "prompt": sys_prompt,
                    "stream": False,
                    "temperature": 0.7
                }
                response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=120)
                if response.status_code == 200:
                    generated = response.json().get('response', '').strip()
                    if "[SCENE START]" in generated and "TEXT:" in generated:
                        slide_script = generated
            except Exception as e:
                print(f"  [WARNING] LLM Script generation failed, using fallback: {e}")

            scripts.append(slide_script)

        return scripts