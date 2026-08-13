import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Email brand assets are read from disk when attaching CID images.
  outputFileTracingIncludes: {
    "/*": ["./public/images/brand/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "siam-ez.com", pathname: "/**" },
      { protocol: "https", hostname: "www.siam-ez.com", pathname: "/**" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" },
      { protocol: "https", hostname: "dealers.virtualyard.com.au", pathname: "/**" },
      { protocol: "https", hostname: "virtualyard.com.au", pathname: "/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // OAuth / social avatars used on portal & public profiles
      { protocol: "https", hostname: "*.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      { source: "/thailicense.html", destination: "/en/services/driver-license", permanent: true },
      { source: "/en/thailicense.html", destination: "/en/services/driver-license", permanent: true },
      { source: "/th/thailicense.html", destination: "/th/services/driver-license", permanent: true },
      {
        source: "/",
        has: [{ type: "host", value: "www.siam-ez.com" }],
        destination: "https://siam-ez.com/",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.siam-ez.com" }],
        destination: "https://siam-ez.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
