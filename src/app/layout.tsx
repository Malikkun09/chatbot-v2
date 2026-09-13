import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chatbot.malikfajar.me"),
  title: "Chatbot V2",
  description:
    "Standalone AI chatbot by Muhammad Malik Fajar. Streaming answers from OpenRouter and NVIDIA NIM with secure Markdown rendering.",
  applicationName: "Chatbot V2",
  authors: [{ name: "Muhammad Malik Fajar", url: "https://github.com/Malikkun09" }],
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
