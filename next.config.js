/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for ffmpeg.wasm
  experimental: {
    serverComponentsExternalPackages: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
}

module.exports = nextConfig
