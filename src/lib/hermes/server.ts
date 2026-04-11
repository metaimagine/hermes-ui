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
  ChatResponse,
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

export async function runLocalChat(query: string): Promise<ChatResponse> {
  const result = await runHermes(["chat", "-q", query, "-Q", "--source", "tool"]);
  return result;
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
