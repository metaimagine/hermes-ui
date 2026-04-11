import { NextResponse } from "next/server";
import { saveConfigParsed } from "@/lib/hermes/server";

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { parsed?: Record<string, unknown> };
    if (!body.parsed || typeof body.parsed !== "object" || Array.isArray(body.parsed)) {
      return NextResponse.json({ error: "Missing parsed config object." }, { status: 400 });
    }
    const snapshot = await saveConfigParsed(body.parsed);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save structured config." },
      { status: 400 },
    );
  }
}
