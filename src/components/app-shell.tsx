"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { OverviewData } from "@/lib/hermes/types";
import type { Lang, ThemeMode, UiMessages } from "@/lib/ui/i18n";
import { PrefsControls } from "@/components/prefs-controls";
import { Bot, Clock3, LayoutDashboard, MemoryStick, PanelLeftClose, PanelLeftOpen, ShieldCheck, SlidersHorizontal, Sparkles, Waypoints, MessageSquareText } from "lucide-react";

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
  const isChatPage = pathname === "/chat";
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isChatPage);
  const drawerToggleLabel = sidebarCollapsed
    ? (lang === "zh" ? "展开侧边栏" : "Open sidebar")
    : (lang === "zh" ? "收起侧边栏" : "Collapse sidebar");
  const drawerDismissLabel = lang === "zh" ? "关闭侧边栏" : "Close sidebar";

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1160px)");
    const syncShellState = () => {
      const compact = media.matches;
      setIsCompactViewport(compact);
      setSidebarCollapsed(compact || pathname === "/chat");
    };

    syncShellState();
    media.addEventListener("change", syncShellState);
    return () => media.removeEventListener("change", syncShellState);
  }, [pathname]);

  return (
    <div className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className={sidebarCollapsed ? "sidebar sidebar-collapsed" : "sidebar"}>
        <div className={sidebarCollapsed ? "brand-card compact drawer-compact" : "brand-card compact"}>
          {!sidebarCollapsed ? <div className="brand-eyebrow">{messages.shell.projectEyebrow}</div> : null}
          <div className="brand-title-row compact">
            <div className="brand-mark">H</div>
            {!sidebarCollapsed ? (
              <div>
                <h1>Hermes UI</h1>
                <p>{messages.shell.productSubtitle}</p>
              </div>
            ) : null}
          </div>
          {!sidebarCollapsed ? <div className="brand-pill"><Waypoints size={14} /> {messages.shell.localOnly}</div> : null}
        </div>

        {!sidebarCollapsed ? <PrefsControls lang={lang} theme={theme} messages={messages} /> : null}

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
                {!sidebarCollapsed ? (
                  <div>
                    <div className="nav-row-head">
                      <div className="nav-label">{nav.label}</div>
                      {badge !== null ? <span className="nav-badge">{badge}</span> : null}
                    </div>
                    <div className="nav-short">{nav.short}</div>
                  </div>
                ) : badge !== null ? <span className="nav-badge drawer-badge">{badge}</span> : null}
              </Link>
            );
          })}
        </nav>
      </aside>
      {isCompactViewport ? (
        <button
          type="button"
          className={sidebarCollapsed ? "drawer-backdrop" : "drawer-backdrop visible"}
          aria-label={drawerDismissLabel}
          onClick={() => setSidebarCollapsed(true)}
        />
      ) : null}

      <div className={isChatPage ? "main-shell chat-main-shell" : "main-shell"}>
        <header className={isChatPage ? "topbar compact chat-topbar" : "topbar compact"}>
          <div className="toolbar-group">
            <button className="button-secondary drawer-toggle" type="button" aria-label={drawerToggleLabel} onClick={() => setSidebarCollapsed((value) => !value)}>
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <div>
              <div className="topbar-eyebrow">{messages.shell.workspaceEyebrow}</div>
              <div className="topbar-title">{messages.shell.workspaceTitle}</div>
            </div>
          </div>
          <div className="topbar-chip-row">
            <div className="topbar-status">
              <span className="status-dot" />
              {messages.shell.backendRoutes}
            </div>
            <div className="topbar-status muted">{messages.shell.noAuth}</div>
          </div>
        </header>
        <main className={isChatPage ? "page-frame chat-page-frame" : "page-frame"}>{children}</main>
      </div>
    </div>
  );
}
