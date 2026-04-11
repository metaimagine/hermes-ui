import { PageHeader } from "@/components/page-header";
import { getCronSnapshot } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

export default async function CronPage() {
  const [cron, prefs] = await Promise.all([getCronSnapshot(), getUiPrefs()]);
  const t = prefs.messages.pages.cron;
  const jobLines = cron.jobsText.split("\n").filter((line) => line.trim()).length;

  return (
    <div className="stack-xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="stats-grid compact">
        <article className="stat-card card"><div className="stat-label">artifacts</div><div className="stat-value">{cron.artifactFiles.length}</div></article>
        <article className="stat-card card"><div className="stat-label">job lines</div><div className="stat-value">{jobLines}</div></article>
        <article className="stat-card card"><div className="stat-label">scheduler</div><div className="stat-value small-value">{/running|loaded/i.test(cron.statusText) ? 'active' : 'idle'}</div></article>
      </section>

      <section className="two-column-grid wide-right">
        <article className="card card-pad stack-md">
          <h3 className="section-title">{t.schedulerStatus}</h3>
          <pre className="terminal-block">{cron.statusText || 'No status output.'}</pre>
        </article>
        <article className="card card-pad stack-md">
          <h3 className="section-title">{t.jobs}</h3>
          <pre className="terminal-block">{cron.jobsText || 'No job listing output.'}</pre>
        </article>
      </section>

      <section className="card card-pad stack-md">
        <div className="row-between"><h3 className="section-title">{t.artifactFiles}</h3><span className="pill">{cron.artifactFiles.length}</span></div>
        <div className="stack-sm">
          {cron.artifactFiles.map((file) => <div className="list-row" key={file}><span className="mono">{file}</span></div>)}
          {cron.artifactFiles.length === 0 ? <div className="empty-state">{t.noArtifacts}</div> : null}
        </div>
      </section>
    </div>
  );
}
