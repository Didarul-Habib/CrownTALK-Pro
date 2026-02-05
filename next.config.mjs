/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { optimizePackageImports: ["lucide-react"] },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
    ],
  },
};
export default nextConfig;
