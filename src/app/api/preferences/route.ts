import { NextResponse } from "next/server";
import type { Lang, ThemeMode } from "@/lib/ui/i18n";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; value?: string };
  const response = NextResponse.json({ ok: true });

  if (body.name === "lang") {
    const value: Lang = body.value === "en" ? "en" : "zh";
    response.cookies.set("hermes-ui-lang", value, { path: "/", sameSite: "lax" });
    return response;
  }

  if (body.name === "theme") {
    const value: ThemeMode = body.value === "light" ? "light" : "dark";
    response.cookies.set("hermes-ui-theme", value, { path: "/", sameSite: "lax" });
    return response;
  }

  return NextResponse.json({ error: "Unknown preference" }, { status: 400 });
}
