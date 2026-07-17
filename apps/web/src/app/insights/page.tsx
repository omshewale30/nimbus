"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatusPill } from "@/components/StatusPill";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { useApiClient } from "@/lib/api/useApiClient";
import type { InsightsSummary, ProjectStatus } from "@/types";

const STATUS_ORDER: ProjectStatus[] = [
  "proposed",
  "idea",
  "pilot",
  "active",
  "paused",
  "done",
  "rejected",
];

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="text-3xl font-semibold tabular-nums text-navy">{value}</div>
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </Card>
  );
}

/** Thin magnitude bar: single hue, rounded data end, value labeled in ink. */
function CountBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cloud">
        <div
          className="h-full rounded-full bg-carolina"
          style={{ width: `${width}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="w-8 text-right text-sm tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export default function InsightsPage() {
  const api = useApiClient();
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.getInsightsSummary());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingSpinner label="Loading insights..." />;
  if (error || !summary) return <ErrorState error={error} onRetry={load} />;

  const windowLabel = `last ${summary.windowDays} days`;
  const maxStatus = Math.max(...STATUS_ORDER.map((s) => summary.projectsByStatus[s] ?? 0));
  const maxCopies = Math.max(...summary.topCopied.map((t) => t.copies), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="How Nimbus is being used: published content, the project pipeline, and recent activity. Counts only — nothing here is tracked per person."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Published guides" value={summary.publishedGuides} />
        <StatTile label="Prompts in the library" value={summary.publishedPrompts} />
        <StatTile label="New proposals" value={summary.intakesLast30d} hint={windowLabel} />
        <StatTile label="Prompt copies" value={summary.copiesLast30d} hint={windowLabel} />
        <StatTile label="Questions asked" value={summary.asksLast30d} hint={windowLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg">Projects by status</h2>
            <Link className="text-sm font-medium text-navy underline decoration-carolina/40" href="/projects">
              View inventory
            </Link>
          </div>
          {summary.projectsTotal === 0 ? (
            <EmptyState title="No projects yet.">
              Proposals submitted via “Propose an AI use case” land here.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {STATUS_ORDER.map((status) => (
                <li key={status} className="flex items-center gap-3">
                  <span className="w-24 shrink-0">
                    <StatusPill status={status} />
                  </span>
                  <CountBar value={summary.projectsByStatus[status] ?? 0} max={maxStatus} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg">Most copied ({windowLabel})</h2>
            <Link className="text-sm font-medium text-navy underline decoration-carolina/40" href="/prompts">
              Prompt library
            </Link>
          </div>
          {summary.topCopied.length === 0 ? (
            <EmptyState title="No copies yet.">
              Copy counts appear once staff start using the prompt library.
            </EmptyState>
          ) : (
            <ol className="space-y-3">
              {summary.topCopied.map((item) => (
                <li key={item.slug} className="flex items-center gap-3">
                  <Link
                    className="w-2/5 shrink-0 truncate text-sm font-medium text-navy hover:underline"
                    href={`/prompts/${item.slug}`}
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                  <CountBar value={item.copies} max={maxCopies} />
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
