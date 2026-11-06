import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// The fonts are files in ./fonts rather than next/font/google, which fetches
// them from Google during every build — and a build that can't reach Google
// fails and takes the live site down. See fonts/README.md.
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

const spaceMono = localFont({
  src: [
    { path: "./fonts/space-mono-latin-400.woff2", weight: "400" },
    { path: "./fonts/space-mono-latin-700.woff2", weight: "700" },
  ],
  variable: "--font-space-mono",
  display: "swap",
});

const archivo = localFont({
  src: "./fonts/archivo-latin.woff2",
  weight: "700 900",
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Help & Support — Masterways",
  description: "Submit a complaint, service request or general inquiry to Masterways Group of Companies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable} ${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
