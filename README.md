# ClipGen - Free YouTube Clip Generator

> **Use it on your own videos, or videos you have permission to use.** It downloads YouTube videos with yt-dlp, which can go against YouTube's terms and other people's copyright. This is an early prototype from February 2026 and is not maintained.

A 100% free YouTube clip generation tool that finds interesting moments, creates vertical (9:16) clips with blurred backgrounds and subtitles, and generates captions/hashtags.

## Features

- 🎯 **Smart Detection** - AI-powered interesting moment detection
- 📱 **Vertical Ready** - Clips optimized for TikTok, Reels, Shorts
- 💬 **Auto Captions** - Burned-in subtitles + generated hashtags
- ⚡ **Dual Mode** - Quick (browser) or Smart (GitHub Actions)

## Architecture

```
Frontend: Next.js → Vercel (free)
Processing: 
  - Quick Mode: ffmpeg.wasm (browser)
  - Smart Mode: GitHub Actions (2,000 min/month free)
Storage: Cloudflare R2 or Supabase
Database: Supabase (free tier)
AI: OpenAI or Anthropic (for captions)
```

## Quick Start

### 1. Clone and Install

```bash
cd clipgen
npm install
npm run dev
```

### 2. Set up GitHub Actions (Smart Mode)

1. Create a GitHub repository
2. Add `GITHUB_TOKEN` secret with repo scope
3. Push code and the workflow will be available

### 3. Set up Supabase (Optional)

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GITHUB_TOKEN=your_github_token
```

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

## Project Structure

```
clipgen/
├── app/
│   ├── page.tsx          # Main UI
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Styles
│   └── api/
│       └── trigger-workflow/  # API route
├── .github/
│   └── workflows/
│       └── process-video.yml  # GitHub Actions
├── scripts/
│   ├── download.py       # yt-dlp wrapper
│   ├── transcribe.py     # Whisper transcription
│   ├── analyze.py        # Interesting moments algorithm
│   └── process_clips.py  # FFmpeg processing
└── public/
    └── worker/           # ffmpeg.wasm files
```

## Interesting Moments Algorithm

The scoring system evaluates 10-second segments:

```
Score = Transcript (40pts) + Audio (30pts) + Visual (30pts)

Transcript:
  - Contains question: +10pts
  - Hook words (secret, truth, etc.): +15pts
  - Emotional language: +15pts

Audio (requires audio analysis):
  - Volume spike: +15pts
  - Speech rate change: +15pts

Visual (requires frame analysis):
  - Scene change: +15pts
  - Face detected: +15pts
```

## FFmpeg Commands

### 9:16 with blur background
```bash
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20[bg];[0:v]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" \
  output.mp4
```

### Add subtitles
```bash
ffmpeg -i input.mp4 -vf "subtitles=subs.srt:force_style='FontName=Arial,FontSize=24'" output.mp4
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, React
- **Browser Processing**: ffmpeg.wasm
- **Video Download**: yt-dlp
- **Transcription**: OpenAI Whisper
- **Backend**: GitHub Actions, Python
- **Storage**: Cloudflare R2 / Supabase
- **Database**: Supabase Postgres

## License

MIT
