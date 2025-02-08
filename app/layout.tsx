import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tetris Party - Multiplayer Tetris Game",
  description:
    "Play Tetris with friends in real-time! A modern multiplayer Tetris game featuring competitive gameplay, live opponent boards, and instant line attack mechanics.",
  keywords: [
    "tetris",
    "multiplayer",
    "online game",
    "real-time",
    "competitive",
    "browser game",
    "party game",
  ],
  authors: [{ name: "Tetris Party" }],
  openGraph: {
    title: "Tetris Party - Multiplayer Tetris Game",
    description: "Challenge your friends in real-time Tetris battles!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
