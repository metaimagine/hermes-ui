import { MemoryExplorer } from "@/components/memory-explorer";
import { PageHeader } from "@/components/page-header";
import { getMemorySnapshot } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

export default async function MemoryPage() {
  const [memory, prefs] = await Promise.all([getMemorySnapshot(), getUiPrefs()]);
  const t = prefs.messages.pages.memory;

  return (
    <div className="stack-xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="stats-grid compact">
        <article className="stat-card card"><div className="stat-label">entries</div><div className="stat-value">{memory.entries.length}</div></article>
        <article className="stat-card card"><div className="stat-label">scope types</div><div className="stat-value">{Array.from(new Set(memory.entries.map((entry) => entry.scope))).length}</div></article>
        <article className="stat-card card"><div className="stat-label">raw chars</div><div className="stat-value small-value">{memory.raw.length}</div></article>
      </section>

      <section className="two-column-grid wide-right">
        <article className="card card-pad stack-md">
          <h3 className="section-title">{t.entries}</h3>
          <MemoryExplorer entries={memory.entries} emptyText={t.noEntries} />
        </article>
        <article className="card card-pad stack-md">
          <h3 className="section-title">{t.rawFile}</h3>
          <pre className="terminal-block">{memory.raw || t.noRaw}</pre>
        </article>
      </section>
    </div>
  );
}
