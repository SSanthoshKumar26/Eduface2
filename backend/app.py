import os
import io
import re
import requests
import uuid
import json
import time
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import requests
from pptx import Presentation
from pptx.util import Pt, Inches
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_AUTO_SIZE, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image
from io import BytesIO
from werkzeug.utils import secure_filename
from openai import OpenAI
from groq import Groq

# Video generation imports
try:
    from video_processor.pipeline import VideoPipeline
    VIDEO_GENERATION_ENABLED = True
except ImportError:
    VIDEO_GENERATION_ENABLED = False
    print("⚠️  Video generation modules not found. Video features will be disabled.")

load_dotenv()

app = Flask(__name__)
CORS(app)

# ============ CONFIGURATION ============
# AI Model Configuration (Ollama)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
AI_MODEL = os.getenv("OLLAMA_MODEL", "tinyllama")

# Image APIs
UNSPLASH_API_KEY = os.getenv("UNSPLASH_API_KEY", "").strip()
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "").strip()
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY", "").strip()

# File upload configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
ALLOWED_PPT_EXTENSIONS = {'ppt', 'pptx'}
ALLOWED_FACE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'mp4', 'mov', 'webm'}


app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Create upload directories
PPT_UPLOAD_DIR = os.path.join(UPLOAD_FOLDER, 'ppts')
FACE_UPLOAD_DIR = os.path.join(UPLOAD_FOLDER, 'faces')
OUTPUT_DIR = os.path.join(UPLOAD_FOLDER, 'outputs')
SHARED_CHATS_DIR = os.path.join(UPLOAD_FOLDER, 'shared_chats')

