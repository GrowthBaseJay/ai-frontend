export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>🚀 GrowthBase AI</h1>
      <p>If you’re seeing this at <strong>ai.growthbase.io</strong>, DNS + hosting are working.</p>
    </main>
  );
}
// app/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  // What signed-in users see (can be your chat later)
  return (
    <main style={{ maxWidth: 720, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>Welcome to GrowthBase AI</h1>
      <p>You’re signed in.</p>
    </main>
  );
}
