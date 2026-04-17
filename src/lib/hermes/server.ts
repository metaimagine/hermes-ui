import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import YAML from "yaml";
import type {
  ApprovalRecord,
  ApprovalSnapshot,
  ConfigSnapshot,
  CronSnapshot,
  MemorySnapshot,
  OverviewData,
  SessionRecord,
  SkillsSnapshot,
  ChatRequest,
  ChatResponse,
  ChatHistorySnapshot,
  ChatHistoryTurn,
} from "./types";

type SessionIndexEntry = {
  session_key?: string;
  session_id?: string;
  platform?: string;
  chat_type?: string;
  display_name?: string | null;
  updated_at?: string;
  created_at?: string;
  last_prompt_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  origin?: { user_id?: string | null };
};

type PairingMeta = {
  user_id?: string;
  user_name?: string;
  approved_at?: number;
  created_at?: number;
};

function getModelInfo(parsed: Record<string, unknown>) {
  const model = parsed.model;
  if (!model || typeof model !== "object") {
    return { defaultModel: "unknown", provider: "unknown" };
  }
  const data = model as Record<string, unknown>;
  return {
    defaultModel: typeof data.default === "string" ? data.default : "unknown",
    provider: typeof data.provider === "string" ? data.provider : "unknown",
  };
}

const execFileAsync = promisify(execFile);
const HOME = os.homedir();
const HERMES_HOME = path.join(HOME, ".hermes");
const HERMES_REPO = path.join(HOME, "Projects", "hermes-agent");
const HERMES_BIN = path.join(HERMES_REPO, "venv", "bin", "hermes");

async function readText(filePath: string, fallback = "") {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return fallback;
  }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function listDir(dirPath: string) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

export async function getConfigSnapshot(): Promise<ConfigSnapshot> {
  const raw = await readText(path.join(HERMES_HOME, "config.yaml"), "");
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (YAML.parse(raw) || {}) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  return {
    raw,
    parsed,
    topLevelKeys: Object.keys(parsed),
  };
}

export async function saveConfigRaw(raw: string) {
  const parsed = YAML.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Config YAML must parse to an object.");
  }
  await fs.writeFile(path.join(HERMES_HOME, "config.yaml"), raw, "utf8");
  return getConfigSnapshot();
}

export async function saveConfigParsed(parsed: Record<string, unknown>) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Parsed config must be an object.");
  }
  const raw = YAML.stringify(parsed, {
    indent: 2,
    lineWidth: 0,
    minContentWidth: 0,
  });
  await fs.writeFile(path.join(HERMES_HOME, "config.yaml"), raw, "utf8");
  return getConfigSnapshot();
}

