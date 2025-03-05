/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Update the experimental configuration to use serverExternalPackages instead of serverComponentsExternalPackages
  experimental: {
    serverExternalPackages: ['@supabase/auth-helpers-nextjs'],
  },
};

module.exports = nextConfig; 