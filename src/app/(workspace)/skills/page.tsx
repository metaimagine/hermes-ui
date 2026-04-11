import { PageHeader } from "@/components/page-header";
import { SkillsBrowser } from "@/components/skills-browser";
import { getSkillsSnapshot } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

export default async function SkillsPage() {
  const [skills, prefs] = await Promise.all([getSkillsSnapshot(), getUiPrefs()]);
  const t = prefs.messages.pages.skills;
  const totalSkills = skills.categories.reduce((sum, category) => sum + category.skillCount, 0);
  const largestCategory = skills.categories[0];

  return (
    <div className="stack-xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="stats-grid compact">
        <article className="stat-card card"><div className="stat-label">categories</div><div className="stat-value">{skills.totalCategories}</div></article>
        <article className="stat-card card"><div className="stat-label">skills total</div><div className="stat-value">{totalSkills}</div></article>
        <article className="stat-card card"><div className="stat-label">largest category</div><div className="stat-value small-value">{largestCategory?.name ?? 'n/a'}</div></article>
      </section>

      <SkillsBrowser categories={skills.categories} />
    </div>
  );
}
