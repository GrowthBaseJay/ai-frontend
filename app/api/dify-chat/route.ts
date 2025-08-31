// app/api/dify-chat/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, userId } = body as {
      messages: { role: "user" | "assistant" | "system"; content: string }[];
      userId?: string;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const apiKey = process.env.DIFY_API_KEY!;
    const endpoint = process.env.DIFY_ENDPOINT || "https://api.dify.ai/v1/chat-messages";

    // Send only the latest user message as the query (simplest good version).
    // You can upgrade to pass message history via "inputs" later.
    const last = messages[messages.length - 1];

    const difyRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},                 // optional structured inputs to your Dify app
        query: last.content,        // the user's latest message
        user: userId || "anon",     // per-user identity for Dify
        response_mode: "blocking",  // simplest (non-streaming)
      }),
    });

    if (!difyRes.ok) {
      const t = await difyRes.text();
      return NextResponse.json({ error: "Dify error", detail: t }, { status: 500 });
    }

    const data = await difyRes.json();
    // Dify "blocking" returns an object with "answer" (and possibly "output_text")
    const text = data.answer ?? data.output_text ?? JSON.stringify(data);

    return NextResponse.json({ reply: text });
// ...rest of file above stays the same
} catch (err) {
  const message = err instanceof Error ? err.message : "Server error";
  return NextResponse.json({ error: message }, { status: 500 });
}