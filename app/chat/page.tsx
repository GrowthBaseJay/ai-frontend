import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-4">
      <ChatClient userId={userId} />
    </div>
  );
}