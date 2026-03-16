import os
import sys
import subprocess
import glob
import shutil
from pptx import Presentation

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

    def export_slides_as_images(self, output_dir, width=1920, height=1080):
        """
        Export each PPTX slide as a PNG image.
        Tries MS PowerPoint COM first (100% fidelity on Windows).
        Tries LibreOffice headless second.
        Falls back to PIL-based renderer.
        Returns a sorted list of PNG file paths.
        """
        os.makedirs(output_dir, exist_ok=True)
        image_paths = []
        abs_ppt = os.path.abspath(self.ppt_path)
        abs_out = os.path.abspath(output_dir)

        # ── Attempt 1: MS PowerPoint COM (Windows Only, 100% Fidelity) ──
        try:
            import sys
            if sys.platform == 'win32':
                import win32com.client
                import pythoncom
                print("  📊 Using MS PowerPoint to export slides (100% fidelity)...")
                pythoncom.CoInitialize()
                powerpoint = win32com.client.Dispatch("PowerPoint.Application")
                presentation = powerpoint.Presentations.Open(abs_ppt, ReadOnly=True, WithWindow=False)
                
                for i, slide in enumerate(presentation.Slides, 1):
                    img_path = os.path.join(abs_out, f"slide_{i-1:03d}.png")
                    slide.Export(img_path, "PNG", width, height)
                    if os.path.exists(img_path):
                        image_paths.append(img_path)
                
                presentation.Close()
                try: powerpoint.Quit()
                except: pass
                pythoncom.CoUninitialize()
                
                if image_paths:
                    print(f"  ✅ Exported {len(image_paths)} slides perfectly via PowerPoint")
                    return sorted(image_paths)
        except Exception as com_err:
            print(f"  ⚠️ PowerPoint COM export failed: {com_err}")

        # ── Attempt 2: LibreOffice headless ─────────────────────────────
        try:
            lo_candidates = [
                r'C:\Program Files\LibreOffice\program\soffice.exe',
                r'C:\Program Files (x86)\LibreOffice\program\soffice.exe',
                'soffice',
            ]
            lo_exe = None
            for candidate in lo_candidates:
                path = shutil.which(candidate)
                if path:
                    lo_exe = path
                    break

            if lo_exe:
                print(f"  📊 Using LibreOffice to export slides...")
                # Convert all arguments to string to avoid complex type inference issues (PathLike recursion)
                subprocess.run(
                    [str(lo_exe), '--headless', '--Ponvert-to', 'png', '--outdir', str(abs_out), str(abs_ppt)],
                    capture_output=True, text=True, timeout=120
                )
                base = os.path.splitext(os.path.basename(abs_ppt))[0]
                exported = sorted(glob.glob(os.path.join(abs_out, f"{base}*.png")))
                if exported:
                    print(f"  ✅ Exported {len(exported)} slides via LibreOffice")
                    return exported
        except Exception as lo_err:
            print(f"  ⚠️  LibreOffice export failed: {lo_err}")

        # ── Attempt 3: PIL renderer (always works) ──────────────────────
        try:
            from PIL import Image, ImageDraw, ImageFont

            prs = self.presentation
            emu_per_px = 914400 / 96          # 96 DPI
            slide_w = int(prs.slide_width  / emu_per_px)
            slide_h = int(prs.slide_height / emu_per_px)
            scale   = min(width / slide_w, height / slide_h)
            out_w   = int(slide_w * scale)
            out_h   = int(slide_h * scale)

            print(f"  📊 Using PIL renderer for slides ({out_w}×{out_h})...")
            for i, slide in enumerate(prs.slides):
                # Background colour
                try:
                    fill = slide.background.fill
                    bg_color = (
                        fill.fore_color.rgb.r,
                        fill.fore_color.rgb.g,
                        fill.fore_color.rgb.b,
                    )
                except Exception:
                    bg_color = (255, 255, 255)

                img  = Image.new('RGB', (out_w, out_h), bg_color)
                draw = ImageDraw.Draw(img)

                for shape in slide.shapes:
                    if not hasattr(shape, "text") or not shape.text.strip():
                        continue
                    try:
                        x = int(shape.left / emu_per_px * scale)
                        y = int(shape.top  / emu_per_px * scale)
                        font_size = max(14, int(20 * scale))
                        try:
                            font = ImageFont.truetype("arial.ttf", font_size)
                        except Exception:
                            font = ImageFont.load_default()
                        draw.text((x + 10, y + 10), shape.text.strip(),
                                  fill=(20, 20, 20), font=font)
                    except Exception:
                        pass

                # Centre on black canvas (letterbox)
                canvas  = Image.new('RGB', (width, height), (0, 0, 0))
                paste_x = (width  - out_w) // 2
                paste_y = (height - out_h) // 2
                canvas.paste(img, (paste_x, paste_y))

                img_path = os.path.join(output_dir, f'slide_{i:03d}.png')
                canvas.save(img_path, 'PNG')
                image_paths.append(img_path)

            print(f"  ✅ Exported {len(image_paths)} slides via PIL")
            return image_paths

        except Exception as pil_err:
            print(f"  ⚠️  PIL renderer failed: {pil_err}")
            return []