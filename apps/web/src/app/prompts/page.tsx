"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CopyPromptButton } from "@/components/CopyPromptButton";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge, Card, EmptyState, FilterChip, Input, PageHeader } from "@/components/ui";
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
    <div className="space-y-6">
      <PageHeader
        title="Prompt library"
        description="Reusable prompts you can copy, adapt, and paste into approved AI tools. Open a prompt for usage notes and examples."
      />

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <Input
          className="max-w-md"
          aria-label="Search prompts"
          placeholder="Search prompts…"
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
        <LoadingSpinner label="Loading prompts…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState title="No prompts match the current filters." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <Card key={item.slug} className="flex min-h-64 flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {item.attributes.audience ? (
                  <Badge variant="primary">{item.attributes.audience}</Badge>
                ) : null}
                {item.featured ? <Badge variant="featured">Featured</Badge> : null}
              </div>
              <h2 className="text-lg">
                <Link className="hover:text-carolina" href={`/prompts/${item.slug}`}>
                  {item.title}
                </Link>
              </h2>
              <p className="text-sm text-muted">{item.summary}</p>
              {typeof item.attributes.prompt === "string" ? (
                <div className="mt-auto pt-2">
                  <CopyPromptButton
                    text={item.attributes.prompt}
                    onCopied={() => void api.recordContentEvent(item.slug, "copy").catch(() => {})}
                  />
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
