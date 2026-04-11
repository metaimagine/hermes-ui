import { PageHeader } from "@/components/page-header";
import { SessionsTable } from "@/components/sessions-table";
import { getSessions } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

export default async function SessionsPage() {
  const [sessions, prefs] = await Promise.all([getSessions(), getUiPrefs()]);
  const t = prefs.messages.pages.sessions;
  const activeCount = sessions.length;
  const highLoadCount = sessions.filter((session) => session.lastPromptTokens >= 100000).length;
  const totalPromptTokens = sessions.reduce((sum, session) => sum + session.lastPromptTokens, 0);

  return (
    <div className="stack-xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="stats-grid compact">
        <article className="stat-card card"><div className="stat-label">{t.trackedSessions}</div><div className="stat-value">{activeCount}</div></article>
        <article className="stat-card card"><div className="stat-label">{t.highLoadSessions}</div><div className="stat-value">{highLoadCount}</div></article>
        <article className="stat-card card"><div className="stat-label">{t.promptTokensTotal}</div><div className="stat-value small-value">{totalPromptTokens.toLocaleString()}</div></article>
      </section>

      <SessionsTable sessions={sessions} messages={prefs.messages} />
    </div>
  );
}
