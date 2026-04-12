"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { ChatRequest, ChatResponse, SessionRecord } from "@/lib/hermes/types";
import type { UiMessages } from "@/lib/ui/i18n";

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  exitCode?: number;
  sessionId?: string;
  stderr?: string;
  stdout?: string;
  commandArgs?: string[];
  imagePath?: string;
};

type ChatOptions = Omit<ChatRequest, "prompt">;

type UploadedImage = {
  localName: string;
  uploadedPath: string;
  mimeType: string;
  size: number;
  previewUrl: string;
};

const providerOptions = [
  "auto",
  "openrouter",
  "nous",
  "openai-codex",
  "copilot-acp",
  "copilot",
  "anthropic",
  "gemini",
  "huggingface",
  "zai",
  "kimi-coding",
  "minimax",
  "minimax-cn",
  "kilocode",
] as const;

const defaultOptions: ChatOptions = {
  provider: "auto",
  quiet: true,
  source: "tool",
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTurnTime(iso: string) {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function truncateMiddle(value: string, keep = 8) {
  if (value.length <= keep * 2) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

function renderInlineParagraph(paragraph: string) {
  return <p className="rich-paragraph">{paragraph}</p>;
}

function renderTextSegment(segment: string) {
  const normalized = segment.trim();
  if (!normalized) return null;

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);

  return paragraphs.map((paragraph, index) => {
    const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;

    const bulletLines = lines.every((line) => /^[-*]\s+/.test(line));
    if (bulletLines) {
      return (
        <ul className="rich-list" key={`list-${index}`}>
          {lines.map((line, itemIndex) => <li key={`${index}-${itemIndex}`}>{line.replace(/^[-*]\s+/, "")}</li>)}
        </ul>
      );
    }

    const numberedLines = lines.every((line) => /^\d+[.)]\s+/.test(line));
    if (numberedLines) {
      return (
        <ol className="rich-list rich-ordered-list" key={`olist-${index}`}>
          {lines.map((line, itemIndex) => <li key={`${index}-${itemIndex}`}>{line.replace(/^\d+[.)]\s+/, "")}</li>)}
        </ol>
      );
    }

    return <div key={`para-${index}`}>{renderInlineParagraph(lines.join(" "))}</div>;
  });
}

function renderRichMessage(text: string) {
  const parts = text.split(/```([\s\S]*?)```/g);
  const blocks: ReactNode[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part?.trim()) continue;

    if (index % 2 === 1) {
      blocks.push(
        <pre className="rich-code-block" key={`code-${index}`}>
          <code>{part.trim()}</code>
        </pre>,
      );
      continue;
    }

    blocks.push(
      <div className="rich-text-stack" key={`text-${index}`}>
        {renderTextSegment(part)}
      </div>,
    );
  }

  return blocks.length ? blocks : <p className="rich-paragraph">{text}</p>;
}

