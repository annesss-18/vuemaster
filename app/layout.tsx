import type { Metadata } from "next";
import { Quantico } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const quantico = Quantico({
  weight: ["400", "700"],
  variable: "--font-quantico",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "vuemaster - AI-Powered Mock Interview Platform",
  description: "Master your technical interviews with AI-powered mock interviews. Get real-time feedback, practice coding challenges, and improve your skills with personalized assessments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body className={`${quantico.className} antialiased pattern`} suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
