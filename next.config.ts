import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow static image optimization from external sources
  images: {
    remotePatterns: [
      { hostname: 'res.cloudinary.com' },
      { hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // Expose env vars to the client (they are prefixed NEXT_PUBLIC_)
  env: {
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '',
  },
};

export default nextConfig;
