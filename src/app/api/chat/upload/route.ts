import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function extensionFor(type: string, fallbackName: string) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  const ext = path.extname(fallbackName);
  return ext || ".img";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported image type: ${file.type || "unknown"}` }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: `Image size must be between 1 byte and ${MAX_IMAGE_BYTES} bytes.` }, { status: 400 });
  }

  const uploadDir = path.join(os.homedir(), ".hermes", "tmp", "chat-uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = extensionFor(file.type, file.name);
  const outPath = path.join(uploadDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(outPath, bytes);

  return NextResponse.json({ path: outPath, name: file.name, type: file.type, size: file.size });
}
