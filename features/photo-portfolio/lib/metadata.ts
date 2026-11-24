import type { Metadata } from "next";

export const portfolioOrigin = "https://www.isaacjiang.ca";

export function portfolioMetadata(title: string, description: string, path: string, index = true,
  image = { path: "/photo/share/default", alt: "IJ.PRIME — Photographs by Isaac Jiang" }): Metadata {
  const fullTitle = `${title} — IJ.PRIME`;
  const url = new URL(path, portfolioOrigin).href;
  const imageUrl = new URL(image.path, portfolioOrigin).href;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    robots: { index, follow: true },
    openGraph: {
      title: fullTitle, description, url, siteName: "IJ.PRIME", type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: image.alt, type: "image/jpeg" }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [{ url: imageUrl, alt: image.alt }] },
  };
}
