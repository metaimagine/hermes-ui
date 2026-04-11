"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { Lang } from "@/lib/ui/i18n";

type ConfigFormValues = {
  modelDefault: string;
  modelProvider: string;
  agentMaxTurns: number;
  agentReasoningEffort: string;
  displayPersonality: string;
  displaySkin: string;
  terminalBackend: string;
  memoryEnabled: boolean;
  userProfileEnabled: boolean;
  approvalsMode: string;
  sessionResetMode: string;
  sessionResetIdleMinutes: number;
  sessionResetAtHour: number;
  groupSessionsPerUser: boolean;
  streamingEnabled: boolean;
};

function copyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getString(source: Record<string, unknown>, key: string, fallback = "") {
  return typeof source[key] === "string" ? (source[key] as string) : fallback;
}

function getNumber(source: Record<string, unknown>, key: string, fallback = 0) {
  return typeof source[key] === "number" ? (source[key] as number) : fallback;
}

function getBoolean(source: Record<string, unknown>, key: string, fallback = false) {
  return typeof source[key] === "boolean" ? (source[key] as boolean) : fallback;
}

function labels(lang: Lang) {
  if (lang === "zh") {
    return {
      title: "结构化配置表单",
      copy: "优先用结构化字段配置 Hermes，减少 YAML 格式和字段名错误。只有高级场景再去编辑原始 YAML。",
      save: "保存结构化配置",
      saving: "保存中…",
      saved: "结构化配置已保存。",
      model: "模型与提供商",
      runtime: "运行时与显示",
      governance: "授权与会话",
      toggles: "开关项",
      modelDefault: "model.default",
      modelProvider: "model.provider",
      agentMaxTurns: "agent.max_turns",
      agentReasoningEffort: "agent.reasoning_effort",
      displayPersonality: "display.personality",
      displaySkin: "display.skin",
      terminalBackend: "terminal.backend",
      memoryEnabled: "memory.memory_enabled",
      userProfileEnabled: "memory.user_profile_enabled",
      approvalsMode: "approvals.mode",
      sessionResetMode: "session_reset.mode",
      sessionResetIdleMinutes: "session_reset.idle_minutes",
      sessionResetAtHour: "session_reset.at_hour",
      groupSessionsPerUser: "group_sessions_per_user",
      streamingEnabled: "streaming.enabled",
      safeNote: "这个表单只覆盖高频字段，能满足日常使用并显著降低配置写错的概率。",
      providerOptions: ["openai-codex", "openrouter", "anthropic", "nous", "gemini", "zai", "kimi-coding", "minimax", "minimax-cn", "auto"],
      reasoningOptions: ["none", "minimal", "low", "medium", "high", "xhigh"],
      backendOptions: ["local", "docker", "ssh", "modal", "daytona", "singularity"],
      approvalsOptions: ["manual", "auto"],
      resetOptions: ["both", "daily", "idle", "none"],
      personalitiesHint: "Use an existing config personality key.",
      descriptions: {
        modelDefault: "Primary model id used by default.",
        modelProvider: "Provider for the default model route.",
        agentMaxTurns: "Maximum tool-calling iterations per request.",
        agentReasoningEffort: "Reasoning budget for supported providers.",
        displayPersonality: "Persona key from config.personalities.",
        displaySkin: "CLI skin / shell presentation preset.",
        terminalBackend: "Execution backend for terminal commands.",
        approvalsMode: "Manual is safer for local operator workflows.",
        sessionResetMode: "How Hermes resets session context over time.",
        sessionResetIdleMinutes: "Idle timeout before automatic reset.",
        sessionResetAtHour: "Daily reset hour, local time, 0-23.",
        memoryEnabled: "Store durable environment memory.",
        userProfileEnabled: "Persist user preferences/profile notes.",
        groupSessionsPerUser: "Split group chat context by participant.",
        streamingEnabled: "Enable streaming output where supported.",
      },
    };
  }

  return {
    title: "Structured config form",
    copy: "Use structured controls for common Hermes settings first so routine edits do not depend on hand-editing YAML. Keep raw YAML for advanced overrides only.",
    save: "Save structured config",
    saving: "Saving…",
    saved: "Structured config saved.",
    model: "Model & provider",
    runtime: "Runtime & display",
    governance: "Approvals & sessions",
    toggles: "Feature toggles",
    modelDefault: "Default model",
    modelProvider: "Default provider",
    agentMaxTurns: "Max turns",
    agentReasoningEffort: "Reasoning effort",
    displayPersonality: "Personality",
    displaySkin: "Skin",
    terminalBackend: "Terminal backend",
    memoryEnabled: "Enable environment memory",
    userProfileEnabled: "Enable user profile",
    approvalsMode: "Dangerous command approvals",
    sessionResetMode: "Session reset mode",
    sessionResetIdleMinutes: "Idle reset minutes",
    sessionResetAtHour: "Daily reset hour",
    groupSessionsPerUser: "Per-user group session isolation",
    streamingEnabled: "Enable streaming",
    safeNote: "This form only covers the high-frequency fields that should not require hand-editing YAML in normal use.",
    providerOptions: ["openai-codex", "openrouter", "anthropic", "nous", "gemini", "zai", "kimi-coding", "minimax", "minimax-cn", "auto"],
    reasoningOptions: ["none", "minimal", "low", "medium", "high", "xhigh"],
    backendOptions: ["local", "docker", "ssh", "modal", "daytona", "singularity"],
    approvalsOptions: ["manual", "auto"],
    resetOptions: ["both", "daily", "idle", "none"],
    personalitiesHint: "Use an existing personality key from config.",
  };
}

