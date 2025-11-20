import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Isaac Jiang",
  description: "CS @ University of Waterloo, Incoming SWE Intern @ SAP",
  metadataBase: new URL("https://isaacjiang.ca"),

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "Isaac Jiang",
    description: "CS @ University of Waterloo, Incoming SWE Intern @ SAP",
    url: "https://isaacjiang.ca",
    siteName: "Isaac Jiang",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Isaac Jiang Portfolio",
      },
    ],
    locale: "en-US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Isaac Jiang",
    description: "CS @ University of Waterloo, Incoming SWE Intern @ SAP",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <Providers>
        {children}
        </Providers>
      </body>
    </html>
  );
}
