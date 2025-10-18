/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true, // ignores ESLint errors during build
  },
  typescript: {
    ignoreBuildErrors: true, // ignores TS type errors during build
  },
  // Any other Next.js config goes here
};
