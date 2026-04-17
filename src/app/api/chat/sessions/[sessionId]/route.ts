import { NextResponse } from "next/server";
import { getChatHistory } from "@/lib/hermes/server";

export async function GET(_: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  if (!sessionId?.trim()) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const history = await getChatHistory(sessionId.trim());
  return NextResponse.json(history);
}
