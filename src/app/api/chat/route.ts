import { NextResponse } from "next/server";
import { runLocalChat } from "@/lib/hermes/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string };
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required.", stdout: "", stderr: "", exitCode: 1 }, { status: 400 });
  }
  const result = await runLocalChat(body.prompt);
  return NextResponse.json(result, { status: result.exitCode === 0 ? 200 : 500 });
}
