"use client";

import { useMemo, useState } from "react";
import type { SkillCategory } from "@/lib/hermes/types";

export function SkillsBrowser({ categories }: { categories: SkillCategory[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(needle) || category.sampleSkills.some((skill) => skill.toLowerCase().includes(needle)));
  }, [categories, query]);

  return (
    <div className="stack-lg">
      <input className="toolbar-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search skill categories or sample skills" />
      <section className="card-grid">
        {filtered.map((category) => (
          <article className="card card-pad stack-md" key={category.name}>
            <div className="row-between">
              <h3 className="section-title">{category.name}</h3>
              <span className="pill">{category.skillCount}</span>
            </div>
            <div className="tag-row">
              {category.sampleSkills.map((skill) => (
                <span className="tag" key={skill}>{skill}</span>
              ))}
            </div>
          </article>
        ))}
      </section>
      {filtered.length === 0 ? <div className="empty-state">No categories match the current search.</div> : null}
    </div>
  );
}
