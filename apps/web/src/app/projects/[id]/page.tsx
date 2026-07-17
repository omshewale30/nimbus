"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatusPill } from "@/components/StatusPill";
import { useApiClient } from "@/lib/api/useApiClient";
import type { MeResponse, Project, ProjectStatus, ProjectWritePayload } from "@/types";

const STATUSES: ProjectStatus[] = [
  "proposed",
  "idea",
  "pilot",
  "active",
  "paused",
  "done",
  "rejected",
];

export default function ProjectDetailPage() {
  const api = useApiClient();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProjectWritePayload>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, profile] = await Promise.all([api.getProject(id), api.getMe()]);
      setProject(p);
      setMe(profile);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    if (Number.isFinite(id)) void load();
  }, [id, load]);

  function startEditing(p: Project) {
    setForm({
      status: p.status,
      ownerEmail: p.ownerEmail,
      sponsor: p.sponsor,
      summary: p.summary,
      businessValue: p.businessValue,
      risks: p.risks,
      dependencies: p.dependencies,
      nextSteps: p.nextSteps,
      triageNote: p.triageNote,
    });
    setSaveError(null);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateProject(id, form);
      setProject(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof ProjectWritePayload>(key: K, value: ProjectWritePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <LoadingSpinner label="Loading project…" />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!project) return null;

  return (
    <>
      <p>
        <Link href="/projects">← All projects</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{project.name}</h1>
          <div className="chip-row">
            <StatusPill status={project.status} />
            {project.department ? <span className="chip">{project.department}</span> : null}
            {project.toolsUsed.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </div>
        {me?.isEditor && !editing ? (
          <button className="btn btn-secondary" type="button" onClick={() => startEditing(project)}>
            Edit / triage
          </button>
        ) : null}
      </div>

      {editing ? (
        <form className="card form-grid" onSubmit={save}>
          <label>
            Status
            <select
              className="input"
              value={form.status}
              onChange={(e) => set("status", e.target.value as ProjectStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Owner email
            <input
              className="input"
              value={form.ownerEmail ?? ""}
              onChange={(e) => set("ownerEmail", e.target.value)}
            />
          </label>
          <label>
            Sponsor
            <input
              className="input"
              value={form.sponsor ?? ""}
              onChange={(e) => set("sponsor", e.target.value)}
            />
          </label>
          <label>
            Summary
            <textarea
              className="input"
              rows={3}
              value={form.summary ?? ""}
              onChange={(e) => set("summary", e.target.value)}
            />
          </label>
          <label>
            Business value
            <textarea
              className="input"
              rows={2}
              value={form.businessValue ?? ""}
              onChange={(e) => set("businessValue", e.target.value)}
            />
          </label>
          <label>
            Risks
            <textarea
              className="input"
              rows={2}
              value={form.risks ?? ""}
              onChange={(e) => set("risks", e.target.value)}
            />
          </label>
          <label>
            Dependencies
            <textarea
              className="input"
              rows={2}
              value={form.dependencies ?? ""}
              onChange={(e) => set("dependencies", e.target.value)}
            />
          </label>
          <label>
            Next steps
            <textarea
              className="input"
              rows={2}
              value={form.nextSteps ?? ""}
              onChange={(e) => set("nextSteps", e.target.value)}
            />
          </label>
          <label>
            Triage note {form.status === "rejected" ? "(required when rejecting)" : ""}
            <textarea
              className="input"
              rows={2}
              value={form.triageNote ?? ""}
              onChange={(e) => set("triageNote", e.target.value)}
            />
          </label>

          {saveError ? <ErrorState error={saveError} /> : null}

          <div className="form-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="card">
            <dl className="kv">
              <dt>Summary</dt>
              <dd>{project.summary || "—"}</dd>
              <dt>Business value</dt>
              <dd>{project.businessValue || "—"}</dd>
              <dt>Risks</dt>
              <dd>{project.risks || "—"}</dd>
              <dt>Dependencies</dt>
              <dd>{project.dependencies || "—"}</dd>
              <dt>Next steps</dt>
              <dd>{project.nextSteps || "—"}</dd>
              {project.triageNote ? (
                <>
                  <dt>Triage note</dt>
                  <dd>{project.triageNote}</dd>
                </>
              ) : null}
            </dl>
          </div>
          <div className="card">
            <dl className="kv">
              <dt>Owner</dt>
              <dd>{project.ownerEmail || "—"}</dd>
              <dt>Sponsor</dt>
              <dd>{project.sponsor || "—"}</dd>
              <dt>Submitted by</dt>
              <dd>{project.submittedBy || "—"}</dd>
              <dt>Last updated</dt>
              <dd>
                {new Date(project.updatedAt).toLocaleDateString()}
                {project.lastUpdatedBy ? ` by ${project.lastUpdatedBy}` : ""}
              </dd>
            </dl>
          </div>
        </>
      )}
    </>
  );
}
