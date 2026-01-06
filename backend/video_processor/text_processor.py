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
            sentences = text.split('... ')
            for i, sentence in enumerate(sentences):
                if len(sentence.split()) > 12 and i % 3 == 0:
                    words = sentence.split()
                    insert_pos = len(words) // 2
                    words.insert(insert_pos, 'you know')
                    sentences[i] = ' '.join(words)
            text = '... '.join(sentences)
        
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