#!/usr/bin/env python3
"""Analyze transcript and find interesting moments"""

import json
import re
from dataclasses import dataclass
from typing import List

# Hook words that indicate engaging content
HOOK_WORDS = {
    'secret', 'truth', 'honest', 'real', 'actually', 'finally',
    'never', 'always', 'everyone', 'nobody', 'imagine', 'think',
    'believe', 'know', 'want', 'need', 'fear', 'dream', 'goal',
    'mistake', 'lesson', 'story', 'warning', 'proven', 'tested'
}

# Emotional language patterns
EMOTIONAL_PATTERNS = [
    r'\b(love|hate|amazing|incredible|shocking|terrible|awesome)\b',
    r'\b(holy|wow|oh my|seriously|literally)\b',
    r'[!?]{2,}',
]

# Question patterns
QUESTION_PATTERNS = [
    r'\?',
    r'\b(what|why|how|when|where|who|can you|do you|have you|will you)\b',
]


@dataclass
class Segment:
    """A 10-second segment with scoring"""
    start: float
    end: float
    text: str
    score: int = 0
    signals: dict = None
    
    def __post_init__(self):
        if self.signals is None:
            self.signals = {}


def contains_question(text: str) -> bool:
    """Check if segment contains a question"""
    return bool(re.search(r'\?', text.lower()))


def has_hook_words(text: str) -> bool:
    """Check for hook words that indicate engaging content"""
    words = set(re.findall(r'\b\w+\b', text.lower()))
    return bool(words & HOOK_WORDS)


def has_emotional_language(text: str) -> bool:
    """Check for emotional language"""
    text_lower = text.lower()
    for pattern in EMOTIONAL_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False


def calculate_volume_signal(segments: List[dict], start: float, end: float) -> int:
    """Check for volume spikes in segment (simplified)"""
    # In a real implementation, we'd analyze audio levels
    # For now, return 0 as we don't have audio data
    return 0


def score_segment(segment_text: str, segment_audio: dict = None) -> dict:
    """Score a segment based on multiple signals"""
    score = 0
    signals = {}
    
    # Transcript signals (40 points max)
    if contains_question(segment_text):
        score += 10
        signals['question'] = True
    
    if has_hook_words(segment_text):
        score += 15
        signals['hook_words'] = True
    
    if has_emotional_language(segment_text):
        score += 15
        signals['emotional'] = True
    
    # Audio signals (30 points max) - would need actual audio analysis
    # if segment_audio and 'volume_spike' in segment_audio:
    #     score += 15
    #     signals['volume_spike'] = True
    
    # Bonus: longer engagement potential
    # (handled at segment boundary level)
    
    return {'score': score, 'signals': signals}


def analyze_transcript(transcript_path: str, output_path: str):
    """Analyze transcript and find best moments"""
    with open(transcript_path, 'r') as f:
        data = json.load(f)
    
    segments = data.get('segments', [])
    if not segments:
        print("No segments found in transcript")
        return
    
    # Group into 10-second windows
    window_size = 10
    scored_windows = []
    
    i = 0
    while i < len(segments):
        window_start = segments[i]['start']
        window_end = min(window_start + window_size, segments[-1]['end'])
        
        # Collect text in window
        window_text = ''
        while i < len(segments) and segments[i]['start'] < window_end:
            window_text += ' ' + segments[i]['text']
            i += 1
        
        # Score the window
        result = score_segment(window_text)
        
        scored_windows.append({
            'start': window_start,
            'end': window_end,
            'text': window_text.strip(),
            'score': result['score'],
            'signals': result['signals']
        })
    
    # Sort by score and get top 5
    scored_windows.sort(key=lambda x: x['score'], reverse=True)
    top_moments = [w for w in scored_windows if w['score'] >= 40][:5]
    
    # Expand to 30-60 second clips around best moments
    clips = []
    for moment in top_moments:
        clip_start = max(0, moment['start'] - 10)
        clip_end = min(moment['end'] + 20, scored_windows[-1]['end'])
        clips.append({
            'start': clip_start,
            'end': clip_end,
            'score': moment['score'],
            'text': moment['text'],
            'signals': moment['signals']
        })
    
    # Save results
    output = {
        'moments': top_moments,
        'clips': clips,
        'total_segments': len(scored_windows)
    }
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Found {len(clips)} interesting moments")
    for i, clip in enumerate(clips):
        print(f"  {i+1}. {clip['start']:.1f}s - {clip['end']:.1f}s (score: {clip['score']})")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: analyze.py <transcript.json> <output.json>")
        sys.exit(1)
    
    analyze_transcript(sys.argv[1], sys.argv[2])
