"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useContentList } from "@/lib/api/useContent";
import type { ContentKind } from "@/types";

const KIND_FILTERS: { label: string; kind: ContentKind | null }[] = [
  { label: "All", kind: null },
  { label: "Playbooks", kind: "playbook" },
  { label: "Guidance", kind: "guidance" },
  { label: "Tools", kind: "tool" },
];

const KIND_LABEL: Record<string, string> = {
  playbook: "Playbook",
  guidance: "Guidance",
  tool: "Tool",
  prompt: "Prompt",
};

export default function GuidesPage() {
  const { items, loading, error, reload } = useContentList();
  const [kind, setKind] = useState<ContentKind | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Guides = everything except prompts (those have their own library page).
  const guides = useMemo(() => items.filter((i) => i.kind !== "prompt"), [items]);

  const tags = useMemo(() => {
    const all = new Set<string>();
    guides.forEach((i) => i.tags.forEach((t) => all.add(t)));
    return Array.from(all).sort();
  }, [guides]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return guides.filter(
      (i) =>
        (kind === null || i.kind === kind) &&
        (tag === null || i.tags.includes(tag)) &&
        (needle === "" ||
          i.title.toLowerCase().includes(needle) ||
          i.summary.toLowerCase().includes(needle)),
    );
  }, [guides, kind, tag, search]);

  return (
    <>
      <h1>Guides</h1>
      <p className="muted">
        Step-by-step playbooks, acceptable-use guidance, and the AI tool registry.
      </p>

      <div className="filters">
        <div className="chip-row" role="group" aria-label="Filter by kind">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              className={kind === f.kind ? "chip chip-active" : "chip"}
              onClick={() => setKind(f.kind)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          aria-label="Search guides"
          placeholder="Search guides…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {tags.length > 0 ? (
        <div className="chip-row chip-row-tags" role="group" aria-label="Filter by tag">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className={tag === t ? "chip chip-active" : "chip"}
              onClick={() => setTag(tag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <LoadingSpinner label="Loading guides…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <p className="muted">No guides match the current filters.</p>
      ) : (
        <div className="card-grid">
          {visible.map((item) => (
            <Link key={item.slug} className="card content-card" href={`/guides/${item.slug}`}>
              <div className="chip-row">
                <span className="chip chip-kind">{KIND_LABEL[item.kind] ?? item.kind}</span>
                {item.featured ? <span className="chip chip-featured">Featured</span> : null}
              </div>
              <h2>{item.title}</h2>
              <p className="muted">{item.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
