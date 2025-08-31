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
    const endpoint =
      process.env.DIFY_ENDPOINT || "https://api.dify.ai/v1/chat-messages";

    // Use only the latest user message for now (simple MVP).
    const last = messages[messages.length - 1];

    const difyRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: last.content,
        user: userId || "anon",
        response_mode: "blocking",
      }),
    });

    if (!difyRes.ok) {
      const t = await difyRes.text();
      return NextResponse.json({ error: "Dify error", detail: t }, { status: 500 });
    }

    const data = await difyRes.json();
    const text = data.answer ?? data.output_text ?? JSON.stringify(data);
    return NextResponse.json({ reply: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}