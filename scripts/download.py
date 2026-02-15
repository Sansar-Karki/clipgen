#!/usr/bin/env python3
"""Download YouTube video using yt-dlp"""

import sys
import subprocess

def download_video(url: str, output_path: str):
    """Download best quality video (max 1080p)"""
    cmd = [
        'yt-dlp',
        '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
        '--merge-output-format', 'mp4',
        '-o', output_path,
        url
    ]
    subprocess.run(cmd, check=True)
    print(f"Downloaded to {output_path}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: download.py <youtube_url> <output_path>")
        sys.exit(1)
    
    download_video(sys.argv[1], sys.argv[2])