function buildDefaults(parsed: Record<string, unknown>): ConfigFormValues {
  const model = getObject(parsed.model);
  const agent = getObject(parsed.agent);
  const display = getObject(parsed.display);
  const terminal = getObject(parsed.terminal);
  const memory = getObject(parsed.memory);
  const approvals = getObject(parsed.approvals);
  const sessionReset = getObject(parsed.session_reset);
  const streaming = getObject(parsed.streaming);

  return {
    modelDefault: getString(model, "default", ""),
    modelProvider: getString(model, "provider", "auto"),
    agentMaxTurns: getNumber(agent, "max_turns", 90),
    agentReasoningEffort: getString(agent, "reasoning_effort", "medium"),
    displayPersonality: getString(display, "personality", "helpful"),
    displaySkin: getString(display, "skin", "default"),
    terminalBackend: getString(terminal, "backend", "local"),
    memoryEnabled: getBoolean(memory, "memory_enabled", true),
    userProfileEnabled: getBoolean(memory, "user_profile_enabled", true),
    approvalsMode: getString(approvals, "mode", "manual"),
    sessionResetMode: getString(sessionReset, "mode", "both"),
    sessionResetIdleMinutes: getNumber(sessionReset, "idle_minutes", 1440),
    sessionResetAtHour: getNumber(sessionReset, "at_hour", 4),
    groupSessionsPerUser: typeof parsed.group_sessions_per_user === "boolean" ? (parsed.group_sessions_per_user as boolean) : true,
    streamingEnabled: getBoolean(streaming, "enabled", false),
  };
}

function mergeStructuredConfig(parsed: Record<string, unknown>, values: ConfigFormValues) {
  const next = copyObject(parsed);
  next.model = { ...getObject(next.model), default: values.modelDefault, provider: values.modelProvider };
  next.agent = {
    ...getObject(next.agent),
    max_turns: values.agentMaxTurns,
    reasoning_effort: values.agentReasoningEffort,
  };
  next.display = {
    ...getObject(next.display),
    personality: values.displayPersonality,
    skin: values.displaySkin,
  };
  next.terminal = {
    ...getObject(next.terminal),
    backend: values.terminalBackend,
  };
  next.memory = {
    ...getObject(next.memory),
    memory_enabled: values.memoryEnabled,
    user_profile_enabled: values.userProfileEnabled,
  };
  next.approvals = {
    ...getObject(next.approvals),
    mode: values.approvalsMode,
  };
  next.session_reset = {
    ...getObject(next.session_reset),
    mode: values.sessionResetMode,
    idle_minutes: Number(values.sessionResetIdleMinutes),
    at_hour: Number(values.sessionResetAtHour),
  };
  next.group_sessions_per_user = values.groupSessionsPerUser;
  next.streaming = {
    ...getObject(next.streaming),
    enabled: values.streamingEnabled,
  };
  return next;
}

