#!/usr/bin/env python3
"""Process video clips with FFmpeg - resize to 9:16, add blur background"""

import sys
import json
import os
import subprocess
from pathlib import Path


def create_vertical_clip(input_path: str, output_path: str, start_time: float, end_time: float, caption: str = None):
    """Create 9:16 vertical clip with blurred background"""
    
    duration = end_time - start_time
    
    # Scale, crop, and add slight blur
    video_filter = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=2"
    
    cmd = [
        'ffmpeg',
        '-y',
        '-ss', str(start_time),
        '-t', str(duration),
        '-i', input_path,
        '-vf', video_filter,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        output_path
    ]
    
    print(f"Processing clip: {output_path} ({duration:.1f}s)")
    print(f"  Caption: {caption}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error: {result.stderr[-500:]}")
        return False
    
    print(f"Created: {output_path}")
    return True


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
        
        # Use the short caption text (2-3 words)
        caption = clip.get('text', '')[:50]
        
        # Process video (skipping burned-in subtitles - ffmpeg build lacks filter)
        success = create_vertical_clip(
            video_path,
            output_path,
            clip['start'],
            clip['end'],
            caption
        )
        
        if success:
            results.append({
                'index': i + 1,
                'start': clip['start'],
                'end': clip['end'],
                'score': clip.get('score', 0),
                'caption': caption,
                'output': output_path
            })
    
    # Save results with captions
    results_path = os.path.join(output_dir, 'results.json')
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nProcessed {len(results)} clips")
    print(f"Results saved to: {results_path}")
    print("\nNOTE: Captions are saved in results.json - your ffmpeg build lacks the subtitles filter for burned-in captions")


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: process_clips.py <video.mp4> <moments.json> <output_dir>")
        sys.exit(1)
    
    process_clips(sys.argv[1], sys.argv[2], sys.argv[3])
