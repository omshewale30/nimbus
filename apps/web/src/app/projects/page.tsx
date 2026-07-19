"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatusPill } from "@/components/StatusPill";
import { Badge, ButtonLink, Card, EmptyState, FilterChip, Input, PageHeader } from "@/components/ui";
import { useApiClient } from "@/lib/api/useApiClient";
import type { MeResponse, Project, ProjectSource, ProjectStatus } from "@/types";

const STATUS_FILTERS: { label: string; status: ProjectStatus | null }[] = [
  { label: "All", status: null },
  { label: "Proposed", status: "proposed" },
  { label: "Idea", status: "idea" },
  { label: "Pilot", status: "pilot" },
  { label: "Active", status: "active" },
  { label: "Paused", status: "paused" },
  { label: "Done", status: "done" },
  { label: "Rejected", status: "rejected" },
];

const SOURCE_FILTERS: { label: string; source: ProjectSource | null }[] = [
  { label: "All sources", source: null },
  { label: "Proposals", source: "proposed" },
  { label: "Inventoried", source: "inventoried" },
];

const STALE_DAYS = 90;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function updatedLabel(iso: string): string {
  const days = daysSince(iso);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function ProjectsPage() {
  const api = useApiClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [source, setSource] = useState<ProjectSource | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, profile] = await Promise.all([
        api.listProjects({ includeArchived: showArchived }),
        api.getMe(),
      ]);
      setProjects(list.items);
      setMe(profile);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [api, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const departments = useMemo(() => {
    const all = new Set<string>();
    projects.forEach((p) => p.department && all.add(p.department));
    return Array.from(all).sort();
  }, [projects]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (status === null || p.status === status) &&
        (department === null || p.department === department) &&
        (source === null || p.source === source) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q)),
    );
  }, [projects, status, department, source, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI project inventory"
        description="Every AI project, pilot, and use case across Finance & Operations: who owns it, where it stands, and what's next."
        actions={
          <div className="flex flex-wrap gap-2">
            {me?.isEditor ? (
              <ButtonLink variant="secondary" href="/projects/inventory">
                Inventory existing project
              </ButtonLink>
            ) : null}
            <ButtonLink href="/propose">Propose an AI use case</ButtonLink>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          className="max-w-xs"
          placeholder="Search projects…"
          aria-label="Search projects"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by source">
          {SOURCE_FILTERS.map((f) => (
            <FilterChip
              key={f.label}
              type="button"
              active={source === f.source}
              onClick={() => setSource(f.source)}
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
        {me?.isEditor ? (
          <FilterChip
            type="button"
            active={showArchived}
            onClick={() => setShowArchived((v) => !v)}
          >
            Show archived
          </FilterChip>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <FilterChip
            key={f.label}
            type="button"
            active={status === f.status}
            onClick={() => setStatus(f.status)}
          >
            {f.label}
          </FilterChip>
        ))}
      </div>

      {departments.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by department">
          {departments.map((d) => (
            <FilterChip
              key={d}
              type="button"
              active={department === d}
              onClick={() => setDepartment(department === d ? null : d)}
            >
              {d}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {loading ? (
        <LoadingSpinner label="Loading projects…" />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState title="No projects match the current filters.">
          <p>
            No projects match the current filters.{" "}
            <Link className="font-medium" href="/propose">
              Propose the first one
            </Link>
            .
          </p>
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-cloud/60 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr
                  key={p.id}
                  className={
                    p.archivedAt
                      ? "border-b border-border opacity-60 last:border-b-0"
                      : "border-b border-border last:border-b-0"
                  }
                >
                  <td className="px-4 py-3 align-top">
                    <Link className="font-medium" href={`/projects/${p.id}`}>
                      {p.name}
                    </Link>
                    <Badge className="ml-2" variant={p.source === "inventoried" ? "primary" : "default"}>
                      {p.source === "inventoried" ? "Inventoried" : "Proposal"}
                    </Badge>
                    {p.archivedAt ? (
                      <Badge className="ml-2" variant="warning">
                        Archived
                      </Badge>
                    ) : null}
                    {me?.isEditor && p.status === "proposed" ? (
                      <Badge className="ml-2" variant="featured">
                        Needs triage
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">{p.department || "—"}</td>
                  <td className="px-4 py-3 align-top">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3 align-top">{p.ownerEmail || "—"}</td>
                  <td
                    className={
                      daysSince(p.updatedAt) >= STALE_DAYS
                        ? "px-4 py-3 align-top text-warning"
                        : "px-4 py-3 align-top"
                    }
                  >
                    {updatedLabel(p.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
