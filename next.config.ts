import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "media.isaacjiang.ca",
        pathname: "/camera/**",
      },
    ],

    qualities: [60, 70, 75, 90],
  },
};

export default nextConfig;