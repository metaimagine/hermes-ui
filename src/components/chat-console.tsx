"use client";

import { useState, useTransition } from "react";
import type { UiMessages } from "@/lib/ui/i18n";

type ChatResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export function ChatConsole({ messages }: { messages: UiMessages }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = messages.pages.chat;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;
    startTransition(async () => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await response.json()) as ChatResult & { error?: string };
      setResult({
        stdout: data.stdout || data.error || "",
        stderr: data.stderr || "",
        exitCode: data.exitCode ?? (response.ok ? 0 : 1),
      });
    });
  }

  return (
    <div className="stack-lg">
      <form className="card card-pad stack-md" onSubmit={onSubmit}>
        <div>
          <h3 className="section-title">{t.consoleTitle}</h3>
          <p className="section-copy">{t.consoleDescription}</p>
        </div>
        <textarea
          className="composer"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={t.placeholder}
        />
        <div className="row-between">
          <div className="inline-note">{t.localWorkflow}</div>
          <button className="button-primary" disabled={isPending}>{isPending ? t.running : t.send}</button>
        </div>
      </form>

      <div className="card card-pad stack-md">
        <div className="row-between">
          <h3 className="section-title">{t.commandOutput}</h3>
          {result ? <span className={result.exitCode === 0 ? "pill good" : "pill warn"}>exit {result.exitCode}</span> : null}
        </div>
        <pre className="terminal-block">{result?.stdout || t.noOutput}</pre>
        {result?.stderr ? <pre className="terminal-block terminal-error">{result.stderr}</pre> : null}
      </div>
    </div>
  );
}
