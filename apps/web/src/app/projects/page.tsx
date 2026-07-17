"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatusPill } from "@/components/StatusPill";
import { useApiClient } from "@/lib/api/useApiClient";
import type { MeResponse, Project, ProjectStatus } from "@/types";

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, profile] = await Promise.all([api.listProjects(), api.getMe()]);
      setProjects(list.items);
      setMe(profile);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const departments = useMemo(() => {
    const all = new Set<string>();
    projects.forEach((p) => p.department && all.add(p.department));
    return Array.from(all).sort();
  }, [projects]);

  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (status === null || p.status === status) &&
          (department === null || p.department === department),
      ),
    [projects, status, department],
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>AI project inventory</h1>
          <p className="muted">
            Every AI project, pilot, and use case across Finance &amp; Operations — who owns it,
            where it stands, and what&apos;s next.
          </p>
        </div>
        <Link className="btn" href="/propose">
          Propose an AI use case
        </Link>
      </div>

      <div className="chip-row chip-row-tags" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={status === f.status ? "chip chip-active" : "chip"}
            onClick={() => setStatus(f.status)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {departments.length > 1 ? (
        <div className="chip-row chip-row-tags" role="group" aria-label="Filter by department">
          {departments.map((d) => (
            <button
              key={d}
              type="button"
              className={department === d ? "chip chip-active" : "chip"}
              onClick={() => setDepartment(department === d ? null : d)}
            >
              {d}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <LoadingSpinner label="Loading projects…" />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <div className="card">
          <p className="muted">
            No projects match the current filters.{" "}
            <Link href="/propose">Propose the first one</Link>.
          </p>
        </div>
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Department</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/projects/${p.id}`}>{p.name}</Link>
                    {me?.isEditor && p.status === "proposed" ? (
                      <span className="chip chip-featured">Needs triage</span>
                    ) : null}
                  </td>
                  <td>{p.department || "—"}</td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td>{p.ownerEmail || "—"}</td>
                  <td className={daysSince(p.updatedAt) >= STALE_DAYS ? "stale" : undefined}>
                    {updatedLabel(p.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
