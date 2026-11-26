import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/photo/share/**": ["./features/photo-portfolio/fonts/instrumentsans-share.ttf"],
    "/api/photo-sharing/**": ["./features/photo-portfolio/fonts/instrumentsans-share.ttf"],
  },
  async redirects() {
    return [
      { source: "/photo-preview", destination: "/photo", permanent: false },
      ...["archive", "series", "about", "photos", "admin"].map((section) => ({
        source: `/photo-preview/${section}/:path*`,
        destination: `/photo/${section}/:path*`,
        permanent: false,
      })),
      { source: "/photo/gallery", destination: "/photo/archive", permanent: false },
      { source: "/photo/gallery/:category", destination: "/photo-legacy/gallery/:category", permanent: false },
    ];
  },
  images: {
    // Reuse transformations for photos that rarely change. When replacing a
    // photo, upload it under a new filename so cached versions stay correct.
    minimumCacheTTL: 2_678_400,
    formats: ["image/webp"],
    qualities: [75],
    deviceSizes: [640, 960, 1280, 1920],
    imageSizes: [32, 64, 128, 256, 384],
    localPatterns: [{ pathname: "/images/**", search: "" }],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "media.isaacjiang.ca",
        pathname: "/camera/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
