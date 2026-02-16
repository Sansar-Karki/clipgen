#!/usr/bin/env python3
"""Analyze transcript and find interesting moments"""

import json
import re
import sys
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


def extract_key_words(text: str, num_words: int = 3) -> str:
    """Extract the most engaging 2-3 words from text for short captions"""
    if not text:
        return ""
    
    skip_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'you', 'your', 'i', 'me', 'my', 'we', 'us', 'our', 'he', 'him', 'his', 'she', 'her', 'get', 'got', 'going', 'go', 'like', 'know', 'think', 'really', 'thing', 'things', 'way', 'make', 'made', 'want', 'come', 'actually', 'basically', 'literally', 'honestly'}
    priority_words = {'secret', 'truth', 'money', 'wealth', 'rich', 'success', 'failure', 'dream', 'goal', 'habit', 'life', 'hack', 'tip', 'tips', 'strategy', 'mindset', 'belief', 'fear', 'love', 'hate', 'amazing', 'incredible', 'shocking', 'warning', 'mistake', 'lesson', 'story', 'proven', 'tested', 'never', 'always', 'everyone', 'nobody', 'imagine', 'trust', 'real', 'honest', 'finally', 'best', 'worst', 'easy', 'simple', 'fast', 'quick', 'free', 'now', 'today', 'start', 'stop', 'watch', 'listen', 'remember', 'understand', 'learn', 'grow', 'change'}
    
    words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())
    scored_words = []
    for word in words:
        if word in skip_words:
            continue
        score = 1
        if word in priority_words:
            score += 3
        if word in words[:5]:
            score += 1
        scored_words.append((word, score))
    
    scored_words.sort(key=lambda x: x[1], reverse=True)
    top_words = [w[0] for w in scored_words[:num_words]]
    
    if len(top_words) < num_words:
        for word in words:
            if word not in skip_words and word not in top_words:
                top_words.append(word)
                if len(top_words) >= num_words:
                    break
    
    return ' '.join(top_words[:num_words])


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
    
    # Sort by score and get top 20 (more clips)
    scored_windows.sort(key=lambda x: x['score'], reverse=True)
    top_moments = [w for w in scored_windows if w["score"] >= 15][:20]
    
    # Expand to max 45 second clips around best moments
    clips = []
    for moment in top_moments:
        clip_start = max(0, moment['start'] - 5)
        clip_duration = min(45, moment['end'] - moment['start'] + 25)  # Max 45 seconds
        clip_end = min(clip_start + clip_duration, scored_windows[-1]['end'])
        
        # Extract 2-3 key words from the text for caption
        key_words = extract_key_words(moment['text'], num_words=3)
        
        clips.append({
            'start': clip_start,
            'end': clip_end,
            'score': moment['score'],
            'text': key_words,  # 2-3 words instead of full sentence
            'full_text': moment['text'],  # Keep full text for reference
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
        print(f"  {i+1}. {clip['start']:.1f}s - {clip['end']:.1f}s (score: {clip['score']}) - \"{clip['text']}\"")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: analyze.py <transcript.json> <output.json>")
        sys.exit(1)
    
    analyze_transcript(sys.argv[1], sys.argv[2])
