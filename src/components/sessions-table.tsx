"use client";

import { useMemo, useState } from "react";
import type { SessionRecord } from "@/lib/hermes/types";
import type { UiMessages } from "@/lib/ui/i18n";

type SortKey = "updated" | "tokens" | "platform";

function relativeTime(value: string, messages: UiMessages) {
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return messages.common.justNow;
  if (diffMin < 60) return `${diffMin}${messages.common.minutesAgo}`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}${messages.common.hoursAgo}`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}${messages.common.daysAgo}`;
}

function truncateMiddle(value: string, keep = 8) {
  if (value.length <= keep * 2) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

export function SessionsTable({ sessions, messages }: { sessions: SessionRecord[]; messages: UiMessages }) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [selectedId, setSelectedId] = useState<string | null>(sessions[0]?.sessionId ?? null);
  const t = messages.pages.sessions;

  const platforms = useMemo(() => ["all", ...Array.from(new Set(sessions.map((s) => s.platform))).sort()], [sessions]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = sessions.filter((session) => {
      const matchesQuery = !needle || [session.displayName, session.originUserId, session.sessionId, session.platform, session.chatType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const matchesPlatform = platform === "all" || session.platform === platform;
      return matchesQuery && matchesPlatform;
    });

    next.sort((a, b) => {
      if (sortKey === "tokens") return b.lastPromptTokens - a.lastPromptTokens;
      if (sortKey === "platform") return a.platform.localeCompare(b.platform);
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });

    return next;
  }, [platform, query, sessions, sortKey]);

  const selected = filtered.find((session) => session.sessionId === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="stack-lg">
      <div className="toolbar card card-pad compact-pad">
        <div className="toolbar-group grow">
          <input
            className="toolbar-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
          />
        </div>
        <div className="toolbar-group">
          <select className="toolbar-select" value={platform} onChange={(event) => setPlatform(event.target.value)}>
            {platforms.map((option) => (
              <option key={option} value={option}>{option === "all" ? t.allPlatforms : option}</option>
            ))}
          </select>
          <select className="toolbar-select" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="updated">{t.sortUpdated}</option>
            <option value="tokens">{t.sortTokens}</option>
            <option value="platform">{t.sortPlatform}</option>
          </select>
        </div>
      </div>

      <div className="two-column-grid wide-right sessions-layout">
        <div className="card card-pad compact-pad stack-md">
          <div className="row-between">
            <h3 className="section-title">{t.browserTitle}</h3>
            <span className="pill">{messages.common.showing} {filtered.length} {messages.common.of} {sessions.length}</span>
          </div>
          <div className="table-head session-browser-grid">
            <span>{t.session}</span>
            <span>{t.status}</span>
            <span>{t.platform}</span>
            <span>{t.lastActivity}</span>
            <span>{t.promptLoad}</span>
          </div>
          {filtered.map((session) => {
            const highLoad = session.lastPromptTokens >= 100000;
            const active = selected?.sessionId === session.sessionId;
            return (
              <button className={active ? "table-row session-browser-grid clickable-row selected-row" : "table-row session-browser-grid clickable-row"} key={session.sessionId} onClick={() => setSelectedId(session.sessionId)} type="button">
                <div>
                  <div className="list-title">{session.displayName || session.originUserId || truncateMiddle(session.sessionId, 6)}</div>
                  <div className="list-meta mono">{truncateMiddle(session.sessionId, 8)}</div>
                </div>
                <div>
                  <span className={highLoad ? "pill warn" : "pill good"}>{highLoad ? t.highLoad : t.healthy}</span>
                </div>
                <div>
                  <div className="list-title">{session.platform}</div>
                  <div className="list-meta">{session.chatType}</div>
                </div>
                <div>
                  <div className="list-title">{relativeTime(session.updatedAt, messages)}</div>
                  <div className="list-meta">{session.updatedAt.replace("T", " ").slice(0, 16)}</div>
                </div>
                <div>
                  <div className={highLoad ? "list-title warn-text" : "list-title"}>{session.lastPromptTokens.toLocaleString()}</div>
                  <div className="list-meta">{t.promptTokens}</div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 ? <div className="empty-state">{t.noMatch}</div> : null}
        </div>

        <div className="card card-pad compact-pad stack-md inspector-card">
          <div className="row-between">
            <h3 className="section-title">{messages.common.english === 'English' ? 'Inspector' : '检查面板'}</h3>
            {selected ? <span className="pill">{selected.platform}</span> : null}
          </div>
          {selected ? (
            <>
              <div className="inspector-block">
                <div className="inspector-label">Primary</div>
                <div className="inspector-value">{selected.displayName || selected.originUserId || selected.sessionId}</div>
                <div className="list-meta mono">{selected.sessionId}</div>
              </div>
              <div className="inspector-grid">
                <div className="inspector-block">
                  <div className="inspector-label">platform</div>
                  <div className="inspector-value small">{selected.platform}</div>
                </div>
                <div className="inspector-block">
                  <div className="inspector-label">chat_type</div>
                  <div className="inspector-value small">{selected.chatType}</div>
                </div>
                <div className="inspector-block">
                  <div className="inspector-label">updated_at</div>
                  <div className="inspector-value small">{selected.updatedAt.replace('T', ' ').slice(0, 19)}</div>
                </div>
                <div className="inspector-block">
                  <div className="inspector-label">prompt_tokens</div>
                  <div className="inspector-value small">{selected.lastPromptTokens.toLocaleString()}</div>
                </div>
              </div>
              <div className="toolbar-group wrap-row">
                <button className="button-secondary" type="button" onClick={() => navigator.clipboard.writeText(selected.sessionId)}>Copy session_id</button>
                {selected.originUserId ? <button className="button-secondary" type="button" onClick={() => navigator.clipboard.writeText(selected.originUserId || '')}>Copy user_id</button> : null}
                <button className="button-secondary" type="button" onClick={() => { window.location.href = `/chat?resume=${encodeURIComponent(selected.sessionId)}`; }}>Open in Chat (resume)</button>
                <button className="button-secondary" type="button" onClick={() => { window.location.href = `/chat?continue=${encodeURIComponent(selected.displayName || selected.originUserId || selected.sessionId)}`; }}>Open in Chat (continue)</button>
              </div>
            </>
          ) : (
            <div className="empty-state">No session selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}
