import type { Metadata, Viewport } from "next";
import { Quantico } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import "./globals.css";

const quantico = Quantico({
  weight: ["400", "700"],
  variable: "--font-quantico",
  subsets: ["latin"],
  display: "swap",
});

// Base URL for metadata
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intervoxai.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "IntervoxAI - AI-Powered Mock Interview Platform",
    template: "%s | IntervoxAI",
  },
  description:
    "Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews. Real interviews. Real feedback. Faster growth.",
  keywords: [
    "mock interview",
    "AI interview",
    "technical interview",
    "coding interview",
    "interview practice",
    "Gemini AI",
    "job preparation",
    "software engineer interview",
    "IntervoxAI",
  ],
  authors: [{ name: "IntervoxAI Team" }],
  creator: "IntervoxAI",
  publisher: "IntervoxAI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "IntervoxAI",
    title: "IntervoxAI - AI-Powered Mock Interview Platform",
    description:
      "Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IntervoxAI - AI Mock Interviews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IntervoxAI - AI-Powered Mock Interview Platform",
    description:
      "Practice. Speak. Improve. Master your technical interviews with AI-powered mock interviews.",
    images: ["/og-image.png"],
    creator: "@intervoxai",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body
        className={`${quantico.className} antialiased pattern`}
        suppressHydrationWarning
      >
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          theme="dark"
        />
        <Analytics />
      </body>
    </html>
  );
}
