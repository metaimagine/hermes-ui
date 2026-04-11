import { PageHeader } from "@/components/page-header";
import { getApprovalSnapshot } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

function formatTimestamp(value?: number) {
  if (!value) return "—";
  return new Date(value * 1000).toLocaleString();
}

export default async function ApprovalsPage() {
  const [approvals, prefs] = await Promise.all([getApprovalSnapshot(), getUiPrefs()]);
  const t = prefs.messages.pages.approvals;

  return (
    <div className="stack-xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="stats-grid compact">
        <article className="stat-card card"><div className="stat-label">pending</div><div className="stat-value">{approvals.pending.length}</div></article>
        <article className="stat-card card"><div className="stat-label">approved</div><div className="stat-value">{approvals.approved.length}</div></article>
        <article className="stat-card card"><div className="stat-label">platforms</div><div className="stat-value">{Array.from(new Set([...approvals.pending.map((x) => x.platform), ...approvals.approved.map((x) => x.platform)])).length}</div></article>
      </section>

      <section className="two-column-grid">
        <article className="card card-pad stack-md">
          <div className="row-between"><h3 className="section-title">{t.pending}</h3><span className="pill warn">{approvals.pending.length}</span></div>
          <div className="table-head approval-grid"><span>identity</span><span>platform</span><span>code</span><span>created</span></div>
          {approvals.pending.map((entry) => (
            <div className="table-row approval-grid" key={`${entry.platform}:${entry.code}`}>
              <div>
                <div className="list-title">{entry.userName || entry.userId}</div>
                <div className="list-meta mono">{entry.userId}</div>
              </div>
              <span>{entry.platform}</span>
              <span className="mono">{entry.code}</span>
              <span>{formatTimestamp(entry.createdAt)}</span>
            </div>
          ))}
          {approvals.pending.length === 0 ? <div className="empty-state">{t.noPending}</div> : null}
        </article>

        <article className="card card-pad stack-md">
          <div className="row-between"><h3 className="section-title">{t.approved}</h3><span className="pill good">{approvals.approved.length}</span></div>
          <div className="table-head approval-grid"><span>identity</span><span>platform</span><span>status</span><span>approved_at</span></div>
          {approvals.approved.map((entry) => (
            <div className="table-row approval-grid" key={`${entry.platform}:${entry.userId}`}>
              <div>
                <div className="list-title">{entry.userName || entry.userId}</div>
                <div className="list-meta mono">{entry.userId}</div>
              </div>
              <span>{entry.platform}</span>
              <span className="good-text">approved</span>
              <span>{formatTimestamp(entry.approvedAt)}</span>
            </div>
          ))}
          {approvals.approved.length === 0 ? <div className="empty-state">{t.noApproved}</div> : null}
        </article>
      </section>
    </div>
  );
}
