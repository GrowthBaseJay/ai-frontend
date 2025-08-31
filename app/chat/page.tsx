import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main style={{ maxWidth: 880, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>GrowthBase AI</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        Protected area — you’re signed in. (We’ll put the chatbot UI here next.)
      </p>

      <div style={{
        border: "1px solid #333", borderRadius: 12, padding: 16,
        minHeight: 360, display: "grid", placeItems: "center"
      }}>
        <span>Chat placeholder</span>
      </div>
    </main>
  );
}