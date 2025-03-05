/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Update the experimental configuration to use serverExternalPackages instead of serverComponentsExternalPackages
  experimental: {
    serverExternalPackages: ['@supabase/auth-helpers-nextjs'],
  },
  images: {
    domains: [
      'images-na.ssl-images-amazon.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'i.imgur.com',
      'media.licdn.com',
      'platform-lookaside.fbsbx.com',
      'pbs.twimg.com',
      'res.cloudinary.com',
      'localhost'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig; 