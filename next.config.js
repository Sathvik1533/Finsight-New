/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Move build cache outside iCloud to prevent sync conflicts
  distDir: process.env.NODE_ENV === 'development'
    ? '/tmp/finsight-next-dev'
    : '.next',
}

module.exports = nextConfig
