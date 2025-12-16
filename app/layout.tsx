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
  title: "vuemaster",
  description: "An AI-powered platform for mock interviews",
};

export default function RootLayout({
  children,
}: Readonly<{  
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
  <body className={`${quantico.className} antialiased pattern`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
