import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        // Route seamlessly to the backend without triggering browser CORS
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`, 
      },
    ]
  },
};

export default nextConfig;