export function ConfigStructuredForm({
  parsed,
  lang,
}: {
  parsed: Record<string, unknown>;
  lang: Lang;
}) {
  const copy = labels(lang);
  const descriptions = copy.descriptions ?? {
    modelDefault: "",
    modelProvider: "",
    agentMaxTurns: "",
    agentReasoningEffort: "",
    displayPersonality: "",
    displaySkin: "",
    terminalBackend: "",
    approvalsMode: "",
    sessionResetMode: "",
    sessionResetIdleMinutes: "",
    sessionResetAtHour: "",
    memoryEnabled: "",
    userProfileEnabled: "",
    groupSessionsPerUser: "",
    streamingEnabled: "",
  };
  const defaults = useMemo(() => buildDefaults(parsed), [parsed]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { isDirty } } = useForm<ConfigFormValues>({ defaultValues: defaults });

  const onSubmit = handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const merged = mergeStructuredConfig(parsed, values);
      const response = await fetch("/api/config/structured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed: merged }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to save structured config.");
        return;
      }
      setMessage(copy.saved);
      window.location.reload();
    });
  });

  return (
    <form className="card card-pad stack-lg" onSubmit={onSubmit}>
      <div className="row-between">
        <div>
          <h3 className="section-title">{copy.title}</h3>
          <p className="section-copy">{copy.copy}</p>
        </div>
        <button className="button-primary" disabled={isPending} type="submit">
          {isPending ? copy.saving : copy.save}
        </button>
      </div>

      <div className="inline-note">{copy.safeNote}</div>

      <section className="form-section-grid">
        <div className="form-card">
          <h4>{copy.model}</h4>
          <label className="field"><span>{copy.modelDefault}</span><input className="field-input" {...register("modelDefault")} /><small className="field-help">{descriptions.modelDefault}</small></label>
          <label className="field"><span>{copy.modelProvider}</span><select className="field-input" {...register("modelProvider")}>{copy.providerOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><small className="field-help">{descriptions.modelProvider}</small></label>
          <label className="field"><span>{copy.agentMaxTurns}</span><input className="field-input" type="number" {...register("agentMaxTurns", { valueAsNumber: true })} /><small className="field-help">{descriptions.agentMaxTurns}</small></label>
          <label className="field"><span>{copy.agentReasoningEffort}</span><select className="field-input" {...register("agentReasoningEffort")}>{copy.reasoningOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><small className="field-help">{descriptions.agentReasoningEffort}</small></label>
        </div>

        <div className="form-card">
          <h4>{copy.runtime}</h4>
          <label className="field"><span>{copy.displayPersonality}</span><input className="field-input" {...register("displayPersonality")} /><small className="field-help">{descriptions.displayPersonality}</small></label>
          <div className="inline-note">{copy.personalitiesHint}</div>
          <label className="field"><span>{copy.displaySkin}</span><input className="field-input" {...register("displaySkin")} /><small className="field-help">{descriptions.displaySkin}</small></label>
          <label className="field"><span>{copy.terminalBackend}</span><select className="field-input" {...register("terminalBackend")}>{copy.backendOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><small className="field-help">{descriptions.terminalBackend}</small></label>
        </div>

        <div className="form-card">
          <h4>{copy.governance}</h4>
          <label className="field"><span>{copy.approvalsMode}</span><select className="field-input" {...register("approvalsMode")}>{copy.approvalsOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><small className="field-help">{descriptions.approvalsMode}</small></label>
          <label className="field"><span>{copy.sessionResetMode}</span><select className="field-input" {...register("sessionResetMode")}>{copy.resetOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><small className="field-help">{descriptions.sessionResetMode}</small></label>
          <label className="field"><span>{copy.sessionResetIdleMinutes}</span><input className="field-input" type="number" {...register("sessionResetIdleMinutes", { valueAsNumber: true })} /><small className="field-help">{descriptions.sessionResetIdleMinutes}</small></label>
          <label className="field"><span>{copy.sessionResetAtHour}</span><input className="field-input" type="number" {...register("sessionResetAtHour", { valueAsNumber: true })} /><small className="field-help">{descriptions.sessionResetAtHour}</small></label>
        </div>

        <div className="form-card">
          <h4>{copy.toggles}</h4>
          <label className="checkbox-row"><input type="checkbox" {...register("memoryEnabled")} /><div><span>{copy.memoryEnabled}</span><small className="field-help">{descriptions.memoryEnabled}</small></div></label>
          <label className="checkbox-row"><input type="checkbox" {...register("userProfileEnabled")} /><div><span>{copy.userProfileEnabled}</span><small className="field-help">{descriptions.userProfileEnabled}</small></div></label>
          <label className="checkbox-row"><input type="checkbox" {...register("groupSessionsPerUser")} /><div><span>{copy.groupSessionsPerUser}</span><small className="field-help">{descriptions.groupSessionsPerUser}</small></div></label>
          <label className="checkbox-row"><input type="checkbox" {...register("streamingEnabled")} /><div><span>{copy.streamingEnabled}</span><small className="field-help">{descriptions.streamingEnabled}</small></div></label>
          <div className="inline-note">{isDirty ? "Draft differs from saved config." : "No unsaved structured changes."}</div>
        </div>
      </section>

      {message ? <div className="inline-note">{message}</div> : null}
    </form>
  );
}
