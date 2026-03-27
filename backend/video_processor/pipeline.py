import os
import time
from typing import Dict, Any
from pydub import AudioSegment
from moviepy.editor import (
    VideoFileClip, ImageClip, CompositeVideoClip,
    concatenate_videoclips, ColorClip
)
import moviepy.video.fx.all as vfx

from .ppt_extractor import PPTExtractor
from .text_processor import TextProcessor
from .tts_engine import TTSEngine
from .face_processor import FaceProcessor
from .lipsync_generator import LipSyncGenerator
from .video_assembler import VideoAssembler


class VideoPipeline:

    def __init__(self, output_dir='uploads/outputs'):

        self.output_dir = os.path.abspath(output_dir)
        os.makedirs(self.output_dir, exist_ok=True)

        self.text_processor = TextProcessor()
        self.tts_engine = TTSEngine()
        self.face_processor = FaceProcessor()
        self.lipsync_generator = LipSyncGenerator()
        self.video_assembler = VideoAssembler()

    # ─────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────

    def _log(self, pct, msg):

        print(f"\n{'='*52}")
        print(f"[{pct:3d}%] {msg}")
        print(f"{'='*52}")

    # ─────────────────────────────────────────────
    # MAIN PIPELINE
    # ─────────────────────────────────────────────

    def process(self, ppt_path, face_path, options=None):

        if options is None:
            options = {}

        voice_id = options.get('voice_id', 0)
        slang_level = options.get('slang_level', 'medium')
        quality = options.get('quality', 'medium')
        tts_engine = options.get('tts_engine', 'edge')

        job_id = f"{int(time.time())}_{os.path.splitext(os.path.basename(ppt_path))[0]}"

        job_dir = os.path.join(self.output_dir, job_id)
        slides_dir = os.path.join(job_dir, 'slides')

        os.makedirs(job_dir, exist_ok=True)
        os.makedirs(slides_dir, exist_ok=True)

        results: Dict[str, Any] = {
            'status': 'processing',
            'steps': {
                'extraction': 'pending',
                'preprocessing': 'pending',
                'script': 'pending',
                'audio': 'pending',
                'lipsync': 'pending',
                'finalization': 'pending'
            },
            'job_dir': job_dir
        }

        try:

            # STEP 1
            self._log(10, "STEP 1/6 — Extracting PPT content")

            extractor = PPTExtractor(ppt_path)

            slides_data = extractor.extract_text()

            if not slides_data:
                results['status'] = 'error'
                results['error'] = 'No PPT content extracted'
                return results

            slide_images = extractor.export_slides_as_images(
                slides_dir,
                width=1920,
                height=1080
            )

            results['steps']['extraction'] = 'completed'

            # STEP 2
            self._log(20, "STEP 2/6 — Validating face image")

            is_valid, msg = self.face_processor.validate_image(face_path)

            if not is_valid:
                results['status'] = 'error'
                results['error'] = msg
                return results

            processed_face = os.path.join(job_dir, 'processed_face.png')

            processed_face = self.face_processor.preprocess_face(
                face_path,
                processed_face
            )

            if not processed_face or not os.path.exists(processed_face):

                results['status'] = 'error'
                results['error'] = 'Face preprocessing failed'
                return results

            results['steps']['preprocessing'] = 'completed'

            # STEP 3
            self._log(35, "STEP 3/6 — Generating narration scripts")

            scripts = self.text_processor.format_for_speech_per_slide(
                slides_data,
                slang_level
            )

            script_path = os.path.join(job_dir, 'script.txt')

            combined_script = '\n\n--- SLIDE BREAK ---\n\n'.join(scripts)

            with open(script_path, 'w', encoding='utf-8') as f:
                f.write(combined_script)

            results['script_path'] = script_path
            results['steps']['script'] = 'completed'

            # 🎬 STEP 4: Audio Generation
            self._log(50, "STEP 4/6 — Generating audio narration")
            print("\n🎙️ GENERATING TTS NARRATION")
            print(f"- Engine used: {tts_engine}")
            print(f"- Voice Persona ID: {voice_id}")
            
            audio_files = []
            for idx, script_text in enumerate(scripts):
                audio_path = os.path.join(job_dir, f'narration_{idx:03d}.wav')
                af = self.tts_engine.generate_audio_with_fallback(
                    text=script_text,
                    output_path=audio_path,
                    preferred_engine=tts_engine,
                    voice_id=voice_id
                )
                
                if not af or not os.path.exists(af):
                    results['status'] = 'error'
                    results['error'] = f"Audio generation failed for slide {idx+1}"
                    return results

                af = self.tts_engine.normalize_audio(af)
                audio_files.append(af)
                
            print("\n✅ AUDIO PIPELINE SUCCESS")
            print("- Audio source: GENERATED TTS")
            print("- Audio files count: ", len(audio_files))
            print("━"*40 + "\n")

            results['steps']['audio'] = 'completed'

            # STEP 5
            self._log(65, "STEP 5/6 — Generating lip-sync videos")

            lipsync_videos = []

            for idx, audio_file in enumerate(audio_files):

                lipsync_path = os.path.join(job_dir, f'lipsync_{idx:03d}.mp4')

                vp, vmsg = self.lipsync_generator.generate_video(
                    processed_face,
                    audio_file,
                    lipsync_path,
                    quality=quality
                )

                if not vp or not os.path.exists(vp):

                    raise RuntimeError(
                        f"Lip-sync failed for slide {idx+1}: {vmsg}"
                    )

                lipsync_videos.append(vp)

            results['steps']['lipsync'] = 'completed'

            # STEP 6
            self._log(90, "STEP 6/6 — Compositing final video")

            VIDEO_W = 1920
            VIDEO_H = 1080

            AVATAR_W = 420
            AVATAR_MARGIN = 30

            final_clips = []
            n_clips = len(lipsync_videos)
            
            # Keep track of timestamps for the script
            current_time = 0
            script_with_timestamps = []

            for idx, lipsync_vid in enumerate(lipsync_videos):

                try:

                    avatar_clip = VideoFileClip(lipsync_vid)

                    duration = avatar_clip.duration
                    
                    # Add current timestamp to the script segment
                    minutes = int(current_time // 60)
                    seconds = int(current_time % 60)
                    timestamp = f"[{minutes:02d}:{seconds:02d}]"
                    
                    if idx < len(scripts):
                        script_with_timestamps.append(f"{timestamp} {scripts[idx]}")
                    
                    current_time += duration

                    # Apply alpha mask
                    try:
                        is_video = processed_face.lower().endswith(('.mp4', '.mov', '.webm'))

                        if not is_video:
                            orig_face = ImageClip(
                                processed_face,
                                transparent=True
                            )

                            if orig_face.mask is not None:
                                avatar_mask = orig_face.mask.set_duration(duration)
                                avatar_clip = avatar_clip.set_mask(avatar_mask)

                            orig_face.close()
                        else:
                            print("  🔍 Generating dynamic video mask (this may take a while)...")
                            from rembg import remove, new_session
                            from moviepy.editor import VideoClip
                            
                            try:
                                session = new_session("u2net")
                                def make_rembg_mask(t):
                                    frame = avatar_clip.get_frame(t)
                                    rgba = remove(frame, session=session)
                                    return (rgba[:, :, 3] / 255.0).astype("float32")
                                    
                                mask_clip = VideoClip(make_frame=make_rembg_mask, ismask=True).set_duration(duration)
                                avatar_clip = avatar_clip.set_mask(mask_clip)
                            except Exception as e:
                                print(f"  ⚠️ Could not apply dynamic mask: {e}")
                                # Apply greenscreen keying as fallback if rembg fails
                                avatar_clip = vfx.mask_color(avatar_clip, color=[0, 255, 0], thr=100, s=5)
                                
                    except Exception as mask_err:

                        print(f"Mask warning: {mask_err}")

                    avatar_clip = avatar_clip.resize(width=AVATAR_W)

                    if avatar_clip.h > VIDEO_H * 0.85:

                        avatar_clip = avatar_clip.resize(
                            height=VIDEO_H * 0.85
                        )

                    avatar_x = VIDEO_W - avatar_clip.w - AVATAR_MARGIN
                    avatar_y = VIDEO_H - avatar_clip.h - AVATAR_MARGIN

                    # Background
                    if idx < len(slide_images) and os.path.exists(slide_images[idx]):

                        bg = (
                            ImageClip(slide_images[idx])
                            .set_duration(duration)
                            .resize((VIDEO_W, VIDEO_H))
                        )

                    else:

                        bg = (
                            ColorClip(
                                size=(VIDEO_W, VIDEO_H),
                                color=(30, 30, 45)
                            )
                            .set_duration(duration)
                        )

                    composed = CompositeVideoClip(
                        [
                            bg,
                            avatar_clip.set_position((avatar_x, avatar_y))
                        ],
                        size=(VIDEO_W, VIDEO_H)
                    )

                    if avatar_clip.audio:

                        composed = composed.set_audio(
                            avatar_clip.audio
                        )

                    final_clips.append(composed)

                except Exception as clip_err:

                    print(f"Skipping slide {idx+1}: {clip_err}")
            
            # Update script file with actual timestamps
            if script_with_timestamps:
                combined_script_ts = '\n\n'.join(script_with_timestamps)
                with open(script_path, 'w', encoding='utf-8') as f:
                    f.write(combined_script_ts)

            if not final_clips:

                raise RuntimeError(
                    "No slides could be composited"
                )

            print(f"\nConcatenating {len(final_clips)} clips")

            final_video_path = os.path.join(
                job_dir,
                'lipsync_video.mp4'
            )

            final_concat = concatenate_videoclips(
                final_clips,
                method="compose"
            )

            # --- ADDED: Generate final combined narration audio ---
            from moviepy.editor import concatenate_audioclips
            final_audio_path = os.path.join(job_dir, 'narration.wav')
            
            # Extract audio from each slide clip and join them
            slide_audios = [c.audio for c in final_clips if c.audio]
            if slide_audios:
                print(f"   Generating final narration audio ({len(slide_audios)} segments)...")
                final_narration = concatenate_audioclips(slide_audios)
                # Export as wav with standard parameters for max Windows compatibility
                final_narration.write_audiofile(final_audio_path, logger=None, codec='pcm_s16le')
            # ---------------------------------------------------

            final_concat.write_videofile(
                final_video_path,
                fps=24,
                codec='libx264',
                audio_codec='aac',
                threads=1,
                preset='ultrafast',
                ffmpeg_params=['-crf', '28']
            )

            # Cleanup
            for c in final_clips:

                try:

                    if c.audio:
                        c.audio.close()

                    c.close()

                except:
                    pass

            try:
                final_concat.close()
            except:
                pass

            results['final_video'] = final_video_path
            results['status'] = 'completed'
            results['steps']['finalization'] = 'completed'

        except Exception as e:

            results['status'] = 'error'
            results['error'] = str(e)

            import traceback
            traceback.print_exc()

        return results

    # ─────────────────────────────────────────────
    # Available voices
    # ─────────────────────────────────────────────

    def get_available_voices(self):

        try:

            return self.tts_engine.list_voices()

        except Exception as e:

            print(f"Voice error: {e}")

            return [
                {
                    'id': 'gtts_en',
                    'name': 'Google TTS (English)',
                    'engine': 'gtts',
                    'language': 'en'
                }
            ]