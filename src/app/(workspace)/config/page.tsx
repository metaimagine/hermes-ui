import { ConfigEditor } from "@/components/config-editor";
import { ConfigStructuredForm } from "@/components/config-structured-form";
import { PageHeader } from "@/components/page-header";
import { getConfigSnapshot } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

function getModelInfo(parsed: Record<string, unknown>) {
  const model = parsed.model;
  if (!model || typeof model !== "object") {
    return { defaultModel: "unknown", provider: "unknown" };
  }
  const data = model as Record<string, unknown>;
  return {
    defaultModel: typeof data.default === "string" ? data.default : "unknown",
    provider: typeof data.provider === "string" ? data.provider : "unknown",
  };
}

export default async function ConfigPage() {
  const [config, prefs] = await Promise.all([getConfigSnapshot(), getUiPrefs()]);
  const modelInfo = getModelInfo(config.parsed);
  const t = prefs.messages.pages.config;

  return (
    <div className="stack-xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="stats-grid compact">
        <article className="stat-card card"><div className="stat-label">{t.topLevelKeys}</div><div className="stat-value">{config.topLevelKeys.length}</div></article>
        <article className="stat-card card"><div className="stat-label">{t.primaryModel}</div><div className="stat-value small-value">{modelInfo.defaultModel}</div></article>
        <article className="stat-card card"><div className="stat-label">{t.provider}</div><div className="stat-value small-value">{modelInfo.provider}</div></article>
      </section>

      <ConfigStructuredForm parsed={config.parsed} lang={prefs.lang} />

      <details className="card card-pad advanced-config">
        <summary className="advanced-summary">Advanced YAML</summary>
        <div className="advanced-body">
          <ConfigEditor initialRaw={config.raw} messages={prefs.messages} />
        </div>
      </details>
    </div>
  );
}
