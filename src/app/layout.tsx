import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radio Globe — Listen to the world's radio stations",
  description:
    "Explore an interactive 3D globe of thousands of live radio stations from every corner of the world. Spin, click, and listen — just like Radio Garden.",
  keywords: [
    "radio",
    "radio garden",
    "live radio",
    "internet radio",
    "world radio",
    "3D globe",
    "radio stations",
    "global radio",
    "online radio",
  ],
  authors: [{ name: "Radio Globe" }],
  openGraph: {
    title: "Radio Globe — Listen to the world's radio stations",
    description:
      "Explore an interactive 3D globe of thousands of live radio stations from every corner of the world.",
    siteName: "Radio Globe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Radio Globe",
    description: "Listen to the world's radio stations on a 3D globe.",
  },
  // Link AdSense script — only loads if NEXT_PUBLIC_ADSENSE_CLIENT is set
  other: {
    "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#040810" },
    { media: "(prefers-color-scheme: dark)", color: "#040810" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
