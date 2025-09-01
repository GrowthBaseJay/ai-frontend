import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GrowthBase AI",
  description: "DM-first AI copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body
          className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
          style={{ background: "var(--gb-bg)", color: "var(--gb-text)" }}
        >
          {/* APP SHELL */}
          <div className="flex h-dvh flex-col">
            {/* HEADER (left brand only) */}
            <header className="sticky top-0 z-50 border-b border-[color:var(--gb-border)]/60 bg-[var(--gb-bg)]">
              <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center px-4">
                <div className="flex items-center gap-2">
                  {/* <img src="/logo.svg" alt="GrowthBase" className="h-5 w-5" /> */}
                  <span className="font-medium tracking-tight">GrowthBase AI</span>
                </div>
                <div className="mx-auto" />
                {/* right side intentionally empty */}
              </div>
            </header>

            {/* CONTENT COLUMN (pages handle their own sidebar/layout if needed) */}
            <main className="flex min-h-0 flex-1 flex-col bg-[var(--gb-bg)]">
              {children}
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}