export function ChatConsole({ messages, sessions }: { messages: UiMessages; sessions: SessionRecord[] }) {
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [options, setOptions] = useState<ChatOptions>(defaultOptions);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const t = messages.pages.chat as Record<string, string>;

  useEffect(() => {
    return () => {
      if (uploadedImage?.previewUrl) {
        URL.revokeObjectURL(uploadedImage.previewUrl);
      }
    };
  }, [uploadedImage]);

  const examples = useMemo(
    () => [
      t.exampleOne || "检查当前 Hermes 状态并给我一个简短摘要。",
      t.exampleTwo || "列出最近活跃会话，并指出最值得关注的一个。",
      t.exampleThree || "解释一下当前配置里的主模型和 provider。",
    ],
    [t],
  );

  const activeOptionPills = useMemo(() => {
    const pills: string[] = [];
    if (options.model?.trim()) pills.push(`model=${options.model.trim()}`);
    if (options.provider?.trim() && options.provider !== "auto") pills.push(`provider=${options.provider.trim()}`);
    if (options.toolsets?.trim()) pills.push(`toolsets=${options.toolsets.trim()}`);
    if (options.skills?.trim()) pills.push(`skills=${options.skills.trim()}`);
    if (options.imagePath?.trim()) pills.push(`image=${truncateMiddle(options.imagePath.trim(), 14)}`);
    if (options.resumeSessionId?.trim()) pills.push(`resume=${options.resumeSessionId.trim()}`);
    if (typeof options.continueSessionName === "string") pills.push(`continue=${options.continueSessionName.trim() || "latest"}`);
    if (options.maxTurns) pills.push(`max-turns=${options.maxTurns}`);
    if (options.source?.trim() && options.source !== "tool") pills.push(`source=${options.source.trim()}`);
    if (options.verbose) pills.push("verbose");
    if (options.quiet !== false) pills.push("quiet");
    if (options.worktree) pills.push("worktree");
    if (options.checkpoints) pills.push("checkpoints");
    if (options.yolo) pills.push("yolo");
    if (options.passSessionId) pills.push("pass-session-id");
    return pills;
  }, [options]);

  const contextSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${t.resumeLabel || "resume"}: ${options.resumeSessionId?.trim() || (t.noneValue || "none")}`);
    parts.push(`${t.continueLabel || "continue"}: ${options.continueSessionName?.trim() || (t.noneValue || "none")}`);
    parts.push(`${t.providerLabel || "provider"}: ${options.provider?.trim() || "auto"}`);
    parts.push(`${t.sourceLabel || "source"}: ${options.source?.trim() || "tool"}`);
    parts.push(`${t.attachmentLabel || "attachment"}: ${uploadedImage?.localName || (t.noneValue || "none")}`);
    parts.push(`${t.modeLabel || "mode"}: ${options.quiet !== false ? "quiet" : "normal"}`);
    return parts;
  }, [options, uploadedImage, t]);

  function updateOption<K extends keyof ChatOptions>(key: K, value: ChatOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function clearTranscript() {
    setTurns([]);
  }

  function clearUploadedImage() {
    if (uploadedImage?.previewUrl) {
      URL.revokeObjectURL(uploadedImage.previewUrl);
    }
    setUploadedImage(null);
    setUploadStatus("");
    setUploadError("");
    setOptions((current) => ({ ...current, imagePath: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applySession(session: SessionRecord, mode: "resume" | "continue") {
    if (mode === "resume") {
      setOptions((current) => ({
        ...current,
        resumeSessionId: session.sessionId,
        continueSessionName: undefined,
      }));
      return;
    }

    setOptions((current) => ({
      ...current,
      continueSessionName: session.displayName || session.originUserId || session.sessionId,
      resumeSessionId: undefined,
    }));
  }

  async function handlePickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError(t.imageTypeError || "请选择图片文件。");
      return;
    }

    setUploadStatus(t.uploadingImage || "正在上传图片…");
    setUploadError("");

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/chat/upload", { method: "POST", body: form });
      const data = (await response.json()) as { path?: string; name?: string; type?: string; size?: number; error?: string };
      if (!response.ok || !data.path) {
        throw new Error(data.error || t.imageUploadFailed || "图片上传失败。");
      }

      const nextPreviewUrl = URL.createObjectURL(file);
      if (uploadedImage?.previewUrl) {
        URL.revokeObjectURL(uploadedImage.previewUrl);
      }

      setUploadedImage({
        localName: data.name || file.name,
        uploadedPath: data.path,
        mimeType: data.type || file.type,
        size: data.size || file.size,
        previewUrl: nextPreviewUrl,
      });
      setOptions((current) => ({ ...current, imagePath: data.path }));
      setUploadStatus(t.imageReady || "图片已就绪，可随下一条消息一起发送。");
    } catch (error) {
      setUploadedImage(null);
      setOptions((current) => ({ ...current, imagePath: undefined }));
      setUploadError(error instanceof Error ? error.message : t.imageUploadFailed || "图片上传失败。");
      setUploadStatus("");
    }
  }

  function submitPrompt(nextPrompt: string) {
    const trimmed = nextPrompt.trim();
    if (!trimmed) return;

    const userText = uploadedImage ? `${trimmed}\n\n[image] ${uploadedImage.localName}` : trimmed;
    const userTurn: ChatTurn = {
      id: makeId(),
      role: "user",
      text: userText,
      createdAt: new Date().toISOString(),
      imagePath: uploadedImage?.uploadedPath,
    };

    setTurns((current) => [...current, userTurn]);
    setPrompt("");

    const requestOptions = { ...options };

    startTransition(async () => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, ...requestOptions }),
      });

      const data = (await response.json()) as ChatResponse & { error?: string };
      const normalized: ChatResponse = {
        stdout: data.stdout || data.error || "",
        stderr: data.stderr || "",
        exitCode: data.exitCode ?? (response.ok ? 0 : 1),
        finalText: data.finalText || data.stdout || data.error || "",
        sessionId: data.sessionId,
        commandArgs: data.commandArgs || [],
      };

      setTurns((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          text: normalized.finalText || normalized.stderr || t.noOutput,
          createdAt: new Date().toISOString(),
          exitCode: normalized.exitCode,
          sessionId: normalized.sessionId,
          stderr: normalized.stderr,
          stdout: normalized.stdout,
          commandArgs: normalized.commandArgs,
        },
      ]);
    });

    if (uploadedImage) {
      clearUploadedImage();
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPrompt(prompt);
  }

  return (
    <div className="stack-lg">
      <div className="card card-pad stack-md">
        <div className="row-between compact-top-row">
          <div>
            <h3 className="section-title">{t.recentSessionsTitle || "最近会话"}</h3>
            <p className="section-copy">{t.recentSessionsDescription || "把 Sessions 页的真实数据拉进 Chat，支持从最近会话继续或按 session_id 精确恢复。"}</p>
          </div>
          <span className="pill">{sessions.length} recent</span>
        </div>
        {sessions.length ? (
          <div className="stack-sm">
            <div className="inline-note">{t.sessionActionHelp || "恢复 = 按 session_id 精确恢复；续接 = 用 continue 名称/身份继续最近上下文。"}</div>
            {sessions.map((session) => {
              const label = session.displayName || session.originUserId || truncateMiddle(session.sessionId, 6);
              return (
                <div key={session.sessionId} className="list-row session-quick-row">
                  <div>
                    <div className="list-title">{label}</div>
                    <div className="list-meta mono">{truncateMiddle(session.sessionId, 8)}</div>
                    <div className="list-meta">{session.platform} · {session.chatType} · {session.updatedAt.replace("T", " ").slice(0, 16)}</div>
                  </div>
                  <div className="toolbar-group">
                    <button className="button-secondary" type="button" onClick={() => applySession(session, "resume")}>{t.resumeAction || "恢复会话"}</button>
                    <button className="button-secondary" type="button" onClick={() => applySession(session, "continue")}>{t.continueAction || "续接会话"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">{t.noRecentSessions || "没有读到最近会话。"}</div>
        )}
      </div>

      <div className="card card-pad stack-md context-bar-card">
        <div className="row-between compact-top-row">
          <div>
            <h3 className="section-title">{t.contextTitle || "当前上下文"}</h3>
            <p className="section-copy">{t.contextDescription || "把当前绑定的 session、附件和聊天模式显式展示出来，减少隐式状态。"}</p>
          </div>
        </div>
        <div className="tag-row">
          {contextSummary.map((item) => <span key={item} className="tag">{item}</span>)}
        </div>
      </div>

      <div className="card card-pad stack-md">
        <div className="row-between compact-top-row">
          <div>
            <h3 className="section-title">{t.transcriptTitle || "对话转录"}</h3>
            <p className="section-copy">{t.transcriptDescription || "把用户输入、归一化回答、session id 与调试输出拆开显示。"}</p>
          </div>
          <button className="button-secondary" type="button" onClick={clearTranscript} disabled={!turns.length}>
            {t.clearTranscript || messages.common.clear}
          </button>
        </div>

        {activeOptionPills.length ? (
          <div className="tag-row">
            {activeOptionPills.map((pill) => (
              <span key={pill} className="tag">{pill}</span>
            ))}
          </div>
        ) : null}

        {turns.length ? (
          <div className="transcript-stack">
            {turns.map((turn) => (
              <article key={turn.id} className={`chat-turn ${turn.role === "user" ? "chat-turn-user" : "chat-turn-assistant"}`}>
                <div className="chat-turn-meta">
                  <strong>{turn.role === "user" ? t.userLabel || "你" : t.assistantLabel || "Hermes"}</strong>
                  <span>{formatTurnTime(turn.createdAt)}</span>
                  {typeof turn.exitCode === "number" ? (
                    <span className={turn.exitCode === 0 ? "pill good" : "pill warn"}>exit {turn.exitCode}</span>
                  ) : null}
                  {turn.sessionId ? <span className="tag">session {turn.sessionId}</span> : null}
                  {turn.imagePath ? <span className="tag">image attached</span> : null}
                </div>
                <div className="chat-bubble rich-message">{renderRichMessage(turn.text)}</div>
                {turn.role === "assistant" ? (
                  <details className="turn-diagnostics">
                    <summary className="advanced-summary">{t.turnDiagnostics || "本条 diagnostics"}</summary>
                    <div className="advanced-body stack-sm">
                      {turn.commandArgs?.length ? <pre className="terminal-block">$ hermes {turn.commandArgs.join(" ")}</pre> : null}
                      {turn.stdout ? <pre className="terminal-block">{turn.stdout}</pre> : null}
                      {turn.stderr ? <pre className="terminal-block terminal-error">{turn.stderr}</pre> : null}
                    </div>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state stack-sm">
            <div>{t.noTranscript || "还没有对话记录。先发一条消息，页面会保留用户/助手转录与原始命令输出。"}</div>
          </div>
        )}
      </div>

      <form className="card card-pad stack-md" onSubmit={onSubmit}>
        <div>
          <h3 className="section-title">{t.consoleTitle}</h3>
          <p className="section-copy">{t.consoleDescription}</p>
        </div>

        <div className="tag-row">
          {examples.map((example) => (
            <button key={example} type="button" className="button-secondary example-chip" onClick={() => setPrompt(example)}>
              {example}
            </button>
          ))}
        </div>

        <textarea
          className="composer"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!isPending) submitPrompt(prompt);
            }
          }}
          placeholder={t.placeholder}
        />

        <div className="composer-toolbar">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden-input" onChange={handlePickImage} />
          <button className="button-secondary" type="button" onClick={() => fileInputRef.current?.click()}>{t.pickImage || "选择图片"}</button>
          <div className="inline-note">{t.attachmentHint || "支持将本地图片上传到临时目录并随下一条消息发送。"}</div>
        </div>

        {uploadedImage ? (
          <div className="attachment-card">
            <Image className="attachment-thumb" src={uploadedImage.previewUrl} alt={uploadedImage.localName} width={92} height={92} unoptimized />
            <div className="attachment-meta">
              <div className="list-title">{uploadedImage.localName}</div>
              <div className="list-meta">{uploadedImage.mimeType} · {Math.round(uploadedImage.size / 1024)} KB</div>
              <div className="list-meta mono">{uploadedImage.uploadedPath}</div>
            </div>
            <button className="button-secondary" type="button" onClick={clearUploadedImage}>{t.clearImage || "清除图片"}</button>
          </div>
        ) : null}
        {uploadStatus ? <div className="inline-note good-text">{uploadStatus}</div> : null}
        {uploadError ? <div className="inline-note warn-text">{uploadError}</div> : null}

        <details className="card advanced-config">
          <summary className="advanced-summary">{t.advancedOptions || "高级 CLI 选项"} · {t.advancedOptionsHint || "session / provider / debug"}</summary>
          <div className="advanced-body stack-md">
            <div className="form-section-grid">
              <label className="field">
                <span>model</span>
                <input className="field-input" value={options.model || ""} onChange={(event) => updateOption("model", event.target.value)} placeholder={t.modelPlaceholder || "anthropic/claude-sonnet-4"} />
              </label>
              <label className="field">
                <span>provider</span>
                <select className="field-input" value={options.provider || "auto"} onChange={(event) => updateOption("provider", event.target.value)}>
                  {providerOptions.map((provider) => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>toolsets</span>
                <input className="field-input" value={options.toolsets || ""} onChange={(event) => updateOption("toolsets", event.target.value)} placeholder={t.toolsetsPlaceholder || "terminal,file,web"} />
              </label>
              <label className="field">
                <span>skills</span>
                <input className="field-input" value={options.skills || ""} onChange={(event) => updateOption("skills", event.target.value)} placeholder={t.skillsPlaceholder || "dogfood,github-auth"} />
              </label>
              <label className="field">
                <span>image_path</span>
                <input className="field-input" value={options.imagePath || ""} onChange={(event) => updateOption("imagePath", event.target.value)} placeholder={t.imagePlaceholder || "/absolute/path/to/image.png"} />
              </label>
              <label className="field">
                <span>max_turns</span>
                <input className="field-input" type="number" min={1} value={options.maxTurns ?? ""} onChange={(event) => updateOption("maxTurns", event.target.value ? Number(event.target.value) : undefined)} placeholder="90" />
              </label>
              <label className="field">
                <span>resume_session_id</span>
                <input className="field-input" value={options.resumeSessionId || ""} onChange={(event) => updateOption("resumeSessionId", event.target.value)} placeholder={t.resumePlaceholder || "20260412_..."} />
              </label>
              <label className="field">
                <span>continue_session_name</span>
                <input className="field-input" value={options.continueSessionName || ""} onChange={(event) => updateOption("continueSessionName", event.target.value)} placeholder={t.continuePlaceholder || "leave blank for latest"} />
              </label>
              <label className="field">
                <span>source</span>
                <input className="field-input" value={options.source || "tool"} onChange={(event) => updateOption("source", event.target.value)} placeholder="tool" />
              </label>
            </div>

            <div className="form-section-grid">
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(options.quiet)} onChange={(event) => updateOption("quiet", event.target.checked)} /><div><strong>quiet</strong><div className="field-help">{t.quietHelp || "默认开启，适合浏览器 UI。"}</div></div></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(options.verbose)} onChange={(event) => updateOption("verbose", event.target.checked)} /><div><strong>verbose</strong><div className="field-help">{t.verboseHelp || "需要更多 CLI 细节时打开。"}</div></div></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(options.worktree)} onChange={(event) => updateOption("worktree", event.target.checked)} /><div><strong>worktree</strong><div className="field-help">{t.worktreeHelp || "在独立 git worktree 中运行。"}</div></div></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(options.checkpoints)} onChange={(event) => updateOption("checkpoints", event.target.checked)} /><div><strong>checkpoints</strong><div className="field-help">{t.checkpointsHelp || "危险文件改动前建立 checkpoint。"}</div></div></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(options.yolo)} onChange={(event) => updateOption("yolo", event.target.checked)} /><div><strong>yolo</strong><div className="field-help">{t.yoloHelp || "绕过危险命令审批。"}</div></div></label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(options.passSessionId)} onChange={(event) => updateOption("passSessionId", event.target.checked)} /><div><strong>pass_session_id</strong><div className="field-help">{t.passSessionIdHelp || "把 session id 注入系统提示词。"}</div></div></label>
            </div>
          </div>
        </details>

        <div className="row-between">
          <div className="inline-note">{t.localWorkflow} {t.enterHint || "Enter 发送，Shift+Enter 换行。"}</div>
          <button className="button-primary" disabled={isPending}>{isPending ? t.running : t.send}</button>
        </div>
      </form>
    </div>
  );
}