os.makedirs(PPT_UPLOAD_DIR, exist_ok=True)
os.makedirs(FACE_UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(SHARED_CHATS_DIR, exist_ok=True)

# Initialize video pipeline if available
video_pipeline = None
if VIDEO_GENERATION_ENABLED:
    try:
        video_pipeline = VideoPipeline(output_dir=OUTPUT_DIR)
        print("✅ Video generation pipeline initialized")
    except Exception as e:
        print(f"⚠️  Could not initialize video pipeline: {e}")
        VIDEO_GENERATION_ENABLED = False

# ============ MODE CONFIGURATIONS ============
MODE_PROMPTS = {
    "Quick Response": {
        "instructions": "Create a concise presentation with key points only. Keep it brief and to the point.",
        "slide_count": 3,
        "max_bullets": 3,
        "font_size_body": 13
    },
    "Creative": {
        "instructions": "Create an engaging and creative presentation with storytelling elements. Use vivid descriptions and make it interesting.",
        "slide_count": 5,
        "max_bullets": 4,
        "font_size_body": 12
    },
    "Detailed": {
        "instructions": "Create a comprehensive presentation with detailed explanations, examples, and in-depth analysis. Cover all aspects thoroughly.",
        "slide_count": 7,
        "max_bullets": 5,
        "font_size_body": 11
    }
}

# ============ THEMES ============
THEMES = {
    "modern_blue": {
        "name": "Modern Blue",
        "colors": {
            "background": (245, 245, 255),
            "title_slide_bg": (19, 71, 130),
            "title": (255, 255, 255),
            "subtitle": (220, 230, 250),
            "slide_title": (19, 71, 130),
            "h2": (30, 90, 150),
            "h3": (70, 120, 170),
            "text": (45, 45, 45),
            "bullet": (60, 60, 60),
            "accent": (19, 71, 130),
            "accent_light": (200, 220, 255),
            "accent_dark": (10, 40, 80)
        },
        "fonts": {"title": "Calibri", "heading": "Calibri", "text": "Calibri"}
    },
    "corporate_gray": {
        "name": "Corporate Gray",
        "colors": {
            "background": (250, 250, 250),
            "title_slide_bg": (70, 70, 70),
            "title": (255, 255, 255),
            "subtitle": (220, 220, 220),
            "slide_title": (50, 50, 50),
            "h2": (80, 80, 80),
            "h3": (120, 120, 120),
            "text": (60, 60, 60),
            "bullet": (70, 70, 70),
            "accent": (150, 150, 150),
            "accent_light": (230, 230, 230),
            "accent_dark": (40, 40, 40)
        },
        "fonts": {"title": "Arial", "heading": "Arial", "text": "Arial"}
    },
    "creative_green": {
        "name": "Creative Green",
        "colors": {
            "background": (235, 245, 235),
            "title_slide_bg": (34, 102, 36),
            "title": (255, 255, 255),
            "subtitle": (200, 230, 200),
            "slide_title": (34, 102, 36),
            "h2": (60, 130, 65),
            "h3": (100, 150, 105),
            "text": (50, 50, 50),
            "bullet": (60, 60, 60),
            "accent": (34, 102, 36),
            "accent_light": (200, 240, 200),
            "accent_dark": (20, 70, 25)
        },
        "fonts": {"title": "Segoe UI", "heading": "Segoe UI", "text": "Segoe UI"}
    },
    "elegant_purple": {
        "name": "Elegant Purple",
        "colors": {
            "background": (240, 235, 250),
            "title_slide_bg": (102, 51, 153),
            "title": (255, 255, 255),
            "subtitle": (220, 200, 240),
            "slide_title": (102, 51, 153),
            "h2": (120, 70, 170),
            "h3": (150, 120, 190),
            "text": (65, 65, 65),
            "bullet": (75, 75, 75),
            "accent": (102, 51, 153),
            "accent_light": (230, 210, 250),
            "accent_dark": (70, 30, 110)
        },
        "fonts": {"title": "Times New Roman", "heading": "Times New Roman", "text": "Times New Roman"}
    },
    "vibrant_orange": {
        "name": "Vibrant Orange",
        "colors": {
            "background": (255, 245, 235),
            "title_slide_bg": (204, 85, 0),
            "title": (255, 255, 255),
            "subtitle": (255, 220, 180),
            "slide_title": (204, 85, 0),
            "h2": (220, 110, 30),
            "h3": (240, 150, 80),
            "text": (60, 40, 20),
            "bullet": (80, 60, 40),
            "accent": (204, 85, 0),
            "accent_light": (255, 220, 180),
            "accent_dark": (150, 60, 0)
        },
        "fonts": {"title": "Helvetica", "heading": "Helvetica", "text": "Helvetica"}
    },
    "minimalist_black": {
        "name": "Minimalist Black",
        "colors": {
            "background": (20, 20, 20),
            "title_slide_bg": (0, 0, 0),
            "title": (255, 255, 255),
            "subtitle": (200, 200, 200),
            "slide_title": (255, 255, 255),
            "h2": (220, 220, 220),
            "h3": (180, 180, 180),
            "text": (180, 180, 180),
            "bullet": (160, 160, 160),
            "accent": (255, 255, 255),
            "accent_light": (60, 60, 60),
            "accent_dark": (100, 100, 100)
        },
        "fonts": {"title": "Arial Black", "heading": "Arial Black", "text": "Arial"}
    },
    "soft_pink": {
        "name": "Soft Pink",
        "colors": {
            "background": (255, 245, 250),
            "title_slide_bg": (180, 20, 100),
            "title": (255, 255, 255),
            "subtitle": (230, 180, 210),
            "slide_title": (180, 20, 100),
            "h2": (200, 60, 140),
            "h3": (220, 100, 170),
            "text": (80, 30, 50),
            "bullet": (90, 40, 60),
            "accent": (180, 20, 100),
            "accent_light": (245, 210, 235),
            "accent_dark": (130, 10, 70)
        },
        "fonts": {"title": "Georgia", "heading": "Georgia", "text": "Georgia"}
    },
    "cool_teal": {
        "name": "Cool Teal",
        "colors": {
            "background": (230, 248, 248),
            "title_slide_bg": (0, 102, 102),
            "title": (255, 255, 255),
            "subtitle": (180, 220, 220),
            "slide_title": (0, 102, 102),
            "h2": (20, 130, 130),
            "h3": (60, 150, 150),
            "text": (40, 70, 70),
            "bullet": (50, 80, 80),
            "accent": (0, 102, 102),
            "accent_light": (200, 240, 240),
            "accent_dark": (0, 70, 70)
        },
        "fonts": {"title": "Verdana", "heading": "Verdana", "text": "Verdana"}
    },
    "warm_brown": {
        "name": "Warm Brown",
        "colors": {
            "background": (250, 242, 232),
            "title_slide_bg": (101, 67, 33),
            "title": (255, 255, 255),
            "subtitle": (220, 190, 160),
            "slide_title": (101, 67, 33),
            "h2": (140, 100, 60),
            "h3": (170, 140, 100),
            "text": (70, 55, 40),
            "bullet": (85, 70, 55),
            "accent": (101, 67, 33),
            "accent_light": (240, 220, 190),
            "accent_dark": (70, 45, 20)
        },
        "fonts": {"title": "Palatino Linotype", "heading": "Palatino Linotype", "text": "Palatino Linotype"}
    },
}

# ============ SLIDE DIMENSIONS ============
SLIDE_WIDTH = 10.0
SLIDE_HEIGHT = 7.5
MARGIN_LEFT = 0.5
MARGIN_RIGHT = 0.5
MARGIN_TOP = 0.4
MARGIN_BOTTOM = 0.5
CONTENT_WIDTH = SLIDE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
TITLE_AREA_HEIGHT = 1.0
CONTENT_AREA_TOP = MARGIN_TOP + TITLE_AREA_HEIGHT + 0.2
AVAILABLE_CONTENT_HEIGHT = SLIDE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - TITLE_AREA_HEIGHT - 0.5
TEXT_WIDTH_WITH_IMAGE = 4.8
TEXT_WIDTH_WITHOUT_IMAGE = CONTENT_WIDTH
IMAGE_START_LEFT = 5.3
IMAGE_GAP = 0.2

# ============ UTILITY FUNCTIONS ============
def check_ollama_connection():
    """Verify Ollama is running and accessible"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        if response.status_code == 200:
            models = response.json().get('models', [])
            model_names = [m.get('name', '').split(':')[0] for m in models]
            return True, model_names
        return False, []
    except Exception as e:
        return False, []

def allowed_file(filename, allowed_extensions):
    """Check if file has allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def startup_diagnostics():
    """Run startup checks and print status"""
    print("\n" + "="*60)
    print("🚀 FACEPREP - AI PRESENTATION & VIDEO GENERATOR")
    print("="*60)
    
    ollama_ok, models = check_ollama_connection()
    
    if ollama_ok:
        print(f"✅ Ollama is running ({OLLAMA_BASE_URL})")
        if models:
            print(f"📦 Available models: {models}")
            if AI_MODEL in models:
                print(f"✅ {AI_MODEL} model found!")
            else:
                print(f"⚠️  {AI_MODEL} not found. Run: ollama pull {AI_MODEL}")
        else:
            print(f"⚠️  No models found. Run: ollama pull {AI_MODEL}")
    else:
        print(f"❌ Ollama not running at {OLLAMA_BASE_URL}")
        print("   Start with: ollama serve")
    
    print("\n📸 Image API Status:")
    print(f"  {'✅' if UNSPLASH_API_KEY else '❌'} Unsplash API")
    print(f"  {'✅' if PEXELS_API_KEY else '❌'} Pexels API")
    print(f"  {'✅' if PIXABAY_API_KEY else '❌'} Pixabay API")
    
    print("\n🎥 Video Generation Status:")
    if VIDEO_GENERATION_ENABLED:
        print("  ✅ Video generation modules loaded")
        print("  ✅ Video pipeline initialized")
    else:
        print("  ❌ Video generation disabled (modules not found)")
    
    print("\n✅ Server ready!")
    print(f"✅ Running on: http://localhost:5000")
    print("="*60 + "\n")

startup_diagnostics()

# ============ FONT SIZE CALCULATOR ============
def calculate_dynamic_font_sizes(slide_sections, mode, has_image):
    """Dynamically calculate font sizes based on content density"""
    bullet_count = sum(1 for s in slide_sections if s['type'] == 'bullet')
    text_count = sum(1 for s in slide_sections if s['type'] == 'text')
    h3_count = sum(1 for s in slide_sections if s['type'] == 'h3')
    
    total_items = bullet_count + text_count + h3_count
    
    base_body = MODE_PROMPTS[mode].get("font_size_body", 12)
    
    if total_items <= 2:
        body_size = base_body + 1
        h3_size = 16
        spacing = 8
    elif total_items <= 4:
        body_size = base_body
        h3_size = 15
        spacing = 6
    elif total_items <= 6:
        body_size = max(base_body - 0.5, 11)
        h3_size = 14
        spacing = 5
    elif total_items <= 8:
        body_size = max(base_body - 1, 10)
        h3_size = 13
        spacing = 4
    elif total_items <= 12:
        body_size = max(base_body - 1.5, 9)
        h3_size = 12
        spacing = 3
    else:
        body_size = max(base_body - 2, 8)
        h3_size = 11
        spacing = 2
    
    if has_image:
        body_size = max(body_size - 0.5, 8)
        h3_size = max(h3_size - 1, 10)
        spacing = max(spacing - 1, 1)
    
    return {
        'body': body_size,
        'h3': h3_size,
        'spacing': spacing,
        'line_spacing': 1.1 if total_items > 8 else 1.15
    }

# ============ AI GENERATION ============
def generate_with_ai(prompt: str, mode: str = "Creative", slide_count: int = 5) -> str:
    """Generate content using local AI model via Ollama"""
    mode_config = MODE_PROMPTS.get(mode, MODE_PROMPTS["Creative"])
    mode_instruction = mode_config.get("instructions", "")
    
    enhanced_prompt = f"""{mode_instruction}

User Topic/Request: {prompt}

Please structure your response ONLY with markdown:
- Use # for the main topic (only once at the very start)
- Use ## for each major section (each ## becomes one slide)
- Create EXACTLY {slide_count} slides (exactly {slide_count} ## sections)
- Use ### for subsections within a slide
- Use * or - for bullet points (keep to {mode_config.get('max_bullets', 4)} per section)
- Keep points clear, concise, and well-organized
- Include practical examples where relevant

CRITICAL INSTRUCTIONS:
- Do NOT mention "Slide 1", "Slide 2", etc in the content
- Do NOT use dashes or separators like "-----" or "============"
- Only use proper markdown headers (# ## ###)
- Each ## section MUST be a separate slide
- Focus on clear, structured markdown ONLY
- Generate comprehensive content for ALL {slide_count} slides"""
    
    try:
        url = f"{OLLAMA_BASE_URL}/api/generate"
        
        payload = {
            "model": AI_MODEL,
            "prompt": enhanced_prompt,
            "stream": False,
            "temperature": 0.7 if mode == "Creative" else (0.5 if mode == "Quick Response" else 0.6),
        }
        
        print(f"🤖 Generating [{mode}] ({slide_count} slides) with {AI_MODEL} (LOCAL)...")
        
        response = requests.post(url, json=payload, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            generated_text = result.get('response', '').strip()
            print(f"✅ Generation complete ({len(generated_text)} chars)\n")
            return generated_text
        else:
            error_msg = f"Ollama error: HTTP {response.status_code}"
            print(f"❌ {error_msg}")
            return f"[Error]: {error_msg}"
    
    except requests.exceptions.ConnectionError:
        error_msg = f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. Make sure 'ollama serve' is running."
        print(f"❌ {error_msg}")
        return f"[Error]: {error_msg}"
    
    except requests.exceptions.Timeout:
        error_msg = f"{AI_MODEL} generation timed out (120s). Try a simpler prompt or Quick Response mode."
        print(f"❌ {error_msg}")
        return f"[Error]: {error_msg}"
    
    except Exception as e:
        error_msg = str(e)
        print(f"❌ AI error: {error_msg}")
        return f"[Error]: {error_msg}"

# ============ TEXT PROCESSING ============
def clean_markdown(text):
    """Remove markdown formatting"""
    if not text:
        return ""
    
    text = str(text)
    text = re.sub(r'^[\~\-\*]{3,}$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'__(.*?)__', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'_(.*?)_', r'\1', text)
    text = re.sub(r'`(.*?)`', r'\1', text)
    text = re.sub(r'```(.*?)```', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'#+\s*', '', text)
    text = re.sub(r'^[\*\-\•]\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'\1', text)
    text = re.sub(r'\[\s*\]', '', text)
    text = re.sub(r'\(\s*\)', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n+', '\n', text)
    
    return text.strip()

def truncate_text(text, max_length=250):
    """Truncate text to prevent overflow"""
    text = text.strip()
    if len(text) > max_length:
        truncated = text[:max_length]
        last_space = truncated.rfind(' ')
        if last_space > max_length * 0.7:
            return text[:last_space] + "..."
        return truncated + "..."
    return text

def parse_markdown_content(text):
    """Parse markdown content into sections"""
    lines = text.split('\n')
    sections = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        if not stripped or len(stripped) < 2:
            i += 1
            continue
        
        if re.match(r'^[\~\-\*]{3,}$', stripped):
            i += 1
            continue
        
        if stripped.startswith('###'):
            content = stripped.lstrip('#').strip()
            content = clean_markdown(content)
            if content and len(content) > 2:
                sections.append({'type': 'h3', 'content': content, 'level': 3})
        
        elif stripped.startswith('##'):
            content = stripped.lstrip('#').strip()
            content = clean_markdown(content)
            if content and len(content) > 2:
                sections.append({'type': 'h2', 'content': content, 'level': 2})
        
        elif stripped.startswith('#'):
            content = stripped.lstrip('#').strip()
            content = clean_markdown(content)
            if content and len(content) > 2:
                sections.append({'type': 'h1', 'content': content, 'level': 1})
        
        elif stripped.startswith(('*', '-', '•')):
            content = stripped.lstrip('*-•').strip()
            content = clean_markdown(content)
            if content and len(content) > 2:
                level = (len(line) - len(line.lstrip())) // 2
                sections.append({'type': 'bullet', 'content': content, 'level': level})
        
        else:
            content = clean_markdown(stripped)
            if len(content) > 5:
                sections.append({'type': 'text', 'content': content, 'level': 0})
        
        i += 1
    
    return sections

def group_into_slides(sections, max_slides=5):
    """Group sections into slides"""
    slides = []
    current_slide = []
    
    for section in sections:
        if section['type'] == 'h2':
            if current_slide:
                slides.append(current_slide)
            current_slide = [section]
        else:
            current_slide.append(section)
    
    if current_slide:
        slides.append(current_slide)
    
    return slides[:max_slides]

# ============ IMAGE FUNCTIONS ============
def fetch_unsplash_image(query):
    if not UNSPLASH_API_KEY:
        return None
    try:
        url = "https://api.unsplash.com/photos/random"
        params = {"query": query, "client_id": UNSPLASH_API_KEY, "orientation": "landscape"}
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            return response.json().get('urls', {}).get('regular')
    except:
        pass
    return None

def fetch_pexels_image(query):
    if not PEXELS_API_KEY:
        return None
    try:
        url = "https://api.pexels.com/v1/search"
        headers = {"Authorization": PEXELS_API_KEY}
        params = {"query": query, "per_page": 1}
        response = requests.get(url, headers=headers, params=params, timeout=5)
        if response.status_code == 200:
            photos = response.json().get('photos', [])
            if photos:
                return photos[0].get('src', {}).get('large')
    except:
        pass
    return None

def fetch_pixabay_image(query):
    if not PIXABAY_API_KEY:
        return None
    try:
        url = "https://pixabay.com/api/"
        params = {"key": PIXABAY_API_KEY, "q": query, "image_type": "photo", "per_page": 1, "min_width": 800, "min_height": 600}
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            hits = response.json().get('hits', [])
            if hits:
                return hits[0].get('largeImageURL')
    except:
        pass
    return None

def get_image_for_slide(slide_title):
    search_query = re.sub(r'[^a-zA-Z0-9\s]', '', slide_title).strip()[:50]
    if not search_query:
        return None
    
    if UNSPLASH_API_KEY:
        img_url = fetch_unsplash_image(search_query)
        if img_url:
            return img_url
    
    if PEXELS_API_KEY:
        img_url = fetch_pexels_image(search_query)
        if img_url:
            return img_url
    
    if PIXABAY_API_KEY:
        img_url = fetch_pixabay_image(search_query)
        if img_url:
            return img_url
    
    return None

def download_image(url):
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            img.thumbnail((1200, 800), Image.Resampling.LANCZOS)
            img_byte_arr = BytesIO()
            img.save(img_byte_arr, format='JPEG', quality=85)
            img_byte_arr.seek(0)
            return img_byte_arr
    except:
        pass
    return None

# ============ SLIDE BUILDING ============
def add_decorative_shapes(slide, theme, position="top"):
    if position == "top":
        shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(SLIDE_WIDTH), Inches(0.08))
        shape.fill.solid()
        shape.fill.fore_color.rgb = RGBColor(*theme["colors"]["accent"])
        shape.line.color.rgb = RGBColor(*theme["colors"]["accent"])

def set_background(slide, rgb):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(*rgb)

# ============ API ROUTES - CONTENT GENERATION ============
@app.route("/api/generate", methods=["POST"])
def generate_content():
    """Generate content using requested mode and model"""
    data = request.get_json()
    prompt = data.get("prompt", "")
    mode = data.get("mode", "Creative")
    slide_count = data.get("slide_count", 5) # New: accept slide count
    
    if mode not in MODE_PROMPTS:
        mode = "Creative"
    
    print(f"\n📝 Generating content in '{mode}' mode for {slide_count} slides...")
    output = generate_with_ai(prompt, mode, slide_count)
    
    return jsonify({
        "output": output,
        "mode": mode,
        "status": "success" if not output.startswith("[Error]") else "error"
    })

@app.route("/api/themes", methods=["GET"])
def get_themes():
    """Get available themes"""
    theme_list = [
        {
            "id": k,
            "name": v["name"],
            "preview_color": '#%02x%02x%02x' % v["colors"]["background"]
        }
        for k, v in THEMES.items()
    ]
    return jsonify({"themes": theme_list})

@app.route("/api/modes", methods=["GET"])
def get_modes():
    """Get available generation modes"""
    modes_list = [
        {
            "id": mode,
            "name": mode,
            "description": config.get("instructions"),
            "slide_count": config.get("slide_count"),
            "max_bullets": config.get("max_bullets")
        }
        for mode, config in MODE_PROMPTS.items()
    ]
    return jsonify({"modes": modes_list})

@app.route("/api/generate-ppt", methods=["POST"])
def generate_ppt():
    """Generate PowerPoint from content"""
    try:
        data = request.get_json()
        content = data.get("content", "").strip()
        title = data.get("title", "Generated Presentation").strip()
        filename = (data.get("filename", "") or "").strip().replace(" ", "_")
        include_images = data.get("include_images", True)
        mode = data.get("mode", "Creative")
        
        if mode not in MODE_PROMPTS:
            mode = "Creative"
        
        if not filename:
            filename = title.replace(" ", "_")
        
        customizations = data.get("customizations", {}) or {}
        theme_id = customizations.get("theme", "modern_blue")
        theme = THEMES.get(theme_id, THEMES["modern_blue"])
        max_slides = int(customizations.get("slide_count", MODE_PROMPTS[mode]["slide_count"]))
        
        if not content:
            return jsonify({"error": "Content is empty"}), 400
        
        sections = parse_markdown_content(content)
        if not sections:
            return jsonify({"error": "Could not parse content"}), 400
        
        slides_content = group_into_slides(sections, max_slides)
        
        prs = Presentation()
        prs.slide_width = Inches(SLIDE_WIDTH)
        prs.slide_height = Inches(SLIDE_HEIGHT)
        
        print("\n" + "="*60)
        print("🎬 CREATING PRESENTATION")
        print("="*60)
        print(f"Title: {title}")
        print(f"Mode: {mode}")
        print(f"Theme: {theme_id}")
        print(f"Total Slides: {len(slides_content)}")
        print("="*60 + "\n")
        
        # Title slide
        title_slide = prs.slides.add_slide(prs.slide_layouts[6])
        set_background(title_slide, theme["colors"]["title_slide_bg"])
        add_decorative_shapes(title_slide, theme, "top")
        
        title_box = title_slide.shapes.add_textbox(
            Inches(MARGIN_LEFT),
            Inches(SLIDE_HEIGHT * 0.25),
            Inches(CONTENT_WIDTH),
            Inches(1.5)
        )
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(54)
        p.font.bold = True
        p.font.name = theme["fonts"]["title"]
        p.font.color.rgb = RGBColor(*theme["colors"]["title"])
        p.alignment = PP_ALIGN.CENTER
        p.line_spacing = 1.2
        
        if slides_content and slides_content[0]:
            first_text = next(
                (s['content'] for s in slides_content[0] if s['type'] in ['h1', 'h2', 'text']),
                f"Generated in {mode} mode"
            )
            subtitle_box = title_slide.shapes.add_textbox(
                Inches(MARGIN_LEFT),
                Inches(SLIDE_HEIGHT * 0.5),
                Inches(CONTENT_WIDTH),
                Inches(1.0)
            )
            tf_sub = subtitle_box.text_frame
            tf_sub.word_wrap = True
            p_sub = tf_sub.paragraphs[0]
            p_sub.text = truncate_text(first_text, 80)
            p_sub.font.size = Pt(24)
            p_sub.font.name = theme["fonts"]["text"]
            p_sub.font.color.rgb = RGBColor(*theme["colors"]["subtitle"])
            p_sub.alignment = PP_ALIGN.CENTER
        
        # Content slides
        for slide_idx, slide_sections in enumerate(slides_content):
            slide = prs.slides.add_slide(prs.slide_layouts[6])
            set_background(slide, theme["colors"]["background"])
            add_decorative_shapes(slide, theme, "top")
            
            slide_title = "Overview"
            for section in slide_sections:
                if section['type'] in ['h1', 'h2']:
                    slide_title = section['content']
                    break
            
            print(f"📄 Slide {slide_idx + 1}: {truncate_text(slide_title, 60)}")
            
            # Title background
            title_bg = slide.shapes.add_shape(
                MSO_SHAPE.RECTANGLE,
                Inches(MARGIN_LEFT),
                Inches(MARGIN_TOP),
                Inches(CONTENT_WIDTH),
                Inches(TITLE_AREA_HEIGHT + 0.1)
            )
            title_bg.fill.solid()
            title_bg.fill.fore_color.rgb = RGBColor(*theme["colors"]["accent_light"])
            title_bg.line.fill.background()
            
            # Title text
            title_box = slide.shapes.add_textbox(
                Inches(MARGIN_LEFT + 0.2),
                Inches(MARGIN_TOP + 0.05),
                Inches(CONTENT_WIDTH - 0.4),
                Inches(TITLE_AREA_HEIGHT)
            )
            tf_title = title_box.text_frame
            tf_title.word_wrap = True
            p_title = tf_title.paragraphs[0]
            p_title.text = truncate_text(slide_title, 80)
            p_title.font.size = Pt(36)
            p_title.font.bold = True
            p_title.font.name = theme["fonts"]["heading"]
            p_title.font.color.rgb = RGBColor(*theme["colors"]["slide_title"])
            p_title.alignment = PP_ALIGN.LEFT
            
            # Image handling
            image_added = False
            if include_images and slide_idx > 0:
                print(f"  🖼️  Fetching image...")
                img_url = get_image_for_slide(slide_title)
                if img_url:
                    try:
                        img_data = download_image(img_url)
                        if img_data:
                            img_data.seek(0)
                            calc_width, calc_height = 3.2, 4.2
                            img_left = Inches(MARGIN_LEFT + IMAGE_START_LEFT + IMAGE_GAP)
                            img_top = Inches(CONTENT_AREA_TOP)
                            
                            slide.shapes.add_picture(
                                img_data,
                                img_left,
                                img_top,
                                width=Inches(calc_width),
                                height=Inches(calc_height)
                            )
                            image_added = True
                            print(f"  ✅ Image added!")
                    except Exception as e:
                        print(f"  ❌ Error adding image: {e}")
            
            # Font sizes
            font_config = calculate_dynamic_font_sizes(slide_sections, mode, image_added)
            
            # Content area
            content_width = TEXT_WIDTH_WITH_IMAGE if image_added else TEXT_WIDTH_WITHOUT_IMAGE
            content_left = MARGIN_LEFT
            content_top = CONTENT_AREA_TOP
            content_height = AVAILABLE_CONTENT_HEIGHT
            
            content_box = slide.shapes.add_textbox(
                Inches(content_left),
                Inches(content_top),
                Inches(content_width),
                Inches(content_height)
            )
            tf_content = content_box.text_frame
            tf_content.word_wrap = True
            tf_content.vertical_anchor = MSO_ANCHOR.TOP
            tf_content.auto_size = MSO_AUTO_SIZE.NONE
            
            # Add content
            first_para = True
            for section in slide_sections:
                if section['type'] == 'h1' or section['type'] == 'h2':
                    continue
                
                if not first_para:
                    tf_content.add_paragraph()
                
                if section['type'] == 'h3':
                    p = tf_content.paragraphs[-1] if not first_para else tf_content.paragraphs[0]
                    p.text = truncate_text(section['content'], 250)
                    p.font.size = Pt(font_config['h3'])
                    p.font.bold = True
                    p.font.name = theme["fonts"]["heading"]
                    p.font.color.rgb = RGBColor(*theme["colors"]["h3"])
                    p.space_after = Pt(font_config['spacing'])
                    p.line_spacing = font_config['line_spacing']
                
                elif section['type'] == 'bullet':
                    p = tf_content.paragraphs[-1] if not first_para else tf_content.paragraphs[0]
                    p.text = truncate_text(section['content'], 250)
                    p.level = min(section['level'], 2)
                    p.font.size = Pt(font_config['body'])
                    p.font.name = theme["fonts"]["text"]
                    p.font.color.rgb = RGBColor(*theme["colors"]["bullet"])
                    p.space_after = Pt(font_config['spacing'])
                    p.line_spacing = font_config['line_spacing']
                
                elif section['type'] == 'text':
                    p = tf_content.paragraphs[-1] if not first_para else tf_content.paragraphs[0]
                    p.text = truncate_text(section['content'], 250)
                    p.font.size = Pt(font_config['body'])
                    p.font.name = theme["fonts"]["text"]
                    p.font.color.rgb = RGBColor(*theme["colors"]["text"])
                    p.space_after = Pt(font_config['spacing'] + 2)
                    p.line_spacing = font_config['line_spacing']
                
                first_para = False
        
        # Save presentation to disk (for direct use in video generation)
        import time
        timestamp = str(int(time.time()))
        final_filename = f"{timestamp}_{filename}.pptx"
        ppt_path = os.path.join(PPT_UPLOAD_DIR, final_filename)
        prs.save(ppt_path)
        
        # Determine the relative path for the frontend
        # We also want to return the blob so they can download it
        with open(ppt_path, 'rb') as f:
            ppt_bytes_data = f.read()
            
        print(f"\n✅ Presentation created successfully!")
        print(f"📊 Total slides: {len(prs.slides)}")
        print(f"📁 Saved to: {ppt_path}")
        print(f"📦 File size: {len(ppt_bytes_data) / 1024:.1f} KB\n")
        
        # We'll return JSON if the request headers say so, or just return the blob if they want attachment
        # Actually, to make it work with both, we'll return a JSON containing the path AND the download URL
        # But wait, send_file is more convenient for immediate download.
        # How about we return the path in custom headers? Or just return JSON?
        
        # Let's check if the client expects JSON
        if request.headers.get('Accept') == 'application/json':
            return jsonify({
                "success": True,
                "ppt_path": ppt_path,
                "filename": final_filename,
                "message": "PPT generated successfully on server"
            })
        
        # Otherwise return the file (default for browser downloads)
        response = send_file(
            io.BytesIO(ppt_bytes_data),
            mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation',
            as_attachment=True,
            download_name=f"{filename}.pptx"
        )
        response.headers['X-PPT-Path'] = ppt_path
        response.headers['X-PPT-Filename'] = final_filename
        response.headers['Access-Control-Expose-Headers'] = 'X-PPT-Path, X-PPT-Filename'
        return response
    
    except Exception as e:
        print(f"❌ Error generating PowerPoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============ API ROUTES - VIDEO GENERATION ============
@app.route("/api/voices", methods=["GET"])
def get_voices():
    """Get available voice options"""
    if not VIDEO_GENERATION_ENABLED or not video_pipeline:
        return jsonify({
            "success": False,
            "error": "Video generation is not enabled"
        }), 503
    
    try:
        voices = video_pipeline.get_available_voices()
        return jsonify({
            "success": True,
            "voices": voices
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/upload-files", methods=["POST"])
def upload_files():
    """Upload PPT, face image, and optional audio for video generation"""
    if not VIDEO_GENERATION_ENABLED:
        return jsonify({
            "success": False,
            "error": "Video generation is not enabled"
        }), 503
    
    try:
        ppt_file = request.files.get('ppt')
        face_file = request.files.get('face')
        audio_file = request.files.get('audio')
        
        # Determine based on request.files if either is present
        if not ppt_file and not face_file and not audio_file:
            return jsonify({
                "success": False,
                "error": "At least one file (PPT, Face, or Audio) is required"
            }), 400
        
        # Use existing directories or determine which one to use
        # PPTs go to UPLOAD_FOLDER (or specifically PPT_UPLOAD_DIR if it exists)
        # Faces go to FACE_UPLOAD_DIR
        
        import time
        timestamp = str(int(time.time()))
        response_data = {"success": True}
        
        if ppt_file:
            # We assume UPLOAD_FOLDER or PPT_UPLOAD_DIR
            target_dir = globals().get('PPT_UPLOAD_DIR', UPLOAD_FOLDER)
            filename = f"{timestamp}_{secure_filename(ppt_file.filename)}"
            path = os.path.join(target_dir, filename)
            ppt_file.save(path)
            response_data["ppt_path"] = path
            
        if face_file:
            target_dir = globals().get('FACE_UPLOAD_DIR', UPLOAD_FOLDER)
            filename = f"{timestamp}_{secure_filename(face_file.filename)}"
            path = os.path.join(target_dir, filename)
            face_file.save(path)
            response_data["face_path"] = path

        if audio_file:
            # Create audio upload directory if needed
            audio_upload_dir = os.path.join(UPLOAD_FOLDER, 'audio')
            os.makedirs(audio_upload_dir, exist_ok=True)
            filename = f"{timestamp}_{secure_filename(audio_file.filename)}"
            path = os.path.join(audio_upload_dir, filename)
            audio_file.save(path)
            response_data["audio_path"] = path
            
        return jsonify(response_data)
    
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/api/generate-video", methods=["POST"])
def generate_video():
    """Generate video from PPT and face image"""
    if not VIDEO_GENERATION_ENABLED or not video_pipeline:
        return jsonify({
            "success": False,
            "error": "Video generation is not enabled. Please install required modules."
        }), 503
    
    try:
        data = request.json
        
        ppt_path = data.get('ppt_path')
        face_path = data.get('face_path')
        audio_path = data.get('audio_path')
        
        if not ppt_path or not face_path:
            return jsonify({
                "success": False,
                "error": "PPT path and face path are required"
            }), 400
        
        # Check if files exist
        if not os.path.exists(ppt_path):
            return jsonify({
                "success": False,
                "error": f"PPT file not found: {ppt_path}"
            }), 404
        
        if not os.path.exists(face_path):
            return jsonify({
                "success": False,
                "error": f"Face image not found: {face_path}"
            }), 404

        if audio_path and not os.path.exists(audio_path):
            return jsonify({
                "success": False,
                "error": f"Custom audio file not found: {audio_path}"
            }), 404
        
        # Get options
        options = {
            'voice_id': data.get('voice_id', 0),
            'slang_level': data.get('slang_level', 'medium'),
            'quality': data.get('quality', 'medium'),
            'tts_engine': data.get('tts_engine', 'edge'),
            'audio_path': audio_path
        }
        
        print(f"\n🎥 Starting video generation...")
        print(f"   PPT: {ppt_path}")
        print(f"   Face: {face_path}")
        print(f"   Options: {options}")
        
        # ADD THIS: More detailed error logging
        try:
            result = video_pipeline.process(ppt_path, face_path, options)
        except Exception as pipeline_error:
            print(f"❌ Pipeline Error Details:")
            print(f"   Error Type: {type(pipeline_error).__name__}")
            print(f"   Error Message: {str(pipeline_error)}")
            import traceback
            print(f"   Full Traceback:\n{traceback.format_exc()}")
            
            # Return detailed error to frontend
            return jsonify({
                "success": False,
                "error": f"Audio generation failed: {str(pipeline_error)}",
                "error_type": type(pipeline_error).__name__,
                "details": traceback.format_exc()
            }), 500
        
        if result['status'] == 'completed':
            job_id = os.path.basename(os.path.dirname(result['final_video']))
            
            return jsonify({
                "success": True,
                "video_url": f"/api/download-video/{job_id}/final",
                "script_url": f"/api/download-video/{job_id}/script",
                "audio_url": f"/api/download-video/{job_id}/audio",
                "steps": result['steps'],
                "job_id": job_id
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Unknown error'),
                "steps": result.get('steps', {})
            }), 500
    
    except Exception as e:
        print(f"❌ Video generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route("/api/download-video/<job_id>/<file_type>", methods=["GET"])
def download_video_file(job_id, file_type):
    """Download generated video files"""
    try:
        base_path = f'uploads/outputs/{job_id}'
        
        if not os.path.exists(base_path):
            return jsonify({"error": "Job not found"}), 404
        
        if file_type == 'final':
            file_path = os.path.join(base_path, 'lipsync_video.mp4')
            mimetype = 'video/mp4'
            download_name = f'{job_id}_video.mp4'
        elif file_type == 'script':
            file_path = os.path.join(base_path, 'script.txt')
            mimetype = 'text/plain'
            download_name = f'{job_id}_script.txt'
        elif file_type == 'audio':
            file_path = os.path.join(base_path, 'narration.wav')
            
            # --- STRICT AUDIO VALIDATION & RE-ENCODING (Pydub + FFmpeg) ---
            print(f"\n🎧 AUDIO GENERATED")
            print(f"- Path: {file_path}")
            exists = os.path.exists(file_path)
            print(f"- Exists: {exists}")
            
            if not exists:
                raise RuntimeError("Audio generation failed: file does NOT exist")
            
            size = os.path.getsize(file_path)
            print(f"- File size: {size} bytes")
            if size < 5000:
                 raise RuntimeError("Audio generation failed: file size too small")

            print(f"\n🔄 AUDIO RE-ENCODING")
            print("- Target: PCM 16-bit WAV (44.1kHz)")
            
            from pydub import AudioSegment
            try:
                audio = AudioSegment.from_file(file_path)
                # Force conversion to PCM 16-bit, 44.1kHz, Mono (standard for educators)
                audio = audio.set_frame_rate(44100).set_sample_width(2).set_channels(1)
                audio.export(file_path, format="wav")
            except Exception as conv_err:
                raise RuntimeError(f"Corrupted WAV after conversion: {conv_err}")

            print(f"\n🧪 AUDIO VALIDATION")
            new_size = os.path.getsize(file_path)
            duration = len(audio) / 1000.0
            print(f"- File path: {file_path}")
            print(f"- Size: {new_size} bytes")
            print(f"- Duration: {duration:.2f}s")
            
            print(f"\n📦 DOWNLOAD READY")
            print(f"- Path: {file_path}")
            print(f"- MIME type: audio/wav")
            print(f"- Size: {new_size}")
            
            print("\n✅ AUDIO FILE READY FOR DOWNLOAD")
            print("- Fully playable WAV file")
            # -------------------------------------------------------------

            mimetype = 'audio/wav'
            download_name = f'eduface_{job_id}_narration.wav'
        else:
            return jsonify({"error": "Invalid file type"}), 400
        
        if not os.path.exists(file_path):
            return jsonify({"error": f"File not found: {file_type}"}), 404
        
        return send_file(
            file_path,
            mimetype=mimetype,
            as_attachment=True,
            download_name=download_name
        )
    
    except Exception as e:
        print(f"❌ Download error: {e}")
        return jsonify({"error": str(e)}), 500

# ============ EDUFACE AI CHATBOT ============
@app.route("/api/chat", methods=["POST"])
def tutor_chat():
    '''Elite Groq-powered Eduface AI (Llama 3.3)'''
    try:
        data = request.json
        messages = data.get('messages', [])
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            return jsonify({"success": False, "error": "GROQ_API_KEY not found"}), 500
            
        client = Groq(api_key=api_key)

        # 1. CLEAN CONTEXT (Metadata Scrubbing)
        if messages and messages[0]['role'] == 'system':
            msg_content = messages[0]['content']
            clean_c = re.sub(r'\[\d{2}:\d{2}\]|\[SCENE START\]', '', msg_content)
            clean_c = re.sub(r'(FACE|EYES|HEAD|HANDS|BODY|TIMING):.*?(?=(FACE|EYES|HEAD|HANDS|BODY|TIMING|TEXT:|\Z))', '', clean_c, flags=re.DOTALL)
            clean_c = re.sub(r'TEXT:\s*"([^"]*)"', r'\1', clean_c)
            clean_c = re.sub(r'\s+', ' ', clean_c).strip()
            messages[0]['content'] = f"Context: {clean_c}"

        # 2. ELITE NOTEBOOKLM-STYLE IDENTITY
        system_i = {
            "role": "system",
            "content": (
                "You are 'Eduface AI', an intelligent real-time learner assistant. "
                "YOUR CORE RULE: ALWAYS respond in professional MARKDOWN. "
                "\n\nBEHAVIOR:"
                "\n1. Explain like an elite teacher. Be clear, structured, and authoritative."
                "\n2. Use **bolding** for key terms and concepts."
                "\n3. Use bullet points or numbered lists for steps and examples."
                "\n4. Use ### Headers for section breaks."
                "\n5. Ensure your response is professional and readable with appropriate spacing."
                "\n6. Engagement: Always offer follow-up help."
            )
        }
        messages.insert(0, system_i)

        comp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7
        )
        return jsonify({"success": True, "message": {"role": "assistant", "content": comp.choices[0].message.content}})
    except Exception as e:
        import traceback
        traceback.print_exc()
        # SCRUBBED FALLBACK POLICY
        friendly_fallback = "I’m currently unable to access the full model response, but I can still help you understand the topic."
        return jsonify({
            "success": True, 
            "message": {
                "role": "assistant", 
                "content": f"{friendly_fallback}\n\nThis lesson covers specialized materials. Would you like me to explain a related key concept while I refresh my connection?"
            }
        }), 200

# ============ HEALTH CHECK ============
@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    ollama_ok, models = check_ollama_connection()
    
    return jsonify({
        "status": "healthy" if ollama_ok else "degraded",
        "ollama_running": ollama_ok,
        "ollama_url": OLLAMA_BASE_URL,
        "ai_model": AI_MODEL,
        "available_models": models,
        "available_modes": list(MODE_PROMPTS.keys()),
        "video_generation_enabled": VIDEO_GENERATION_ENABLED,
        "image_apis": {
            "unsplash": bool(UNSPLASH_API_KEY),
            "pexels": bool(PEXELS_API_KEY),
            "pixabay": bool(PIXABAY_API_KEY)
        }
    })

# ==========================================
# Chat Sharing Endpoints
# ==========================================
@app.route('/api/share-chat', methods=['POST'])
def share_chat():
    try:
        data = request.json
        messages = data.get('messages', [])
        visibility = data.get('visibility', 'public')
        
        chat_id = str(uuid.uuid4())
        
        # Ensure only safe client data is stored
        safe_messages = []
        for msg in messages:
            safe_messages.append({
                'role': msg.get('role'),
                'content': msg.get('content')
            })
            
        chat_data = {
            'id': chat_id,
            'visibility': visibility,
            'messages': safe_messages,
            'timestamp': time.time(),
            'read_only': True
        }
        
        file_path = os.path.join(SHARED_CHATS_DIR, f"{chat_id}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f)
            
        return jsonify({
            'success': True,
            'share_id': chat_id,
            'share_url': f"http://localhost:5173/shared/{chat_id}"
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/shared-chat/<chat_id>', methods=['GET'])
def get_shared_chat(chat_id):
    try:
        # Prevent directory traversal
        safe_id = secure_filename(f"{chat_id}.json")
        file_path = os.path.join(SHARED_CHATS_DIR, safe_id)
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Shared chat not found'}), 404
            
        with open(file_path, 'r', encoding='utf-8') as f:
            chat_data = json.load(f)
            
        return jsonify({
            'success': True,
            'chat': chat_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': 'Failed to load chat'}), 500

# ============ START SERVER ============
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)