// app/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth(); // <-- await it

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main style={{ maxWidth: 720, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>Welcome to GrowthBase AI</h1>
      <p>You’re signed in.</p>
    </main>
  );
}