export async function getSessions(): Promise<SessionRecord[]> {
  const sessions = await readJson<Record<string, SessionIndexEntry>>(path.join(HERMES_HOME, "sessions", "sessions.json"), {});
  return Object.values(sessions)
    .map((entry) => ({
      sessionKey: entry.session_key ?? "",
      sessionId: entry.session_id ?? "",
      platform: entry.platform ?? "unknown",
      chatType: entry.chat_type ?? "unknown",
      displayName: entry.display_name ?? null,
      updatedAt: entry.updated_at ?? "",
      createdAt: entry.created_at ?? "",
      lastPromptTokens: Number(entry.last_prompt_tokens ?? 0),
      totalTokens: Number(entry.total_tokens ?? 0),
      estimatedCostUsd: Number(entry.estimated_cost_usd ?? 0),
      originUserId: entry.origin?.user_id ?? null,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getMemorySnapshot(): Promise<MemorySnapshot> {
  const raw = await readText(path.join(HERMES_HOME, "memories", "USER.md"), "");
  const normalized = raw.replace(/\r\n/g, "\n");
  const entries = normalized
    .split(/\n?§\n?/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((chunk) => chunk.split("\n").map((line) => line.trim()).filter(Boolean))
    .map((text) => ({ scope: "user", text }));
  return { raw, entries };
}

export async function getSkillsSnapshot(): Promise<SkillsSnapshot> {
  const skillRoot = path.join(HERMES_HOME, "skills");
  const categories = await listDir(skillRoot);
  const rows = [] as SkillsSnapshot["categories"];
  for (const category of categories) {
    if (!category.isDirectory() || category.name.startsWith(".")) continue;
    const categoryPath = path.join(skillRoot, category.name);
    const items = await listDir(categoryPath);
    const skillDirs = items.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    rows.push({
      name: category.name,
      skillCount: skillDirs.length,
      sampleSkills: skillDirs.slice(0, 4),
    });
  }
  rows.sort((a, b) => b.skillCount - a.skillCount || a.name.localeCompare(b.name));
  return { categories: rows, totalCategories: rows.length };
}

export async function getApprovalSnapshot(): Promise<ApprovalSnapshot> {
  const pairingDir = path.join(HERMES_HOME, "pairing");
  const files = await listDir(pairingDir);
  const approved: ApprovalRecord[] = [];
  const pending: ApprovalRecord[] = [];
  for (const entry of files) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const fullPath = path.join(pairingDir, entry.name);
    const data = await readJson<Record<string, PairingMeta>>(fullPath, {});
    if (entry.name.endsWith('-approved.json')) {
      const platform = entry.name.replace('-approved.json', '');
      for (const [userId, meta] of Object.entries(data)) {
        approved.push({
          platform,
          userId,
          userName: meta?.user_name,
          approvedAt: meta?.approved_at,
          state: 'approved',
        });
      }
    }
    if (entry.name.endsWith('-pending.json')) {
      const platform = entry.name.replace('-pending.json', '');
      for (const [code, meta] of Object.entries(data)) {
        pending.push({
          platform,
          userId: meta?.user_id ?? '',
          userName: meta?.user_name,
          createdAt: meta?.created_at,
          code,
          state: 'pending',
        });
      }
    }
  }
  approved.sort((a, b) => (b.approvedAt ?? 0) - (a.approvedAt ?? 0));
  pending.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return { approved, pending };
}

async function runHermes(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(HERMES_BIN, args, {
      cwd: HERMES_REPO,
      env: { ...process.env },
      timeout: 180_000,
      maxBuffer: 1024 * 1024 * 5,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}

export async function getCronSnapshot(): Promise<CronSnapshot> {
  const status = await runHermes(["cron", "status"]);
  const jobs = await runHermes(["cron", "list"]);
  const artifactDir = path.join(HERMES_HOME, "cron", "output");
  const artifacts = (await listDir(artifactDir)).filter((entry) => entry.isFile()).map((entry) => entry.name).sort().reverse();
  return {
    statusText: status.stdout || status.stderr,
    jobsText: jobs.stdout || jobs.stderr,
    artifactFiles: artifacts,
  };
}

function buildChatArgs(request: ChatRequest) {
  const args = ["chat"] as string[];

  if (request.resumeSessionId?.trim()) {
    args.push("--resume", request.resumeSessionId.trim());
  } else if (typeof request.continueSessionName === "string") {
    const value = request.continueSessionName.trim();
    args.push("--continue");
    if (value) {
      args.push(value);
    }
  }

  args.push("-q", request.prompt.trim());

  if (request.imagePath?.trim()) args.push("--image", request.imagePath.trim());
  if (request.model?.trim()) args.push("--model", request.model.trim());
  if (request.toolsets?.trim()) args.push("--toolsets", request.toolsets.trim());
  if (request.skills?.trim()) args.push("--skills", request.skills.trim());
  if (request.provider?.trim()) args.push("--provider", request.provider.trim());
  if (request.verbose) args.push("--verbose");
  if (request.quiet !== false) args.push("--quiet");
  if (request.worktree) args.push("--worktree");
  if (request.checkpoints) args.push("--checkpoints");
  if (typeof request.maxTurns === "number" && Number.isFinite(request.maxTurns) && request.maxTurns > 0) {
    args.push("--max-turns", String(Math.trunc(request.maxTurns)));
  }
  if (request.yolo) args.push("--yolo");
  if (request.passSessionId) args.push("--pass-session-id");
  args.push("--source", request.source?.trim() || "tool");

  return args;
}

function stripAnsi(text: string) {
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");
}

function collapseRepeatedPrefix(lines: string[]) {
  const trimmed = [...lines];
  for (let size = Math.floor(trimmed.length / 2); size >= 3; size -= 1) {
    const first = trimmed.slice(0, size).join("\n");
    const second = trimmed.slice(size, size * 2).join("\n");
    if (first && first === second) {
      return trimmed.slice(size);
    }
  }
  return trimmed;
}

function normalizeChatOutput(stdout: string) {
  const normalized = stripAnsi(stdout).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const sessionMatch = normalized.match(/(?:^|\n)session_id:\s*([^\s]+)\s*$/m);
  const sessionId = sessionMatch?.[1];
  const withoutSession = normalized.replace(/(?:^|\n)session_id:\s*([^\s]+)\s*$/gm, "").trim();
  const filteredLines = collapseRepeatedPrefix(
    withoutSession
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim())
      .filter((line) => !/^\s*[╭╰│─].*$/.test(line))
      .filter((line) => !/^\s*⚕\s+Hermes.*$/.test(line))
      .filter((line) => !/^\s*⚠️\s+DANGEROUS COMMAND:/.test(line))
      .filter((line) => !/^\s*Choice \[o\/s\/a\/D\]:/.test(line))
      .filter((line) => !/^\s*\[o\]nce\s+\|/.test(line))
      .filter((line) => !/^\s*⏱\s+Timeout - denying command/.test(line))
      .filter((line) => !/^\s*(source venv\/bin\/activate|command -v hermes \|\| which hermes \|\| python -c)/.test(line)),
  );

  const paragraphs = filteredLines
    .join("\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const dedupedParagraphs: string[] = [];
  for (const paragraph of paragraphs) {
    if (dedupedParagraphs[dedupedParagraphs.length - 1] !== paragraph) {
      dedupedParagraphs.push(paragraph);
    }
  }

  return {
    sessionId,
    finalText: dedupedParagraphs.join("\n\n").trim(),
  };
}

function coerceTurnRole(role: unknown): "user" | "assistant" | null {
  if (role === "user" || role === "assistant") return role;
  if (role === "system" || role === "tool") return null;
  return null;
}

function extractTurnText(message: Record<string, unknown>) {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((item) => (item && typeof item === "object" && typeof (item as Record<string, unknown>).text === "string" ? (item as Record<string, unknown>).text : ""))
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

export async function getChatHistory(sessionId: string): Promise<ChatHistorySnapshot> {
  const filePath = path.join(HERMES_HOME, "sessions", `session_${sessionId}.json`);
  const data = await readJson<Record<string, unknown>>(filePath, {});
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const rawTurns: Array<ChatHistoryTurn | null> = messages.map((message, index) => {
    if (!message || typeof message !== "object") return null;
    const row = message as Record<string, unknown>;
    const role = coerceTurnRole(row.role);
    if (!role) return null;
    const text = extractTurnText(row).trim();
    if (!text) return null;
    return {
      id: `${sessionId}-${index}`,
      role,
      text,
      createdAt: typeof row.timestamp === "string" ? row.timestamp : undefined,
      sessionId,
      source: "session-file" as const,
    };
  });

  const turns = rawTurns.filter((turn): turn is ChatHistoryTurn => turn !== null);

  return { sessionId, turns };
}

export async function runLocalChat(request: ChatRequest): Promise<ChatResponse> {
  const commandArgs = buildChatArgs(request);
  const result = await runHermes(commandArgs);
  const parsed = normalizeChatOutput(result.stdout);
  return {
    ...result,
    finalText: parsed.finalText || result.stderr || "",
    sessionId: parsed.sessionId,
    commandArgs,
  };
}

export async function getOverviewData(): Promise<OverviewData> {
  const [config, sessions, approvals, skills, memory, cron, gatewayStatus] = await Promise.all([
    getConfigSnapshot(),
    getSessions(),
    getApprovalSnapshot(),
    getSkillsSnapshot(),
    getMemorySnapshot(),
    getCronSnapshot(),
    runHermes(["gateway", "status"]),
  ]);

  const modelInfo = getModelInfo(config.parsed);
  const gatewayText = `${gatewayStatus.stdout}\n${gatewayStatus.stderr}`;

  return {
    generatedAt: new Date().toISOString(),
    environment: {
      hermesHome: HERMES_HOME,
      model: modelInfo.defaultModel,
      provider: modelInfo.provider,
      gatewayLoaded: /loaded|running/i.test(gatewayText),
      gatewayManager: /launchd/i.test(gatewayText) ? 'launchd' : 'unknown',
    },
    counts: {
      sessions: sessions.length,
      approvedUsers: approvals.approved.length,
      pendingApprovals: approvals.pending.length,
      installedSkillCategories: skills.totalCategories,
      cronArtifacts: cron.artifactFiles.length,
      memoryEntries: memory.entries.length,
    },
    sessions: sessions.slice(0, 8),
    approvals,
    skills,
    memory,
  };
}
