import { NextResponse } from "next/server";
import { runLocalChat } from "@/lib/hermes/server";
import type { ChatRequest } from "@/lib/hermes/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ChatRequest>;
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required.", stdout: "", stderr: "", exitCode: 1, finalText: "", commandArgs: [] }, { status: 400 });
  }

  const result = await runLocalChat({
    prompt: body.prompt,
    imagePath: body.imagePath,
    model: body.model,
    toolsets: body.toolsets,
    skills: body.skills,
    provider: body.provider,
    verbose: body.verbose,
    quiet: body.quiet,
    resumeSessionId: body.resumeSessionId,
    continueSessionName: body.continueSessionName,
    worktree: body.worktree,
    checkpoints: body.checkpoints,
    maxTurns: body.maxTurns,
    yolo: body.yolo,
    passSessionId: body.passSessionId,
    source: body.source,
  });

  return NextResponse.json(result, { status: result.exitCode === 0 ? 200 : 500 });
}
