import type { Metadata } from "next";
import { Inter, Orbitron, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Soul Tech | Dashboard",
  description: "Internal company dashboard for Soul Tech",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${orbitron.variable} ${jetbrainsMono.variable} antialiased overflow-hidden`}>
        <div className="flex h-screen relative bg-black/50">
          {/* Background Grid Effect */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          <div className="relative z-10 flex w-full h-full">
            <Sidebar />
            <main className="flex-1 overflow-hidden relative">
              {/* Top Glow Bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
