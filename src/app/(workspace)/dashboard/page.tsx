import { PageHeader } from "@/components/page-header";
import { getOverviewData } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

export default async function DashboardPage() {
  const [data, prefs] = await Promise.all([getOverviewData(), getUiPrefs()]);
  const t = prefs.messages.pages.dashboard;
  const updatedAt = data.generatedAt.replace('T', ' ').slice(0, 19);
  const highPromptSession = data.sessions.find((session) => session.lastPromptTokens >= 100000);
  const cards = [
    [t.sessions, data.counts.sessions],
    [t.approvedUsers, data.counts.approvedUsers],
    [t.pendingApprovals, data.counts.pendingApprovals],
    [t.memoryEntries, data.counts.memoryEntries],
    [t.skillCategories, data.counts.installedSkillCategories],
    [t.cronArtifacts, data.counts.cronArtifacts],
  ];

  return (
    <div className="stack-xl">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <div className="hero-chip-row">
            <span className="pill">{t.gatewayLoaded}</span>
            <span className="pill">{t.model} {data.environment.model}</span>
            <span className="pill">{t.provider} {data.environment.provider}</span>
          </div>
        }
      />

      <section className="posture-grid">
        <article className="card card-pad compact-pad posture-card">
          <div className="stat-label">{t.systemHealth}</div>
          <div className="posture-main good-text">{prefs.messages.common.healthy}</div>
          <div className="list-meta">{t.updated} {updatedAt}</div>
        </article>
        <article className="card card-pad compact-pad posture-card">
          <div className="stat-label">{t.gateway}</div>
          <div className="posture-main">{data.environment.gatewayLoaded ? t.loaded : t.notLoaded}</div>
          <div className="list-meta">{t.manager} {data.environment.gatewayManager}</div>
        </article>
        <article className="card card-pad compact-pad posture-card">
          <div className={data.counts.pendingApprovals > 0 ? 'posture-main warn-text' : 'posture-main good-text'}>{data.counts.pendingApprovals > 0 ? `${data.counts.pendingApprovals} pending` : prefs.messages.common.clear}</div>
          <div className="list-meta">{t.trustedUsers} {data.counts.approvedUsers}</div>
        </article>
        <article className="card card-pad compact-pad posture-card">
          <div className="stat-label">{t.sessions}</div>
          <div className={highPromptSession ? 'posture-main warn-text' : 'posture-main'}>{highPromptSession ? t.highPromptLoad : `${data.counts.sessions} ${t.active}`}</div>
          <div className="list-meta">{highPromptSession ? `${highPromptSession.lastPromptTokens.toLocaleString()} prompt tokens` : t.noHeavyPressure}</div>
        </article>
      </section>

      <section className="stats-grid dense">
        {cards.map(([label, value]) => (
          <article key={label} className="stat-card card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </article>
        ))}
      </section>

      <section className="two-column-grid narrow-left">
        <article className="card card-pad compact-pad stack-md">
          <h3 className="section-title">{t.environment}</h3>
          <div className="kv-list compact">
            <div><span>{t.hermesHome}</span><strong>{data.environment.hermesHome}</strong></div>
            <div><span>{t.model}</span><strong>{data.environment.model}</strong></div>
            <div><span>{t.provider}</span><strong>{data.environment.provider}</strong></div>
            <div><span>{t.gateway}</span><strong>{data.environment.gatewayLoaded ? t.loaded : t.notLoaded}</strong></div>
            <div><span>{t.manager}</span><strong>{data.environment.gatewayManager}</strong></div>
          </div>
        </article>

        <article className="card card-pad compact-pad stack-md">
          <div className="row-between"><h3 className="section-title">{t.attentionQueue}</h3><span className="pill warn">{prefs.messages.common.liveTriage}</span></div>
          <div className="stack-sm">
            <div className="signal-row">
              <div>
                <div className="signal-title">{t.approvals}</div>
                <div className="list-meta">{t.trustAndAccess}</div>
              </div>
              <div className={data.counts.pendingApprovals > 0 ? 'signal-state warn-text' : 'signal-state good-text'}>{data.counts.pendingApprovals > 0 ? `${data.counts.pendingApprovals} pending · act now` : prefs.messages.common.healthy}</div>
            </div>
            <div className="signal-row">
              <div>
                <div className="signal-title">{t.sessions}</div>
                <div className="list-meta">{t.recentActiveIndex}</div>
              </div>
              <div className={highPromptSession ? 'signal-state warn-text' : 'signal-state'}>{highPromptSession ? t.highPromptLoad : `${data.counts.sessions} ${t.tracked}`}</div>
            </div>
            <div className="signal-row">
              <div>
                <div className="signal-title">{t.memoryEntries}</div>
                <div className="list-meta">{t.durableUserContext}</div>
              </div>
              <div className="signal-state">{data.counts.memoryEntries} entries</div>
            </div>
          </div>
        </article>
      </section>

      <section className="two-column-grid">
        <article className="card card-pad compact-pad stack-md">
          <div className="row-between"><h3 className="section-title">{t.recentSessions}</h3><span className="pill">{data.sessions.length} {t.shown}</span></div>
          <div className="table-head session-compact-grid">
            <span>{t.session}</span>
            <span>{t.platform}</span>
            <span>{t.promptLoad}</span>
          </div>
          {data.sessions.map((session) => (
            <div className="table-row session-compact-grid" key={session.sessionId}>
              <div>
                <div className="list-title">{session.displayName || session.originUserId || session.sessionId}</div>
                <div className="list-meta mono">{session.updatedAt.replace('T', ' ').slice(0, 16)}</div>
              </div>
              <span>{session.platform} · {session.chatType}</span>
              <span>{session.lastPromptTokens.toLocaleString()}</span>
            </div>
          ))}
        </article>

        <article className="card card-pad compact-pad stack-md">
          <div className="row-between"><h3 className="section-title">{t.trustState}</h3><span className="pill good">approved {data.approvals.approved.length}</span></div>
          <div className="table-head trust-grid">
            <span>{t.identity}</span>
            <span>{t.platform}</span>
            <span>{t.status}</span>
          </div>
          {data.approvals.approved.slice(0, 6).map((entry) => (
            <div className="table-row trust-grid" key={`${entry.platform}:${entry.userId}`}>
              <div>
                <div className="list-title">{entry.userName || entry.userId}</div>
                <div className="list-meta mono">{entry.userId}</div>
              </div>
              <span>{entry.platform}</span>
              <span className="good-text">approved</span>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
