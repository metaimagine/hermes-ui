export type NavItem = {
  href: string;
  label: string;
  short: string;
  description: string;
};

export type OverviewData = {
  generatedAt: string;
  environment: {
    hermesHome: string;
    model: string;
    provider: string;
    gatewayLoaded: boolean;
    gatewayManager: string;
  };
  counts: {
    sessions: number;
    approvedUsers: number;
    pendingApprovals: number;
    installedSkillCategories: number;
    cronArtifacts: number;
    memoryEntries: number;
  };
  sessions: SessionRecord[];
  approvals: ApprovalSnapshot;
  skills: SkillsSnapshot;
  memory: MemorySnapshot;
};

export type SessionRecord = {
  sessionKey: string;
  sessionId: string;
  platform: string;
  chatType: string;
  displayName: string | null;
  updatedAt: string;
  createdAt: string;
  lastPromptTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  originUserId: string | null;
};

export type ConfigSnapshot = {
  raw: string;
  parsed: Record<string, unknown>;
  topLevelKeys: string[];
};

export type MemoryEntry = {
  scope: string;
  text: string;
};

export type MemorySnapshot = {
  entries: MemoryEntry[];
  raw: string;
};

export type SkillCategory = {
  name: string;
  skillCount: number;
  sampleSkills: string[];
};

export type SkillsSnapshot = {
  categories: SkillCategory[];
  totalCategories: number;
};

export type ApprovalRecord = {
  platform: string;
  userId: string;
  userName?: string;
  approvedAt?: number;
  createdAt?: number;
  code?: string;
  state: "approved" | "pending";
};

export type ApprovalSnapshot = {
  approved: ApprovalRecord[];
  pending: ApprovalRecord[];
};

export type CronSnapshot = {
  statusText: string;
  jobsText: string;
  artifactFiles: string[];
};

export type ChatRequest = {
  prompt: string;
  imagePath?: string;
  model?: string;
  toolsets?: string;
  skills?: string;
  provider?: string;
  verbose?: boolean;
  quiet?: boolean;
  resumeSessionId?: string;
  continueSessionName?: string;
  worktree?: boolean;
  checkpoints?: boolean;
  maxTurns?: number;
  yolo?: boolean;
  passSessionId?: boolean;
  source?: string;
};

export type ChatResponse = {
  stdout: string;
  stderr: string;
  exitCode: number;
  finalText: string;
  sessionId?: string;
  commandArgs: string[];
};

export type ChatHistoryTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  sessionId: string;
  source: "session-file";
};

export type ChatHistorySnapshot = {
  sessionId: string;
  turns: ChatHistoryTurn[];
};
