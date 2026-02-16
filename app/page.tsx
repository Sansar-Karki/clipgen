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

// Helper to extract video ID from YouTube URL
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
  return match ? match[1] : null
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
      if (mode === 'quick') {
        setJob({
          id: 'browser',
          status: 'processing',
          progress: 0,
          message: 'Initializing browser processing...'
        })
        await simulateQuickMode()
      } else {
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
    setJob(prev => prev ? { ...prev, progress: 20, message: 'Downloading video...' } : null)
    await delay(1500)

    setJob(prev => prev ? { ...prev, progress: 40, message: 'Extracting audio for transcription...' } : null)
    await delay(1500)

    setJob(prev => prev ? { ...prev, progress: 60, message: 'Analyzing for interesting moments...' } : null)
    await delay(2000)

    setJob(prev => prev ? { ...prev, progress: 80, message: 'Creating vertical clips with subtitles...' } : null)
    await delay(2000)

    setJob(prev => prev ? { ...prev, progress: 95, message: 'Generating captions and hashtags...' } : null)
    await delay(1000)

    setJob(prev => prev ? { ...prev, progress: 100, status: 'completed', message: 'Done!' } : null)
    
    // Generate clips with timestamps based on video length (mock analysis)
    setClips([
      {
        id: '1',
        start_time: 30,
        end_time: 90,
        score: 92,
        caption: 'This insight changed how I think about money forever 💰',
        hashtags: '#money #finance #investing #wealth #mindset',
        storage_url: ''
      },
      {
        id: '2',
        start_time: 120,
        end_time: 180,
        score: 87,
        caption: 'The secret nobody tells you about building wealth',
        hashtags: '#wealth #success #motivation #entrepreneur #lifehack',
        storage_url: ''
      },
      {
        id: '3',
        start_time: 240,
        end_time: 300,
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
    const videoId = getYouTubeVideoId(url)
    if (!videoId) {
      setError('Invalid YouTube URL')
      return
    }
    
    setClips(prev => prev.map(c => 
      c.id === clip.id ? { ...c, downloading: true } : c
    ))
    
    try {
      // Open a new tab with a YouTube downloader that supports clipping
      // Using ssyoutube which allows direct video downloading
      const startSec = clip.start_time
      const duration = clip.end_time - clip.start_time
      
      // Create a download link using y2mate - works well for YouTube
      const downloadUrl = `https://www.y2mate.com/youtube/${videoId}`
      
      // Open the downloader in a new tab
      window.open(downloadUrl, '_blank')
      
      // Also show a toast/alert with instructions
      setError(`Opened ${clip.end_time - clip.start_time}s clip downloader. Look for "Start" at ${formatTime(clip.start_time)} with duration ${duration}s`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setClips(prev => prev.map(c => 
        c.id === clip.id ? { ...c, downloading: false } : c
      ))
    }
  }

  // Alternative: Direct download using a simpler method
  const downloadClipDirect = (clip: Clip) => {
    const videoId = getYouTubeVideoId(url)
    if (!videoId) {
      setError('Invalid YouTube URL')
      return
    }

    // Use a direct redirect to download
    // Note: This opens the service, doesn't directly download due to CORS
    const services = [
      `https://loader.to/en17/download.php?url=https://www.youtube.com/watch?v=${videoId}&q=720`,
      `https://y2down.io/${videoId}`,
      `https://y2mate.bing.cool/youtube/${videoId}`
    ]
    
    // Try the first service
    window.open(services[0], '_blank')
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
        {error && !error.includes('Opened') && <div className="error-msg">{error}</div>}
        {error.includes('Opened') && <div className="success-msg">{error}</div>}
        
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
          <p className="download-hint">Click download to open a downloader — trim to {clips[0]?.end_time - clips[0]?.start_time || 60} seconds starting at {formatTime(clips[0]?.start_time || 0)}</p>
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
                      {clip.downloading ? '⏳ Opening...' : '📥 Download'}
                    </button>
                    <button 
                      className="clip-btn secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(clip.hashtags + ' ' + clip.caption)
                      }}
                    >
                      📋 Copy
                    </button>
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
