"use client";

import { useMemo, useState } from "react";
import type { MemoryEntry } from "@/lib/hermes/types";

export function MemoryExplorer({ entries, emptyText }: { entries: MemoryEntry[]; emptyText: string }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => entry.text.toLowerCase().includes(needle) || entry.scope.toLowerCase().includes(needle));
  }, [entries, query]);

  return (
    <div className="stack-md">
      <input
        className="toolbar-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search memory entries"
      />
      <div className="stack-sm">
        {filtered.map((entry, index) => (
          <div className="memory-card" key={`${entry.scope}-${index}`}>
            <div className="pill">{entry.scope}</div>
            <p>{entry.text}</p>
          </div>
        ))}
        {filtered.length === 0 ? <div className="empty-state">{emptyText}</div> : null}
      </div>
    </div>
  );
}
