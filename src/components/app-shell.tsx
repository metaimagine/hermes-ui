"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OverviewData } from "@/lib/hermes/types";
import type { Lang, ThemeMode, UiMessages } from "@/lib/ui/i18n";
import { PrefsControls } from "@/components/prefs-controls";
import { Bot, Clock3, LayoutDashboard, MemoryStick, ShieldCheck, SlidersHorizontal, Sparkles, Waypoints, MessageSquareText } from "lucide-react";

const navKeys = ["dashboard", "config", "sessions", "memory", "skills", "cron", "approvals", "chat"] as const;
const hrefForKey = {
  dashboard: "/dashboard",
  config: "/config",
  sessions: "/sessions",
  memory: "/memory",
  skills: "/skills",
  cron: "/cron",
  approvals: "/approvals",
  chat: "/chat",
} as const;

const icons = {
  dashboard: LayoutDashboard,
  config: SlidersHorizontal,
  sessions: MessageSquareText,
  memory: MemoryStick,
  skills: Sparkles,
  cron: Clock3,
  approvals: ShieldCheck,
  chat: Bot,
} as const;

function badgeForKey(key: typeof navKeys[number], overview?: OverviewData) {
  if (!overview) return null;
  switch (key) {
    case "sessions":
      return String(overview.counts.sessions);
    case "memory":
      return String(overview.counts.memoryEntries);
    case "skills":
      return String(overview.counts.installedSkillCategories);
    case "cron":
      return String(overview.counts.cronArtifacts);
    case "approvals":
      return String(overview.counts.pendingApprovals);
    default:
      return null;
  }
}

export function AppShell({
  children,
  overview,
  lang,
  theme,
  messages,
}: {
  children: React.ReactNode;
  overview?: OverviewData;
  lang: Lang;
  theme: ThemeMode;
  messages: UiMessages;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card compact">
          <div className="brand-eyebrow">{messages.shell.projectEyebrow}</div>
          <div className="brand-title-row compact">
            <div className="brand-mark">H</div>
            <div>
              <h1>Hermes UI</h1>
              <p>{messages.shell.productSubtitle}</p>
            </div>
          </div>
          <div className="brand-pill"><Waypoints size={14} /> {messages.shell.localOnly}</div>
        </div>

        <PrefsControls lang={lang} theme={theme} messages={messages} />

        <nav className="nav-list" aria-label="Main navigation">
          {navKeys.map((key) => {
            const href = hrefForKey[key];
            const active = pathname === href;
            const Icon = icons[key];
            const badge = badgeForKey(key, overview);
            const nav = messages.nav[key];
            return (
              <Link key={href} href={href} className={active ? "nav-item active" : "nav-item"}>
                <div className="nav-icon"><Icon size={18} /></div>
                <div>
                  <div className="nav-row-head">
                    <div className="nav-label">{nav.label}</div>
                    {badge !== null ? <span className="nav-badge">{badge}</span> : null}
                  </div>
                  <div className="nav-short">{nav.short}</div>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="main-shell">
        <header className="topbar compact">
          <div>
            <div className="topbar-eyebrow">{messages.shell.workspaceEyebrow}</div>
            <div className="topbar-title">{messages.shell.workspaceTitle}</div>
          </div>
          <div className="topbar-chip-row">
            <div className="topbar-status">
              <span className="status-dot" />
              {messages.shell.backendRoutes}
            </div>
            <div className="topbar-status muted">{messages.shell.noAuth}</div>
          </div>
        </header>
        <main className="page-frame">{children}</main>
      </div>
    </div>
  );
}
