#!/usr/bin/env python3
"""Process video clips with FFmpeg - resize to 9:16, add blur background, burn subtitles"""

import sys
import json
import os
import subprocess
from pathlib import Path


def create_vertical_clip(input_path: str, output_path: str, start_time: float, end_time: float, subtitle_path: str = None):
    """Create 9:16 vertical clip with blurred background"""
    
    duration = end_time - start_time
    
    # FFmpeg command:
    # 1. Scale video to 1080x1920 (force original aspect, then crop)
    # 2. Create blurred background from scaled video
    # 3. Overlay original on blurred background
    # 4. Add subtitles if provided
    
    filters = []
    
    # Scale and crop to 9:16
    filters.append(f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[cut]")
    
    # Create blurred background
    filters.append("[cut]boxblur=15:1[blur]")
    
    # Overlay (center the cut video on blurred background)
    filters.append("[blur][cut]overlay=(W-w)/2:(H-h)/2[out]")
    
    # Build the filter complex
    filter_complex = ";".join(filters)
    
    cmd = [
        'ffmpeg',
        '-y',  # Overwrite output
        '-i', input_path,  # Input video
        '-ss', str(start_time),  # Start time
        '-t', str(duration),  # Duration
        '-filter_complex', filter_complex,
        '-map', '[out]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        output_path
    ]
    
    if subtitle_path and os.path.exists(subtitle_path):
        # Add subtitle burning
        cmd.extend([
            '-vf', f"subtitles='{subtitle_path}'",
        ])
    
    print(f"Processing: {output_path}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    
    print(f"Created: {output_path}")
    return True


def create_subtitle_file(text: str, output_path: str, start_time: float, end_time: float):
    """Create SRT subtitle file"""
    
    # Simple SRT format
    start_srt = srt_time(start_time)
    end_srt = srt_time(end_time)
    
    srt_content = f"""1
{start_srt} --> {end_srt}
{text}
"""
    
    with open(output_path, 'w') as f:
        f.write(srt_content)
    
    return output_path


def srt_time(seconds: float) -> str:
    """Convert seconds to SRT time format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def process_clips(video_path: str, moments_path: str, output_dir: str):
    """Process all clips from moments file"""
    
    # Load moments
    with open(moments_path, 'r') as f:
        data = json.load(f)
    
    clips = data.get('clips', [])
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    results = []
    
    for i, clip in enumerate(clips):
        output_path = os.path.join(output_dir, f"clip_{i+1}.mp4")
        
        # Extract text for subtitle (first 200 chars)
        text = clip.get('text', '')[:200]
        
        # Create subtitle file
        sub_path = os.path.join(output_dir, f"clip_{i+1}.srt")
        if text:
            create_subtitle_file(text, sub_path, 0, clip['end'] - clip['start'])
        
        # Process video
        success = create_vertical_clip(
            video_path,
            output_path,
            clip['start'],
            clip['end'],
            sub_path if text else None
        )
        
        if success:
            results.append({
                'index': i + 1,
                'start': clip['start'],
                'end': clip['end'],
                'score': clip.get('score', 0),
                'output': output_path
            })
    
    # Save results
    results_path = os.path.join(output_dir, 'results.json')
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nProcessed {len(results)} clips")
    print(f"Results saved to: {results_path}")


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: process_clips.py <video.mp4> <moments.json> <output_dir>")
        sys.exit(1)
    
    process_clips(sys.argv[1], sys.argv[2], sys.argv[3])
