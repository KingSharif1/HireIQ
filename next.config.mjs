/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse and @react-pdf/renderer are Node.js-only — keep them server-side
  serverExternalPackages: ['pdf-parse', '@react-pdf/renderer'],
  // Empty turbopack config silences the "webpack config but no turbopack config" warning
  turbopack: {},
}

export default nextConfig
