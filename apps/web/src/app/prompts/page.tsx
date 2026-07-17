"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CopyPromptButton } from "@/components/CopyPromptButton";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useApiClient } from "@/lib/api/useApiClient";
import { useContentList } from "@/lib/api/useContent";

export default function PromptsPage() {
  const api = useApiClient();
  const { items, loading, error, reload } = useContentList("prompt");
  const [tag, setTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const tags = useMemo(() => {
    const all = new Set<string>();
    items.forEach((i) => i.tags.forEach((t) => all.add(t)));
    return Array.from(all).sort();
  }, [items]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (tag === null || i.tags.includes(tag)) &&
        (needle === "" ||
          i.title.toLowerCase().includes(needle) ||
          i.summary.toLowerCase().includes(needle)),
    );
  }, [items, tag, search]);

  return (
    <>
      <h1>Prompt library</h1>
      <p className="muted">
        Reusable prompts you can copy, adapt, and paste into approved AI tools. Open a prompt for
        usage notes and examples.
      </p>

      <div className="filters">
        <input
          className="input"
          aria-label="Search prompts"
          placeholder="Search prompts…"
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
        <LoadingSpinner label="Loading prompts…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <p className="muted">No prompts match the current filters.</p>
      ) : (
        <div className="card-grid">
          {visible.map((item) => (
            <div key={item.slug} className="card content-card">
              <div className="chip-row">
                {item.attributes.audience ? (
                  <span className="chip chip-kind">{item.attributes.audience}</span>
                ) : null}
                {item.featured ? <span className="chip chip-featured">Featured</span> : null}
              </div>
              <h2>
                <Link href={`/prompts/${item.slug}`}>{item.title}</Link>
              </h2>
              <p className="muted">{item.summary}</p>
              {typeof item.attributes.prompt === "string" ? (
                <CopyPromptButton
                  text={item.attributes.prompt}
                  onCopied={() => void api.recordContentEvent(item.slug, "copy").catch(() => {})}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
