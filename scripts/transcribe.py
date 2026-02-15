#!/usr/bin/env python3
"""Transcribe video using Whisper"""

import sys
import json
import whisper

def transcribe(video_path: str, output_path: str):
    """Transcribe audio from video"""
    print("Loading Whisper model...")
    model = whisper.load_model("medium")
    
    print("Transcribing...")
    result = model.transcribe(video_path, verbose=False)
    
    # Save transcript
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"Transcript saved to {output_path}")
    print(f"Duration: {result['duration']:.1f}s")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: transcribe.py <video_path> <output_path>")
        sys.exit(1)
    
    transcribe(sys.argv[1], sys.argv[2])
