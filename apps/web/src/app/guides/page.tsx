"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge, CardLink, EmptyState, FilterChip, Input, PageHeader } from "@/components/ui";
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
    <div className="space-y-6">
      <PageHeader
        title="Guides"
        description="Step-by-step playbooks, acceptable-use guidance, and the AI tool registry."
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
          {KIND_FILTERS.map((f) => (
            <FilterChip
              key={f.label}
              type="button"
              active={kind === f.kind}
              onClick={() => setKind(f.kind)}
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
        <Input
          className="max-w-md"
          aria-label="Search guides"
          placeholder="Search guides…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          {tags.map((t) => (
            <FilterChip
              key={t}
              type="button"
              active={tag === t}
              onClick={() => setTag(tag === t ? null : t)}
            >
              {t}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {loading ? (
        <LoadingSpinner label="Loading guides…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState title="No guides match the current filters." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <CardLink key={item.slug} href={`/guides/${item.slug}`}>
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">{KIND_LABEL[item.kind] ?? item.kind}</Badge>
                {item.featured ? <Badge variant="featured">Featured</Badge> : null}
              </div>
              <h2 className="text-lg">{item.title}</h2>
              <p className="text-sm text-muted">{item.summary}</p>
            </CardLink>
          ))}
        </div>
      )}
    </div>
  );
}
