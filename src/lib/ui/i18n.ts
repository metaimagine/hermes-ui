import { cookies } from "next/headers";

export type Lang = "zh" | "en";
export type ThemeMode = "dark" | "light";

export type ShellMessages = {
  projectEyebrow: string;
  productSubtitle: string;
  localOnly: string;
  workspaceEyebrow: string;
  workspaceTitle: string;
  backendRoutes: string;
  noAuth: string;
};

export type NavMessages = {
  label: string;
  short: string;
};

export type UiMessages = {
  shell: ShellMessages;
  common: {
    liveTriage: string;
    showing: string;
    of: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    healthy: string;
    clear: string;
    saved: string;
    unsavedChanges: string;
    yamlValid: string;
    yamlInvalid: string;
    saveConfig: string;
    saving: string;
    revert: string;
    dark: string;
    light: string;
    chinese: string;
    english: string;
  };
  nav: Record<string, NavMessages>;
  pages: Record<string, Record<string, string>>;
};

const zh: UiMessages = {
  shell: {
    projectEyebrow: "独立项目",
    productSubtitle: "Hermes Agent 运维驾驶舱",
    localOnly: "仅限 127.0.0.1",
    workspaceEyebrow: "Hermes 本地工作区",
    workspaceTitle: "管理后台优先控制面",
    backendRoutes: "本地后端路由",
    noAuth: "无登录 · 仅本机",
  },
  common: {
    liveTriage: "实时分诊",
    showing: "显示",
    of: "共",
    justNow: "刚刚",
    minutesAgo: "分钟前",
    hoursAgo: "小时前",
    daysAgo: "天前",
    healthy: "健康",
    clear: "清空",
    saved: "已保存",
    unsavedChanges: "有未保存修改",
    yamlValid: "YAML 有效",
    yamlInvalid: "YAML 无效",
    saveConfig: "保存配置",
    saving: "保存中…",
    revert: "回退",
    dark: "深色",
    light: "浅色",
    chinese: "中文",
    english: "English",
  },
  nav: {
    dashboard: { label: "总览", short: "运行态势、分诊队列、整体姿态" },
    config: { label: "配置", short: "安全编辑 config.yaml" },
    sessions: { label: "会话", short: "近期会话与活动" },
    memory: { label: "记忆", short: "查看持久记忆" },
    skills: { label: "技能", short: "本地技能分类与覆盖" },
    cron: { label: "定时任务", short: "任务与调度器状态" },
    approvals: { label: "审批", short: "DM 配对与授权状态" },
    chat: { label: "聊天", short: "次级本地命令面板" },
  },
  pages: {
    dashboard: {
      eyebrow: "运行态势",
      title: "Hermes 控制驾驶舱",
      description: "先看健康度、会话压力、授权状态和调度器，再深入具体页面处理。",
      posture: "运行姿态",
      systemHealth: "系统健康",
      gateway: "网关",
      approvals: "审批",
      sessions: "会话",
      updated: "更新时间",
      manager: "管理器",
      trustedUsers: "已信任用户",
      noHeavyPressure: "当前没有明显上下文压力",
      highPromptLoad: "高 Prompt 负载",
      tracked: "已跟踪",
      memoryEntries: "记忆条目",
      skillCategories: "技能分类",
      cronArtifacts: "调度产物",
      environment: "环境",
      attentionQueue: "关注队列",
      recentSessions: "近期会话",
      trustState: "信任状态",
      hermesHome: "Hermes 目录",
      model: "模型",
      provider: "提供商",
      loaded: "已加载",
      notLoaded: "未加载",
      trustAndAccess: "授权与访问请求",
      recentActiveIndex: "最近活跃会话索引",
      durableUserContext: "持久用户上下文",
      shown: "已展示",
      identity: "身份",
      platform: "平台",
      status: "状态",
      promptLoad: "Prompt 负载",
      active: "活跃",
      approvedUsers: "已批准用户",
      pendingApprovals: "待处理审批",
      gatewayLoaded: "网关已加载",
    },
    config: {
      eyebrow: "配置",
      title: "配置编辑器",
      description: "先做真实可用的配置管理，再逐步加结构化表单。",
      topLevelKeys: "顶层键数",
      primaryModel: "主模型",
      provider: "提供商",
      rawEditor: "原始配置编辑器",
      editorDescription: "直接编辑真实的 ~/.hermes/config.yaml。当前版本已支持 dirty state、校验和回退语义。",
      liveFile: "真实文件 · 仅本机 · 原始 YAML 模式",
      saveHint: "下一轮可补 Ctrl/Cmd+S。",
      savedToDisk: "已保存到 ~/.hermes/config.yaml",
      reverted: "已回退未保存修改。",
      configMustBeObject: "配置 YAML 顶层必须是对象。",
    },
    sessions: {
      eyebrow: "会话",
      title: "会话浏览器",
      description: "跨平台查看近期和活跃会话，快速发现高负载、近期活动和问题会话。",
      trackedSessions: "已跟踪会话",
      highLoadSessions: "高负载会话",
      promptTokensTotal: "Prompt token 总量",
      searchPlaceholder: "按会话 ID、用户、平台搜索",
      allPlatforms: "所有平台",
      sortUpdated: "排序：最近更新",
      sortTokens: "排序：Prompt tokens",
      sortPlatform: "排序：平台",
      browserTitle: "会话列表",
      session: "会话",
      status: "状态",
      platform: "平台",
      lastActivity: "最后活动",
      promptLoad: "Prompt 负载",
      noMatch: "当前筛选条件下没有会话。",
      highLoad: "高负载",
      healthy: "正常",
      promptTokens: "prompt tokens",
    },
    memory: {
      eyebrow: "记忆",
      title: "持久用户记忆",
      description: "先展示 Hermes 真实存储的 USER.md，再逐步扩展更丰富的记忆视图。",
      entries: "条目",
      rawFile: "原始文件",
      noEntries: "未找到记忆条目。",
      noRaw: "未找到 USER.md 内容。",
    },
    skills: {
      eyebrow: "技能",
      title: "已安装技能分类",
      description: "先做可靠的技能盘点和覆盖视图，再扩展到运行、搜索和安装工作流。",
    },
    cron: {
      eyebrow: "调度器",
      title: "Cron 任务与产物",
      description: "把调度器健康、任务清单和输出产物放在一个管理页里。",
      schedulerStatus: "调度器状态",
      jobs: "任务",
      artifactFiles: "产物文件",
      noArtifacts: "暂时没有 cron 产物。",
    },
    approvals: {
      eyebrow: "信任与审批",
      title: "配对审批",
      description: "把待处理配对请求和已批准身份作为运维基础设施来管理。",
      pending: "待处理",
      approved: "已批准",
      noPending: "当前没有待处理配对请求。",
      noApproved: "当前没有已批准身份。",
      code: "验证码",
    },
    chat: {
      eyebrow: "次级界面",
      title: "本地聊天",
      description: "聊天存在，但故意放在管理面之后；这里更像本地命令面板，不是产品主首页。",
      consoleTitle: "本地 Hermes CLI 提问",
      consoleDescription: "当前通过 hermes chat -q ... -Q --source tool 走本地命令调用。",
      placeholder: "给 Hermes 发一句话…",
      noOutput: "暂时还没有输出。",
      localWorkflow: "无浏览器登录，仅本地工作流。",
      commandOutput: "命令输出",
      send: "发送",
      running: "运行中…",
    },
  },
};

