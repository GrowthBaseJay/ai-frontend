import { type Metadata } from "next";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
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
          {/* APP SHELL: sticky header + main row (sidebar + content) */}
          <div className="flex h-dvh flex-col">
            {/* HEADER */}
            <header className="sticky top-0 z-50 border-b border-[color:var(--gb-border)]/60 bg-[var(--gb-bg)]">
              <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center px-4">
                {/* Left: brand */}
                <div className="flex items-center gap-2">
                  {/* <img src="/logo.svg" alt="GrowthBase" className="h-5 w-5" /> */}
                  <span className="font-medium tracking-tight">GrowthBase AI</span>
                </div>

                {/* Center spacer (no model picker here yet) */}
                <div className="mx-auto" />

                {/* Right: auth */}
                <div className="flex items-center gap-3">
                  <SignedOut>
                    <SignInButton />
                    <SignUpButton>
                      <button className="rounded-full border border-[color:var(--gb-border)]/60 bg-[var(--gb-accent)] px-4 py-2 text-sm font-medium text-black hover:brightness-110">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              </div>
            </header>

            {/* MAIN ROW */}
            <div className="flex min-h-0 flex-1">
              {/* SIDEBAR (placeholder for now; we’ll wire later) */}
              <aside className="hidden w-72 shrink-0 border-r border-[color:var(--gb-border)]/60 bg-[var(--gb-bg)] lg:block">
                <div className="flex h-full flex-col">
                  <div className="border-b border-[color:var(--gb-border)]/60 p-3">
                    <button className="w-full rounded-md border border-[color:var(--gb-border)]/60 px-3 py-2 text-sm text-[var(--gb-text)] hover:border-[color:var(--gb-accent)]/70">
                      New chat
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="text-sm text-[color:var(--gb-subtle)]">Conversations will appear here</div>
                  </div>
                  <div className="border-t border-[color:var(--gb-border)]/60 p-3 text-sm text-[color:var(--gb-subtle)]">
                    Model: (coming soon)
                  </div>
                </div>
              </aside>

              {/* CONTENT COLUMN — children control their own scroll/composer */}
              <main className="flex min-w-0 flex-1 flex-col bg-[var(--gb-bg)]">
                {children}
              </main>
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}