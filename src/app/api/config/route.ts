import { NextResponse } from "next/server";
import { getConfigSnapshot, saveConfigRaw } from "@/lib/hermes/server";

export async function GET() {
  return NextResponse.json(await getConfigSnapshot());
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { raw?: string };
    if (!body.raw) {
      return NextResponse.json({ error: "Missing raw config body." }, { status: 400 });
    }
    const snapshot = await saveConfigRaw(body.raw);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save config." }, { status: 400 });
  }
}