const en: UiMessages = {
  shell: {
    projectEyebrow: "Independent project",
    productSubtitle: "Operator cockpit for Hermes Agent",
    localOnly: "127.0.0.1 only",
    workspaceEyebrow: "Hermes local workspace",
    workspaceTitle: "Management-first control surface",
    backendRoutes: "Local backend routes",
    noAuth: "No auth · local only",
  },
  common: {
    liveTriage: "Live triage",
    showing: "Showing",
    of: "of",
    justNow: "just now",
    minutesAgo: "m ago",
    hoursAgo: "h ago",
    daysAgo: "d ago",
    healthy: "Healthy",
    clear: "Clear",
    saved: "Saved",
    unsavedChanges: "Unsaved changes",
    yamlValid: "YAML valid",
    yamlInvalid: "YAML invalid",
    saveConfig: "Save config",
    saving: "Saving…",
    revert: "Revert",
    dark: "Dark",
    light: "Light",
    chinese: "中文",
    english: "English",
  },
  nav: {
    dashboard: { label: "Dashboard", short: "Ops overview, triage queue, runtime posture" },
    config: { label: "Config", short: "Edit config.yaml safely" },
    sessions: { label: "Sessions", short: "Recent sessions and activity" },
    memory: { label: "Memory", short: "Inspect durable memory" },
    skills: { label: "Skills", short: "Installed skill categories" },
    cron: { label: "Cron", short: "Jobs and scheduler state" },
    approvals: { label: "Approvals", short: "DM approvals and trust state" },
    chat: { label: "Chat", short: "Secondary local command surface" },
  },
  pages: {
    dashboard: {
      eyebrow: "Operations",
      title: "Hermes control cockpit",
      description: "Start with health, session pressure, approvals, and scheduler state before diving into individual surfaces.",
      posture: "Operational posture",
      systemHealth: "System health",
      gateway: "Gateway",
      approvals: "Approvals",
      sessions: "Sessions",
      updated: "Updated",
      manager: "Manager",
      trustedUsers: "Trusted users",
      noHeavyPressure: "No abnormal context pressure detected",
      highPromptLoad: "High prompt load",
      tracked: "tracked",
      memoryEntries: "Memory entries",
      skillCategories: "Skill categories",
      cronArtifacts: "Cron artifacts",
      environment: "Environment",
      attentionQueue: "Attention queue",
      recentSessions: "Recent sessions",
      trustState: "Trust state",
      hermesHome: "Hermes home",
      model: "Model",
      provider: "Provider",
      loaded: "Loaded",
      notLoaded: "Not loaded",
      trustAndAccess: "Trust and access requests",
      recentActiveIndex: "Recent active session index",
      durableUserContext: "Durable user context loaded",
      shown: "shown",
      identity: "Identity",
      platform: "Platform",
      status: "Status",
      promptLoad: "Prompt load",
      active: "active",
      approvedUsers: "Approved users",
      pendingApprovals: "Pending approvals",
      gatewayLoaded: "gateway loaded",
    },
    config: {
      eyebrow: "Configuration",
      title: "Config editor",
      description: "Start with honest raw config access, then layer structured field editors where they add real value.",
      topLevelKeys: "Top-level keys",
      primaryModel: "Primary model",
      provider: "Provider",
      rawEditor: "Raw config editor",
      editorDescription: "Editing the real ~/.hermes/config.yaml. This version exposes dirty state, validation, and revert semantics instead of pretending raw edits are risk-free.",
      liveFile: "Live file · local only · raw YAML mode",
      saveHint: "Ctrl/Cmd+S support can come in the next pass.",
      savedToDisk: "Config saved to ~/.hermes/config.yaml",
      reverted: "Reverted unsaved changes.",
      configMustBeObject: "Config YAML must parse to an object.",
    },
    sessions: {
      eyebrow: "Sessions",
      title: "Sessions browser",
      description: "Monitor and triage active and recent sessions across platforms. This should help you spot pressure, sort by activity, and find problem sessions fast.",
      trackedSessions: "Tracked sessions",
      highLoadSessions: "High-load sessions",
      promptTokensTotal: "Prompt tokens total",
      searchPlaceholder: "Search by session id, user, platform",
      allPlatforms: "All platforms",
      sortUpdated: "Sort: last updated",
      sortTokens: "Sort: prompt tokens",
      sortPlatform: "Sort: platform",
      browserTitle: "Session browser",
      session: "Session",
      status: "Status",
      platform: "Platform",
      lastActivity: "Last activity",
      promptLoad: "Prompt load",
      noMatch: "No sessions match the current filters.",
      highLoad: "high load",
      healthy: "healthy",
      promptTokens: "prompt tokens",
    },
    memory: {
      eyebrow: "Memory",
      title: "Durable user memory",
      description: "Show what Hermes actually stores today in USER.md before inventing richer memory abstractions.",
      entries: "Entries",
      rawFile: "Raw file",
      noEntries: "No memory entries found.",
      noRaw: "No USER.md content found.",
    },
    skills: {
      eyebrow: "Skills",
      title: "Installed skill categories",
      description: "Start with a reliable inventory of what exists locally, then expand toward running, searching, and installing skills.",
    },
    cron: {
      eyebrow: "Scheduler",
      title: "Cron jobs and artifacts",
      description: "Put scheduler health, job listings, and output artifacts in one management-first surface.",
      schedulerStatus: "Scheduler status",
      jobs: "Jobs",
      artifactFiles: "Artifact files",
      noArtifacts: "No cron output artifacts yet.",
    },
    approvals: {
      eyebrow: "Trust & approvals",
      title: "Pairing approvals",
      description: "Treat pending pairing and approved identities as operational trust infrastructure.",
      pending: "Pending",
      approved: "Approved",
      noPending: "No pending pairing requests.",
      noApproved: "No approved identities yet.",
      code: "code",
    },
    chat: {
      eyebrow: "Secondary surface",
      title: "Local chat",
      description: "Chat exists, but it is deliberately subordinate to the management workflow in this first release.",
      consoleTitle: "Local Hermes CLI prompt",
      consoleDescription: "This currently shells out through hermes chat -q ... -Q --source tool.",
      placeholder: "Ask Hermes something…",
      noOutput: "No output yet.",
      localWorkflow: "No browser auth. Local-only workflow.",
      commandOutput: "Command output",
      send: "Send",
      running: "Running…",
    },
  },
};

const dictionaries: Record<Lang, UiMessages> = { zh, en };

export function getMessages(lang: Lang) {
  return dictionaries[lang];
}

export async function getUiPrefs() {
  const cookieStore = await cookies();
  const langValue = cookieStore.get("hermes-ui-lang")?.value;
  const themeValue = cookieStore.get("hermes-ui-theme")?.value;
  const lang: Lang = langValue === "en" ? "en" : "zh";
  const theme: ThemeMode = themeValue === "light" ? "light" : "dark";
  return { lang, theme, messages: getMessages(lang) };
}
