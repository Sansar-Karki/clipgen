import { NextRequest, NextResponse } from 'next/server'

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = process.env.GITHUB_OWNER || 'your-username'
const REPO_NAME = process.env.GITHUB_REPO || 'clipgen'

export async function POST(request: NextRequest) {
  try {
    const { url, mode } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    
    // Generate a job ID
    const jobId = `job_${Date.now()}`
    
    if (mode === 'quick') {
      // Quick mode handled client-side with ffmpeg.wasm
      return NextResponse.json({ 
        job_id: jobId, 
        message: 'Browser processing mode',
        mode: 'quick'
      })
    }
    
    // Smart mode - trigger GitHub Actions
    if (!GITHUB_TOKEN) {
      return NextResponse.json({ 
        error: 'GitHub token not configured' 
      }, { status: 500 })
    }
    
    // Trigger workflow dispatch
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          event_type: 'process_video',
          client_payload: {
            youtube_url: url,
            job_id: jobId
          }
        })
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ 
        error: 'Failed to trigger workflow',
        details: error
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      job_id: jobId,
      message: 'Processing started'
    })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
