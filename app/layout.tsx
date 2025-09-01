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
          <div className="flex h-dvh flex-col">
            {/* HEADER (56px tall) */}
            <header className="sticky top-0 z-50 border-b border-[color:var(--gb-border)]/60 bg-[var(--gb-bg)]">
              <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium tracking-tight">GrowthBase AI</span>
                </div>
                <div className="mx-auto" />
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
              {/* SIDEBAR: sticky to viewport below the header */}
              <aside className="hidden lg:block w-72 shrink-0">
                <div className="sticky top-14 h-[calc(100dvh-56px)] border-r border-[color:var(--gb-border)]/60 bg-[var(--gb-bg)]">
                  {/* column layout with sticky header/footer areas and scrollable middle */}
                  <div className="flex h-full flex-col">
                    {/* Top (sticky by virtue of parent not scrolling) */}
                    <div className="border-b border-[color:var(--gb-border)]/60 p-3">
                      <button className="w-full rounded-md border border-[color:var(--gb-border)]/60 px-3 py-2 text-sm text-[var(--gb-text)] hover:border-[color:var(--gb-accent)]/70">
                        New chat
                      </button>
                    </div>

                    {/* Middle list (scrolls) */}
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                      <div className="text-sm text-[color:var(--gb-subtle)]">
                        Conversations will appear here
                      </div>
                    </div>

                    {/* Bottom */}
                    <div className="border-t border-[color:var(--gb-border)]/60 p-3 text-sm text-[color:var(--gb-subtle)]">
                      Model: (coming soon)
                    </div>
                  </div>
                </div>
              </aside>

              {/* CONTENT COLUMN */}
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