"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { ArrowUp, Check, Copy, History, Mic, Paperclip, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import type { ChatHistorySnapshot, ChatRequest, ChatResponse, SessionRecord } from "@/lib/hermes/types";
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
  source?: "session-file" | "local";
};

type ChatOptions = Omit<ChatRequest, "prompt">;

type UploadedImage = {
  localName: string;
  uploadedPath: string;
  mimeType: string;
  size: number;
  previewUrl: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
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

function readArgValue(args: string[] | undefined, flag: string) {
  if (!args) return undefined;
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function getDiagnosticsSummary(turn: ChatTurn) {
  const provider = readArgValue(turn.commandArgs, "--provider") || "auto";
  const source = readArgValue(turn.commandArgs, "--source") || "tool";
  const maxTurns = readArgValue(turn.commandArgs, "--max-turns") || "default";
  const mode = turn.commandArgs?.includes("--quiet") ? "quiet" : "normal";
  const session = turn.sessionId || "none";
  const attachment = turn.commandArgs?.includes("--image") ? "attached" : "none";
  return { provider, source, maxTurns, mode, session, attachment };
}

function compactRepeatedResponse(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const deduped: string[] = [];
  for (const paragraph of paragraphs) {
    if (deduped[deduped.length - 1] !== paragraph) {
      deduped.push(paragraph);
    }
  }
  return deduped.join("\n\n");
}

function getVisibleAssistantText(text: string, limit = 520) {
  const compact = compactRepeatedResponse(text);
  const summaryStart = compact.search(/(简短摘要|一句话|Summary|In short)[:：]/i);
  const preferred = summaryStart > 0 ? compact.slice(summaryStart).trim() : compact;
  if (preferred.length <= limit) {
    return { preview: preferred, full: compact, truncated: preferred !== compact };
  }
  return {
    preview: `${preferred.slice(0, limit).trimEnd()}…`,
    full: compact,
    truncated: true,
  };
}

export function ChatConsole({ messages, sessions }: { messages: UiMessages; sessions: SessionRecord[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [options, setOptions] = useState<ChatOptions>(defaultOptions);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [hydratedSessionId, setHydratedSessionId] = useState<string | null>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const latestTurnRef = useRef<HTMLDivElement | null>(null);
  const hydratedFromQueryRef = useRef(false);
  const recentSessionsRef = useRef<HTMLDetailsElement | null>(null);
  const activeContextRef = useRef<HTMLDetailsElement | null>(null);
  const advancedOptionsRef = useRef<HTMLDetailsElement | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const t = messages.pages.chat as Record<string, string>;

  function replaceChatParams(nextValues: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(nextValues)) {
      if (value?.trim()) {
        params.set(key, value.trim());
      } else {
        params.delete(key);
      }
    }
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  async function hydrateSessionHistory(sessionId: string, signal?: AbortSignal) {
    const response = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as ChatHistorySnapshot;
    if (signal?.aborted) return;

    const hydratedTurns: ChatTurn[] = data.turns.map((turn) => ({
      id: turn.id,
      role: turn.role,
      text: turn.text,
      createdAt: turn.createdAt || new Date().toISOString(),
      sessionId: turn.sessionId,
      source: "session-file",
    }));
    setHydratedSessionId(data.sessionId);
    setTurns(hydratedTurns);
    setIsAutoScrolling(true);
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1160px)");
    const syncLayout = () => setIsCompactLayout(media.matches);
    syncLayout();
    media.addEventListener("change", syncLayout);
    return () => media.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    const railPanels = [recentSessionsRef.current, activeContextRef.current];
    for (const panel of railPanels) {
      if (!panel) continue;
      panel.open = !isCompactLayout;
    }
    if (advancedOptionsRef.current && isCompactLayout) {
      advancedOptionsRef.current.open = false;
    }
  }, [isCompactLayout]);

  useEffect(() => {
    return () => {
      if (uploadedImage?.previewUrl) {
        URL.revokeObjectURL(uploadedImage.previewUrl);
      }
      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, [uploadedImage]);

  useEffect(() => {
    if (hydratedFromQueryRef.current) return;
    const resume = searchParams.get("resume")?.trim();
    const cont = searchParams.get("continue")?.trim();
    const promptFromQuery = searchParams.get("prompt")?.trim();
    if (!resume && !cont && !promptFromQuery) return;

    setOptions((current) => ({
      ...current,
      resumeSessionId: resume || current.resumeSessionId,
      continueSessionName: cont || current.continueSessionName,
    }));
    if (promptFromQuery) {
      setPrompt(promptFromQuery);
    }
    hydratedFromQueryRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    const resumeSessionId = searchParams.get("resume")?.trim();
    if (!resumeSessionId) return;

    const controller = new AbortController();
    hydrateSessionHistory(resumeSessionId, controller.signal)
      .catch(() => {
        if (controller.signal.aborted) return;
      });

    return () => {
      controller.abort();
    };
  }, [searchParams]);

  useEffect(() => {
    const SpeechCtor = (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
      || (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechCtor) return;

    const recognition = new SpeechCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang === 'zh' ? 'zh-CN' : 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (const result of Array.from(event.results)) {
        transcript += result[0]?.transcript || '';
      }
      setPrompt(transcript.trim());
    };
    recognition.onerror = (event) => {
      setVoiceError(event.error || (t.voiceUnavailable || 'Voice input failed.'));
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus('');
    };
    speechRef.current = recognition;

    return () => {
      recognition.stop();
      speechRef.current = null;
    };
  }, [t]);

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
    if (options.maxTurns) pills.push(`max-turns=${options.maxTurns}`);
    if (options.verbose) pills.push("verbose");
    if (options.worktree) pills.push("worktree");
    if (options.checkpoints) pills.push("checkpoints");
    if (options.yolo) pills.push("yolo");
    if (options.passSessionId) pills.push("pass-session-id");
    return pills;
  }, [options]);

  const contextSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${t.resumeLabel || "resume"}: ${options.resumeSessionId?.trim() ? truncateMiddle(options.resumeSessionId.trim(), 10) : (t.noneValue || "none")}`);
    parts.push(`${t.continueLabel || "continue"}: ${options.continueSessionName?.trim() ? truncateMiddle(options.continueSessionName.trim(), 10) : (t.noneValue || "none")}`);
    parts.push(`${t.providerLabel || "provider"}: ${options.provider?.trim() || "auto"}`);
    parts.push(`${t.sourceLabel || "source"}: ${options.source?.trim() || "tool"}`);
    parts.push(`${t.attachmentLabel || "attachment"}: ${uploadedImage?.localName || (t.noneValue || "none")}`);
    parts.push(`${t.modeLabel || "mode"}: ${options.quiet !== false ? "quiet" : "normal"}`);
    return parts;
  }, [options, uploadedImage, t]);

  const recentWindowState = useMemo(() => {
    if (!hydratedSessionId || turns.length <= 6) {
      return {
        olderTurns: [] as ChatTurn[],
        recapTurns: [] as ChatTurn[],
        activeTurns: turns,
        hasWindowing: false,
        continuationTurn: null as ChatTurn | null,
      };
    }
    const pivot = Math.max(turns.length - 6, 0);
    const recentTurns = turns.slice(pivot);
    const activeTurns = recentTurns.slice(-2);
    const recapTurns = recentTurns.slice(0, -2);
    return {
      olderTurns: turns.slice(0, pivot),
      recapTurns,
      activeTurns,
      hasWindowing: true,
      continuationTurn: activeTurns[0] ?? recentTurns[0] ?? null,
    };
  }, [hydratedSessionId, turns]);

  useEffect(() => {
    if (!isAutoScrolling || !latestTurnRef.current) return;
    latestTurnRef.current.scrollIntoView({ block: "end" });
    setShowJumpToLatest(false);
    setIsAutoScrolling(false);
  }, [isAutoScrolling, turns]);

  useEffect(() => {
    const node = transcriptScrollRef.current;
    if (!node) return;
    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      setShowJumpToLatest(distance > 120);
    };
    onScroll();
    node.addEventListener('scroll', onScroll);
    return () => node.removeEventListener('scroll', onScroll);
  }, [turns]);

  function updateOption<K extends keyof ChatOptions>(key: K, value: ChatOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function clearTranscript() {
    setTurns([]);
  }

  function startFreshChat() {
    clearTranscript();
    clearUploadedImage();
    setPrompt("");
    setHydratedSessionId(null);
    setOptions((current) => ({
      ...current,
      resumeSessionId: undefined,
      continueSessionName: undefined,
      imagePath: undefined,
    }));
    replaceChatParams({ resume: undefined, continue: undefined, prompt: undefined });
  }

  function openDetail(ref: React.RefObject<HTMLDetailsElement | null>) {
    if (!ref.current) return;
    ref.current.open = true;
    ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  async function copyTurnText(turnId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTurnId(turnId);
      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
      copyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setCopiedTurnId(null);
        copyFeedbackTimeoutRef.current = null;
      }, 1400);
    } catch {
      setCopiedTurnId(null);
    }
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

  function toggleVoiceInput() {
    if (!speechRef.current) {
      setVoiceError(t.voiceUnsupported || 'Voice input is not supported in this browser.');
      return;
    }
    setVoiceError('');
    if (isListening) {
      speechRef.current.stop();
      setIsListening(false);
      setVoiceStatus('');
      return;
    }
    setVoiceStatus(t.voiceListening || 'Listening…');
    setIsListening(true);
    speechRef.current.start();
  }

  function applySession(session: SessionRecord, mode: "resume" | "continue") {
    if (mode === "resume") {
      setTurns([]);
      setHydratedSessionId(null);
      setOptions((current) => ({
        ...current,
        resumeSessionId: session.sessionId,
        continueSessionName: undefined,
      }));
      replaceChatParams({ resume: session.sessionId, continue: undefined });
      return;
    }

    const continueValue = session.displayName || session.originUserId || session.sessionId;
    setOptions((current) => ({
      ...current,
      continueSessionName: continueValue,
      resumeSessionId: undefined,
    }));
    replaceChatParams({ continue: continueValue, resume: undefined });
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
    setIsAutoScrolling(true);
    setPrompt("");

    const requestOptions = { ...options };

    startTransition(() => {
      void (async () => {
        try {
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
        } catch (error) {
          setTurns((current) => [
            ...current,
            {
              id: makeId(),
              role: "assistant",
              text: error instanceof Error ? error.message : (t.noOutput || "No output yet."),
              createdAt: new Date().toISOString(),
              exitCode: 1,
            },
          ]);
        } finally {
          setIsAutoScrolling(true);
        }
      })();
    });

    if (uploadedImage) {
      clearUploadedImage();
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitPrompt(prompt);
  }

  const hasTurns = turns.length > 0;
  const stageMetaPills = [
    `${t.sourceLabel || "source"}: ${options.source || "tool"}`,
    `${t.providerLabel || "provider"}: ${options.provider || "auto"}`,
    hydratedSessionId
      ? `${t.resumeLabel || "resume"}: ${truncateMiddle(hydratedSessionId, 10)}`
      : `${t.modeLabel || "mode"}: ${options.quiet !== false ? "quiet" : "normal"}`,
  ];

  return (
    <div className="chat-console-layout chat-workbench">
      <aside className="chat-utility-rail stack-md">
        <section className="chat-rail-hero stack-sm">
          <div className="stack-xs">
            <div className="page-eyebrow">{t.eyebrow || "次级界面"}</div>
            <div className="chat-rail-title-row">
              <h2 className="section-title">{t.title || "本地聊天工作台"}</h2>
              <span className="pill">{sessions.length} recent</span>
            </div>
            <p className="section-copy chat-rail-copy">{t.description || "在一个页面里查看上下文、恢复会话、附加图片，并通过本地路由直接调用 Hermes CLI。"}</p>
          </div>
          <div className="chat-control-row">
            <button className="button-secondary chat-control-button" type="button" onClick={() => openDetail(recentSessionsRef)} disabled={!sessions.length}>
              <History size={15} />
              {t.recentSessionsTitle || "最近会话"}
            </button>
            <button className="button-secondary chat-control-button" type="button" onClick={() => openDetail(activeContextRef)}>
              <SlidersHorizontal size={15} />
              {t.contextAction || t.contextTitle || "当前上下文"}
            </button>
            <button className="button-secondary chat-control-button" type="button" onClick={() => openDetail(advancedOptionsRef)}>
              <Sparkles size={15} />
              {t.advancedAction || t.advancedOptions || "高级"}
            </button>
            <button className="button-secondary chat-control-button chat-control-button-strong" type="button" onClick={startFreshChat}>
              <Plus size={15} />
              {t.newChat || "新对话"}
            </button>
          </div>
        </section>

        <details ref={recentSessionsRef} className="chat-utility-panel">
          <summary className="advanced-summary">{t.recentSessionsTitle || "最近会话"}</summary>
          <div className="advanced-body stack-sm">
            <div className="inline-note">{t.sessionActionHelp || "恢复 = 按 session_id 精确恢复；续接 = 用 continue 名称/身份继续最近上下文。"}</div>
            {sessions.length ? sessions.map((session) => {
              const label = session.displayName || session.originUserId || truncateMiddle(session.sessionId, 6);
              return (
                <div key={session.sessionId} className="list-row session-quick-row rail-session-row">
                  <div>
                    <div className="list-title">{label}</div>
                    <div className="list-meta mono">{truncateMiddle(session.sessionId, 8)}</div>
                    <div className="list-meta">{session.platform} · {session.chatType} · {session.updatedAt.replace("T", " ").slice(0, 16)}</div>
                  </div>
                  <div className="toolbar-group wrap-row rail-session-actions">
                    <button className="button-secondary" type="button" onClick={() => applySession(session, "resume")}>{t.resumeAction || "恢复会话"}</button>
                    <button className="button-secondary" type="button" onClick={() => applySession(session, "continue")}>{t.continueAction || "续接会话"}</button>
                  </div>
                </div>
              );
            }) : <div className="empty-state">{t.noRecentSessions || "没有读到最近会话。"}</div>}
          </div>
        </details>

        <details ref={activeContextRef} className="chat-utility-panel">
          <summary className="advanced-summary">{t.contextTitle || "当前上下文"}</summary>
          <div className="advanced-body stack-sm">
            <div className="tag-row context-strip-tags">
              {contextSummary.map((item) => <span key={item} className="tag">{item}</span>)}
            </div>
            {activeOptionPills.length ? (
              <div className="tag-row chat-surface-pills">
                {activeOptionPills.map((pill) => (
                  <span key={pill} className="tag">{pill}</span>
                ))}
              </div>
            ) : <div className="inline-note">{t.contextDescription || "把当前绑定的 session、附件、provider 与聊天模式显式展示出来，减少隐式状态。"}</div>}
          </div>
        </details>

        <details ref={advancedOptionsRef} className="chat-utility-panel advanced-config chat-advanced-config">
          <summary className="advanced-summary">{t.advancedOptions || "高级 CLI 选项"} · {t.advancedOptionsHint || "session / provider / debug"}</summary>
          <div className="advanced-body stack-md">
            <div className="form-section-grid">
              <label className="field">
                <span>model</span>
                <input className="field-input" name="model" autoComplete="off" value={options.model || ""} onChange={(event) => updateOption("model", event.target.value)} placeholder={t.modelPlaceholder || "anthropic/claude-sonnet-4"} />
              </label>
              <label className="field">
                <span>provider</span>
                <select className="field-input" name="provider" value={options.provider || "auto"} onChange={(event) => updateOption("provider", event.target.value)}>
                  {providerOptions.map((provider) => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>toolsets</span>
                <input className="field-input" name="toolsets" autoComplete="off" value={options.toolsets || ""} onChange={(event) => updateOption("toolsets", event.target.value)} placeholder={t.toolsetsPlaceholder || "terminal,file,web"} />
              </label>
              <label className="field">
                <span>skills</span>
                <input className="field-input" name="skills" autoComplete="off" value={options.skills || ""} onChange={(event) => updateOption("skills", event.target.value)} placeholder={t.skillsPlaceholder || "dogfood,github-auth"} />
              </label>
              <label className="field">
                <span>image_path</span>
                <input className="field-input" name="image_path" autoComplete="off" value={options.imagePath || ""} onChange={(event) => updateOption("imagePath", event.target.value)} placeholder={t.imagePlaceholder || "/absolute/path/to/image.png"} />
              </label>
              <label className="field">
                <span>max_turns</span>
                <input className="field-input" name="max_turns" type="number" min={1} inputMode="numeric" value={options.maxTurns ?? ""} onChange={(event) => updateOption("maxTurns", event.target.value ? Number(event.target.value) : undefined)} placeholder="90" />
              </label>
              <label className="field">
                <span>resume_session_id</span>
                <input className="field-input" name="resume_session_id" autoComplete="off" value={options.resumeSessionId || ""} onChange={(event) => updateOption("resumeSessionId", event.target.value)} placeholder={t.resumePlaceholder || "20260412_..."} />
              </label>
              <label className="field">
                <span>continue_session_name</span>
                <input className="field-input" name="continue_session_name" autoComplete="off" value={options.continueSessionName || ""} onChange={(event) => updateOption("continueSessionName", event.target.value)} placeholder={t.continuePlaceholder || "leave blank for latest"} />
              </label>
              <label className="field">
                <span>source</span>
                <input className="field-input" name="source" autoComplete="off" value={options.source || "tool"} onChange={(event) => updateOption("source", event.target.value)} placeholder="tool" />
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
      </aside>

      <section className="chat-stage">
        <div className="chat-stage-head">
          <div className="stack-xs">
            <h3 className="section-title">{t.transcriptTitle || "对话转录"}</h3>
            {hydratedSessionId ? <div className="inline-note">{t.resumeLoadedLabel || "已加载历史会话"}: {hydratedSessionId}</div> : <p className="section-copy chat-surface-copy">{t.transcriptDescription || "把用户输入、归一化回答、session id 与调试输出拆开显示。"}</p>}
          </div>
          <div className="chat-stage-actions">
            <div className="tag-row chat-stage-pill-row">
              {stageMetaPills.map((pill) => <span key={pill} className="tag">{pill}</span>)}
            </div>
            <div className="toolbar-group wrap-row">
              {showJumpToLatest ? <button className="button-secondary jump-latest-button" type="button" onClick={() => setIsAutoScrolling(true)}>{t.jumpToLatest || "跳到最新"}</button> : null}
              <button className="button-secondary" type="button" onClick={clearTranscript} disabled={!turns.length}>
                {t.clearTranscript || messages.common.clear}
              </button>
            </div>
          </div>
        </div>

        <div className="chat-surface chat-reference-surface stack-md">
          <div className="chat-surface-body">
            {hasTurns ? (
              <div className="transcript-stack transcript-scroll-area" ref={transcriptScrollRef}>
                {recentWindowState.hasWindowing ? (
                  <details className="history-window-details">
                    <summary className="advanced-summary">{t.olderTurnsLabel || "更早的历史消息"} · {recentWindowState.olderTurns.length}</summary>
                    <div className="advanced-body transcript-stack">
                      {recentWindowState.olderTurns.map((turn) => (
                        <article key={turn.id} className={`chat-turn ${turn.role === "user" ? "chat-turn-user" : "chat-turn-assistant"}`}>
                          <div className="chat-turn-meta">
                            <strong>{turn.role === "user" ? t.userLabel || "你" : t.assistantLabel || "Hermes"}</strong>
                            <span>{formatTurnTime(turn.createdAt)}</span>
                            {turn.sessionId ? <span className="tag">session {turn.sessionId}</span> : null}
                          </div>
                          <div className="chat-bubble rich-message">{renderRichMessage(turn.text)}</div>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
                {recentWindowState.hasWindowing && recentWindowState.recapTurns.length ? (
                  <details className="history-window-details recent-recap-details">
                    <summary className="advanced-summary">{t.transcriptTitle || "对话转录"} recap · {recentWindowState.recapTurns.length}</summary>
                    <div className="advanced-body transcript-stack">
                      {recentWindowState.recapTurns.map((turn) => (
                        <article key={turn.id} className={`chat-turn ${turn.role === "user" ? "chat-turn-user" : "chat-turn-assistant"}`}>
                          <div className="chat-turn-meta">
                            <strong>{turn.role === "user" ? t.userLabel || "你" : t.assistantLabel || "Hermes"}</strong>
                            <span>{formatTurnTime(turn.createdAt)}</span>
                            {turn.sessionId ? <span className="tag">session {turn.sessionId}</span> : null}
                          </div>
                          <div className="chat-bubble rich-message">{renderRichMessage(turn.text)}</div>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
                {recentWindowState.activeTurns.map((turn, index) => {
                  const isResumeTail = recentWindowState.hasWindowing && turn.source === "session-file";
                  const isContinuationAnchor = recentWindowState.hasWindowing && index === 0;
                  const isLatest = index === recentWindowState.activeTurns.length - 1;
                  const visible = turn.role === "assistant"
                    ? getVisibleAssistantText(turn.text, turn.source === "session-file" ? 260 : 520)
                    : null;

                  return (
                    <div key={`chunk-${turn.id}`}>
                      <article ref={isLatest ? latestTurnRef : null} key={turn.id} className={`chat-turn ${turn.role === "user" ? "chat-turn-user" : "chat-turn-assistant"} ${isLatest ? "chat-turn-latest" : ""} ${isResumeTail ? "chat-turn-live-tail" : ""} ${isContinuationAnchor ? "chat-turn-continuation-anchor" : ""}`}>
                        <div className={`chat-turn-meta ${isResumeTail ? "chat-turn-meta-soft" : ""}`}>
                          <strong>{turn.role === "user" ? t.userLabel || "你" : t.assistantLabel || "Hermes"}</strong>
                          {!isResumeTail ? <span>{formatTurnTime(turn.createdAt)}</span> : null}
                          {!isResumeTail && typeof turn.exitCode === "number" ? (
                            <span className={turn.exitCode === 0 ? "pill good" : "pill warn"}>exit {turn.exitCode}</span>
                          ) : null}
                          {!isResumeTail && turn.sessionId ? <span className="tag">session {turn.sessionId}</span> : null}
                          {!isResumeTail && turn.imagePath ? <span className="tag">image attached</span> : null}
                          {!isResumeTail && turn.role === "assistant" ? (
                            <div className="chat-inline-actions">
                              <button className="button-secondary chat-inline-button" type="button" onClick={() => copyTurnText(turn.id, turn.text)}>
                                {copiedTurnId === turn.id ? <Check size={13} /> : <Copy size={13} />}
                                {copiedTurnId === turn.id ? (t.copiedAction || "已复制") : (t.copyAction || "复制")}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className={`chat-bubble rich-message ${isResumeTail ? "chat-bubble-live-tail" : ""}`}>
                          {isContinuationAnchor ? (
                            <div className="continuation-bubble-marker">
                              <span className="continuation-inline-title">{t.resumeBoundaryTitle || "从这里继续"}</span>
                              <span className="continuation-inline-copy">{t.resumeMarker || "建议从这里继续，下面优先显示最近一段。"}</span>
                            </div>
                          ) : null}
                          {turn.role === "assistant" && visible ? (
                            <div className="stack-sm">
                              <div>{renderRichMessage(visible.preview)}</div>
                              {visible.truncated ? (
                                <details className={isResumeTail ? "full-answer-details live-tail-details" : "full-answer-details"}>
                                  <summary className="advanced-summary">{t.fullAnswerLabel || "完整回答"}</summary>
                                  <div className="advanced-body stack-sm">{renderRichMessage(visible.full)}</div>
                                </details>
                              ) : null}
                            </div>
                          ) : renderRichMessage(turn.text)}
                        </div>
                        {turn.role === "assistant" && !isResumeTail ? (
                          <details className="turn-diagnostics">
                            <summary className="advanced-summary">{t.turnDiagnostics || "本条 diagnostics"}</summary>
                            <div className="advanced-body stack-sm">
                              <div className="diagnostics-grid">
                                {Object.entries(getDiagnosticsSummary(turn)).map(([key, value]) => (
                                  <div key={key} className="diagnostic-card">
                                    <div className="diagnostic-label">{key}</div>
                                    <div className="diagnostic-value">{value}</div>
                                  </div>
                                ))}
                              </div>
                              <details className="raw-output-details">
                                <summary className="advanced-summary">{t.rawOutputLabel || "原始输出"}</summary>
                                <div className="advanced-body stack-sm">
                                  {turn.commandArgs?.length ? <pre className="terminal-block">$ hermes {turn.commandArgs.join(" ")}</pre> : null}
                                  {turn.stdout ? <pre className="terminal-block">{turn.stdout}</pre> : null}
                                  {turn.stderr ? <pre className="terminal-block terminal-error">{turn.stderr}</pre> : null}
                                </div>
                              </details>
                            </div>
                          </details>
                        ) : null}
                      </article>
                    </div>
                  );
                })}
              </div>
            ) : (
              <section className="chat-welcome-panel">
                <div className="chat-welcome-badge">
                  <Sparkles size={14} />
                  {t.consoleTitle || "本地 Hermes CLI 提问"}
                </div>
                <div className="stack-sm">
                  <h3 className="chat-welcome-title">{t.title || "本地聊天工作台"}</h3>
                  <p className="section-copy chat-welcome-copy">{t.noTranscript || "还没有对话记录。先发一条消息，页面会保留用户/助手转录与原始命令输出。"}</p>
                </div>
                <div className="chat-welcome-grid">
                  <div className="chat-welcome-card">
                    <div className="diagnostic-label">{t.recentSessionsTitle || "最近会话"}</div>
                    <div className="chat-welcome-value">{sessions.length}</div>
                    <div className="inline-note">{t.recentSessionsDescription || "把 Sessions 页的真实数据拉进 Chat，支持从最近会话继续或按 session_id 精确恢复。"}</div>
                  </div>
                  <div className="chat-welcome-card">
                    <div className="diagnostic-label">{t.contextTitle || "当前上下文"}</div>
                    <div className="chat-welcome-value">{options.provider || "auto"}</div>
                    <div className="inline-note">{contextSummary.slice(0, 2).join(" · ")}</div>
                  </div>
                  <div className="chat-welcome-card">
                    <div className="diagnostic-label">{t.advancedOptions || "高级 CLI 选项"}</div>
                    <div className="chat-welcome-value">{activeOptionPills.length || 0}</div>
                    <div className="inline-note">{t.advancedOptionsHint || "session / provider / debug"}</div>
                  </div>
                </div>
                <div className="composer-suggestions chat-welcome-suggestions">
                  {examples.map((example) => (
                    <button key={example} type="button" className="composer-suggestion-chip" onClick={() => setPrompt(example)}>
                      {example}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <form className="chat-composer-dock chat-floating-dock stack-md" onSubmit={onSubmit}>
              <div className="chat-composer-head">
                <div>
                  <div className="section-title">{t.consoleTitle}</div>
                  {hydratedSessionId ? <div className="composer-resume-hint">{t.composerResumeHint || "继续输入会接在当前恢复会话后面。"}</div> : <div className="inline-note">{t.enterHint || "Enter 发送，Shift+Enter 换行。"}</div>}
                </div>
                <div className="inline-note">{t.localWorkflow}</div>
              </div>

              <div className="codex-composer-shell">
                {uploadedImage ? (
                  <div className="attachment-card compact-attachment-card">
                    <Image className="attachment-thumb" src={uploadedImage.previewUrl} alt={uploadedImage.localName} width={92} height={92} unoptimized />
                    <div className="attachment-meta">
                      <div className="list-title">{uploadedImage.localName}</div>
                      <div className="list-meta">{uploadedImage.mimeType} · {Math.round(uploadedImage.size / 1024)} KB</div>
                      <div className="list-meta mono">{uploadedImage.uploadedPath}</div>
                    </div>
                    <button className="button-secondary" type="button" onClick={clearUploadedImage}>{t.clearImage || "清除图片"}</button>
                  </div>
                ) : null}

                <textarea
                  className="composer composer-codex"
                  aria-label={t.consoleTitle || "Local Hermes CLI prompt"}
                  name="prompt"
                  autoComplete="off"
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

                {hasTurns ? (
                  <div className="composer-suggestions">
                    {examples.map((example) => (
                      <button key={example} type="button" className="composer-suggestion-chip" onClick={() => setPrompt(example)}>
                        {example}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="composer-toolbar composer-toolbar-codex">
                  <div className="composer-toolbar-left">
                    <div className="composer-mode-pill">
                      <Sparkles size={14} />
                      {`${t.sourceLabel || "source"}: ${options.source || "tool"}`}
                    </div>
                  </div>
                  <div className="toolbar-group wrap-row toolbar-cluster-right">
                    <input ref={fileInputRef} name="chat_image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden-input" onChange={handlePickImage} />
                    <button className="button-secondary composer-control-button" type="button" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip size={15} />
                      {t.pickImage || "选择图片"}
                    </button>
                    <button className={isListening ? "button-secondary composer-control-button active-control" : "button-secondary composer-control-button"} type="button" onClick={toggleVoiceInput}>
                      <Mic size={15} />
                      {isListening ? (t.stopVoice || "停止录音") : (t.voiceInput || "语音录入")}
                    </button>
                    <button className="button-primary composer-send-button" disabled={isPending}>
                      <ArrowUp size={15} />
                      {isPending ? t.running : t.send}
                    </button>
                  </div>
                </div>
              </div>

              <div className="stack-sm composer-status-stack">
                <div className="inline-note">{t.attachmentHint || "支持将本地图片上传到临时目录并随下一条消息发送。"}</div>
                <div className="stack-sm composer-feedback-stack" aria-live="polite">
                  {uploadStatus ? <div className="inline-note good-text">{uploadStatus}</div> : null}
                  {uploadError ? <div className="inline-note warn-text">{uploadError}</div> : null}
                  {voiceStatus ? <div className="inline-note good-text">{voiceStatus}</div> : null}
                  {voiceError ? <div className="inline-note warn-text">{voiceError}</div> : null}
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
