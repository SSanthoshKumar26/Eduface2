from moviepy.editor import VideoFileClip, AudioFileClip, CompositeVideoClip, ColorClip, TextClip
import os

class VideoAssembler:
    def __init__(self):
        pass
    
    def add_background(self, video_path, output_path, bg_color=(245, 245, 245)):
        """Add a background color to video"""
        try:
            video = VideoFileClip(video_path)
            
            # Create colored background
            bg = ColorClip(
                size=video.size,
                color=bg_color,
                duration=video.duration
            )
            
            # Composite
            final = CompositeVideoClip([bg, video])
            
            # Write output
            final.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                fps=25,
                preset='medium'
            )
            
            # Cleanup
            video.close()
            bg.close()
            final.close()
            
            return output_path
        except Exception as e:
            print(f"Video assembly error: {e}")
            return None
    
    def add_watermark(self, video_path, output_path, text="Created with FacePrep"):
        """Add a text watermark to video"""
        try:
            video = VideoFileClip(video_path)
            
            # Create text clip
            txt_clip = TextClip(
                text,
                fontsize=20,
                color='white',
                font='Arial',
                stroke_color='black',
                stroke_width=1
            ).set_position(('right', 'bottom')).set_duration(video.duration)
            
            # Composite
            final = CompositeVideoClip([video, txt_clip])
            
            # Write output
            final.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                fps=25
            )
            
            # Cleanup
            video.close()
            txt_clip.close()
            final.close()
            
            return output_path
        except Exception as e:
            print(f"Watermark error: {e}")
            return video_path  # Return original if watermark fails