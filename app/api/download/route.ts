import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, startTime, endTime, clipId } = await request.json()
    
    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 })
    }

    const tempDir = os.tmpdir()
    const timestamp = Date.now()
    const videoPath = path.join(tempDir, `video_${timestamp}.mp4`)
    const clipPath = path.join(tempDir, `clip_${clipId}_${timestamp}.mp4`)
    
    // Step 1: Download video
    await new Promise<void>((resolve, reject) => {
      const dl = spawn('yt-dlp', [
        '-f', 'best[height<=720]',
        '--merge-output-format', 'mp4',
        '-o', videoPath,
        videoUrl
      ])
      
      dl.stderr.on('data', (data) => console.log('yt-dlp:', data.toString()))
      dl.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Download failed with code ${code}`))
      })
      dl.on('error', reject)
    })

    // Step 2: Extract clip
    await new Promise<void>((resolve, reject) => {
      const duration = endTime - startTime
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
        '-movflags', '+faststart',
        clipPath
      ])
      
      ffmpeg.stderr.on('data', (data) => console.log('ffmpeg:', data.toString()))
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Clip extraction failed with code ${code}`))
      })
      ffmpeg.on('error', reject)
    })

    // Step 3: Read and return the clip
    const clipBuffer = fs.readFileSync(clipPath)
    const base64 = clipBuffer.toString('base64')
    
    // Cleanup temp files
    fs.unlinkSync(videoPath)
    fs.unlinkSync(clipPath)

    return NextResponse.json({
      success: true,
      clip: `data:video/mp4;base64,${base64}`,
      downloadUrl: `data:video/mp4;base64,${base64}`
    })
    
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process video' 
    }, { status: 500 })
  }
}
