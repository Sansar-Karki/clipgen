'use client'

import { useState, useEffect, useRef } from 'react'

interface JobStatus {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
}

interface Clip {
  id: string
  start_time: number
  end_time: number
  score: number
  caption: string
  hashtags: string
  storage_url: string
  downloading?: boolean
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'quick' | 'smart'>('quick')
  const [job, setJob] = useState<JobStatus | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const startProcessing = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL')
      return
    }

    setError('')
    setIsLoading(true)
    setClips([])

    try {
      // For quick mode, we'll use browser processing
      // For smart mode, we'd trigger GitHub Actions
      if (mode === 'quick') {
        setJob({
          id: 'browser',
          status: 'processing',
          progress: 0,
          message: 'Initializing browser processing...'
        })

        // Simulate processing steps
        await simulateQuickMode()
      } else {
        // Smart mode - trigger API
        const response = await fetch('/api/trigger-workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, mode })
        })

        if (!response.ok) throw new Error('Failed to start processing')

        const data = await response.json()
        setJob({
          id: data.job_id,
          status: 'processing',
          progress: 10,
          message: 'Video queued for processing...'
        })

        startPolling(data.job_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setJob(null)
    } finally {
      setIsLoading(false)
    }
  }

  const simulateQuickMode = async () => {
    // Step 1: Download
    setJob(prev => prev ? { ...prev, progress: 20, message: 'Downloading video...' } : null)
    await delay(1500)

    // Step 2: Extract audio
    setJob(prev => prev ? { ...prev, progress: 40, message: 'Extracting audio for transcription...' } : null)
    await delay(1500)

    // Step 3: Analyze
    setJob(prev => prev ? { ...prev, progress: 60, message: 'Analyzing for interesting moments...' } : null)
    await delay(2000)

    // Step 4: Process clips
    setJob(prev => prev ? { ...prev, progress: 80, message: 'Creating vertical clips with subtitles...' } : null)
    await delay(2000)

    // Step 5: Generate captions
    setJob(prev => prev ? { ...prev, progress: 95, message: 'Generating captions and hashtags...' } : null)
    await delay(1000)

    // Complete
    setJob(prev => prev ? { ...prev, progress: 100, status: 'completed', message: 'Done!' } : null)
    
    // Mock results
    setClips([
      {
        id: '1',
        start_time: 45,
        end_time: 105,
        score: 92,
        caption: 'This insight changed how I think about money forever 💰',
        hashtags: '#money #finance #investing #wealth #mindset',
        storage_url: ''
      },
      {
        id: '2',
        start_time: 180,
        end_time: 240,
        score: 87,
        caption: 'The secret nobody tells you about building wealth',
        hashtags: '#wealth #success #motivation #entrepreneur #lifehack',
        storage_url: ''
      },
      {
        id: '3',
        start_time: 320,
        end_time: 380,
        score: 78,
        caption: 'This one habit will transform your finances',
        hashtags: '#habits #finance #money #selfimprovement #tips',
        storage_url: ''
      }
    ])
  }

  const startPolling = (jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/job-status?id=${jobId}`)
        const data = await response.json()
        
        setJob({
          id: data.id,
          status: data.status,
          progress: data.progress,
          message: data.message
        })

        if (data.status === 'completed') {
          setClips(data.clips || [])
          if (pollRef.current) clearInterval(pollRef.current)
        } else if (data.status === 'failed') {
          setError(data.message || 'Processing failed')
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 5000)
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const downloadClip = async (clip: Clip) => {
    if (!url.trim()) {
      setError('No video URL available')
      return
    }
    
    // Mark this clip as downloading
    setClips(prev => prev.map(c => 
      c.id === clip.id ? { ...c, downloading: true } : c
    ))
    
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: url,
          startTime: clip.start_time,
          endTime: clip.end_time,
          clipId: clip.id
        })
      })
      
      if (!response.ok) throw new Error('Download failed')
      
      const data = await response.json()
      
      if (data.downloadUrl) {
        // Create download link
        const a = document.createElement('a')
        a.href = data.downloadUrl
        a.download = `clip_${clip.id}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setClips(prev => prev.map(c => 
        c.id === clip.id ? { ...c, downloading: false } : c
      ))
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  return (
    <div className="container">
      <header className="header">
        <h1 className="logo">ClipGen</h1>
        <p className="tagline">Turn YouTube videos into viral clips — 100% free</p>
      </header>

      <section className="input-section">
        {error && <div className="error-msg">{error}</div>}
        
        <div className="input-group">
          <input
            type="text"
            className="url-input"
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startProcessing()}
          />
          <button 
            className="generate-btn" 
            onClick={startProcessing}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Generate Clips'}
          </button>
        </div>

        <div className="mode-toggle">
          <span className="mode-label">Processing mode:</span>
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${mode === 'quick' ? 'active' : ''}`}
              onClick={() => setMode('quick')}
            >
              ⚡ Quick (Browser)
            </button>
            <button 
              className={`toggle-btn ${mode === 'smart' ? 'active' : ''}`}
              onClick={() => setMode('smart')}
            >
              🧠 Smart (AI-Powered)
            </button>
          </div>
        </div>
      </section>

      {job && (
        <section className="status-section">
          <div className="status-header">
            <div className="spinner"></div>
            <span className="status-text">{job.message}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </section>
      )}

      {clips.length > 0 && (
        <section className="results-section">
          <h2 className="results-title">✨ Found {clips.length} Viral Moments</h2>
          <div className="clips-grid">
            {clips.map((clip) => (
              <div key={clip.id} className="clip-card">
                <div className="clip-thumbnail">
                  ▶ {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
                </div>
                <div className="clip-info">
                  <div className="clip-time">
                    Score: {clip.score}/100 • {clip.end_time - clip.start_time}s
                  </div>
                  <p className="clip-caption">{clip.caption}</p>
                  <p className="clip-hashtags">{clip.hashtags}</p>
                  <div className="clip-actions">
                    <button 
                      className="clip-btn primary" 
                      onClick={() => downloadClip(clip)}
                      disabled={clip.downloading}
                    >
                      {clip.downloading ? '⏳ Downloading...' : 'Download'}
                    </button>
                    <button className="clip-btn secondary">Copy</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="features">
        <div className="feature">
          <div className="feature-icon">🎯</div>
          <h3 className="feature-title">Smart Detection</h3>
          <p className="feature-desc">AI finds the most engaging moments automatically</p>
        </div>
        <div className="feature">
          <div className="feature-icon">📱</div>
          <h3 className="feature-title">Vertical Ready</h3>
          <p className="feature-desc">Clips optimized for TikTok, Reels, Shorts</p>
        </div>
        <div className="feature">
          <div className="feature-icon">💬</div>
          <h3 className="feature-title">Auto Captions</h3>
          <p className="feature-desc">Burned-in subtitles + generated hashtags</p>
        </div>
      </section>

      <footer className="footer">
        <p>100% Free • No Watermark • Privacy First</p>
      </footer>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
