"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatusPill } from "@/components/StatusPill";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
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

function DetailList({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[160px_1fr]">{children}</dl>;
}

function DetailTerm({ children }: { children: React.ReactNode }) {
  return <dt className="font-medium text-muted">{children}</dt>;
}

export default function ProjectDetailPage() {
  const api = useApiClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProjectWritePayload>({});
  const [stakeholdersText, setStakeholdersText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [acting, setActing] = useState(false);

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
      strategicCategory: p.strategicCategory,
      startDate: p.startDate,
      targetDate: p.targetDate,
    });
    setStakeholdersText(p.stakeholders.join(", "));
    setSaveError(null);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateProject(id, {
        ...form,
        stakeholders: stakeholdersText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProject(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(p: Project) {
    if (acting) return;
    setActing(true);
    setActionError(null);
    try {
      const updated = p.archivedAt
        ? await api.unarchiveProject(p.id)
        : await api.archiveProject(p.id);
      setProject(updated);
    } catch (err) {
      setActionError(err);
    } finally {
      setActing(false);
    }
  }

  async function remove(p: Project) {
    if (acting) return;
    if (!window.confirm(`Permanently delete "${p.name}"? Archiving is usually the better call.`)) {
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await api.deleteProject(p.id);
      router.push("/projects");
    } catch (err) {
      setActionError(err);
      setActing(false);
    }
  }

  function set<K extends keyof ProjectWritePayload>(key: K, value: ProjectWritePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <LoadingSpinner label="Loading project…" />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <Link className="text-sm font-medium text-muted hover:text-carolina" href="/projects">
        ← All projects
      </Link>

      <PageHeader
        title={project.name}
        actions={
          me?.isEditor && !editing ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" type="button" onClick={() => startEditing(project)}>
                Edit / triage
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={acting}
                onClick={() => void toggleArchive(project)}
              >
                {project.archivedAt ? "Unarchive" : "Archive"}
              </Button>
              <Button
                variant="ghost"
                type="button"
                className="text-danger"
                disabled={acting}
                onClick={() => void remove(project)}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      />

      <div className="-mt-4 flex flex-wrap gap-2">
        <StatusPill status={project.status} />
        <Badge variant={project.source === "inventoried" ? "primary" : "default"}>
          {project.source === "inventoried" ? "Inventoried" : "Proposal"}
        </Badge>
        {project.archivedAt ? <Badge variant="warning">Archived</Badge> : null}
        {project.department ? <Badge>{project.department}</Badge> : null}
        {project.strategicCategory ? <Badge>{project.strategicCategory}</Badge> : null}
        {project.toolsUsed.map((tool) => (
          <Badge key={tool}>{tool}</Badge>
        ))}
      </div>

      {actionError ? <ErrorState error={actionError} /> : null}

      {editing ? (
        <Card>
          <form className="space-y-5" onSubmit={save}>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => set("status", e.target.value as ProjectStatus)}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Owner email">
              <Input
                value={form.ownerEmail ?? ""}
                onChange={(e) => set("ownerEmail", e.target.value)}
              />
            </Field>

            <Field label="Sponsor">
              <Input value={form.sponsor ?? ""} onChange={(e) => set("sponsor", e.target.value)} />
            </Field>

            <Field label="Stakeholders (comma-separated)">
              <Input
                value={stakeholdersText}
                onChange={(e) => setStakeholdersText(e.target.value)}
              />
            </Field>

            <Field label="Strategic category">
              <Input
                maxLength={128}
                value={form.strategicCategory ?? ""}
                onChange={(e) => set("strategicCategory", e.target.value)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start date">
                <Input
                  type="date"
                  value={form.startDate ?? ""}
                  onChange={(e) => set("startDate", e.target.value || null)}
                />
              </Field>
              <Field label="Target date">
                <Input
                  type="date"
                  min={form.startDate ?? undefined}
                  value={form.targetDate ?? ""}
                  onChange={(e) => set("targetDate", e.target.value || null)}
                />
              </Field>
            </div>

            <Field label="Summary">
              <Textarea
                rows={3}
                value={form.summary ?? ""}
                onChange={(e) => set("summary", e.target.value)}
              />
            </Field>

            <Field label="Business value">
              <Textarea
                rows={2}
                value={form.businessValue ?? ""}
                onChange={(e) => set("businessValue", e.target.value)}
              />
            </Field>

            <Field label="Risks">
              <Textarea
                rows={2}
                value={form.risks ?? ""}
                onChange={(e) => set("risks", e.target.value)}
              />
            </Field>

            <Field label="Dependencies">
              <Textarea
                rows={2}
                value={form.dependencies ?? ""}
                onChange={(e) => set("dependencies", e.target.value)}
              />
            </Field>

            <Field label="Next steps">
              <Textarea
                rows={2}
                value={form.nextSteps ?? ""}
                onChange={(e) => set("nextSteps", e.target.value)}
              />
            </Field>

            <Field
              label={`Triage note ${
                form.status === "rejected" ? "(required when rejecting)" : ""
              }`}
            >
              <Textarea
                rows={2}
                value={form.triageNote ?? ""}
                onChange={(e) => set("triageNote", e.target.value)}
              />
            </Field>

            {saveError ? <ErrorState error={saveError} /> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <Card>
            <DetailList>
              <DetailTerm>Summary</DetailTerm>
              <dd>{project.summary || "—"}</dd>
              <DetailTerm>Business value</DetailTerm>
              <dd>{project.businessValue || "—"}</dd>
              <DetailTerm>Risks</DetailTerm>
              <dd>{project.risks || "—"}</dd>
              <DetailTerm>Dependencies</DetailTerm>
              <dd>{project.dependencies || "—"}</dd>
              <DetailTerm>Next steps</DetailTerm>
              <dd>{project.nextSteps || "—"}</dd>
              {project.triageNote ? (
                <>
                  <DetailTerm>Triage note</DetailTerm>
                  <dd>{project.triageNote}</dd>
                </>
              ) : null}
            </DetailList>
          </Card>

          <Card>
            <DetailList>
              <DetailTerm>Owner</DetailTerm>
              <dd>{project.ownerEmail || "—"}</dd>
              <DetailTerm>Sponsor</DetailTerm>
              <dd>{project.sponsor || "—"}</dd>
              <DetailTerm>Stakeholders</DetailTerm>
              <dd>{project.stakeholders.length ? project.stakeholders.join(", ") : "—"}</dd>
              <DetailTerm>Start date</DetailTerm>
              <dd>{project.startDate ?? "—"}</dd>
              <DetailTerm>Target date</DetailTerm>
              <dd>{project.targetDate ?? "—"}</dd>
              <DetailTerm>Submitted by</DetailTerm>
              <dd>{project.submittedBy || "—"}</dd>
              <DetailTerm>Last updated</DetailTerm>
              <dd>
                {new Date(project.updatedAt).toLocaleDateString()}
                {project.lastUpdatedBy ? ` by ${project.lastUpdatedBy}` : ""}
              </dd>
              {project.archivedAt ? (
                <>
                  <DetailTerm>Archived</DetailTerm>
                  <dd>
                    {new Date(project.archivedAt).toLocaleDateString()}
                    {project.archivedBy ? ` by ${project.archivedBy}` : ""}
                  </dd>
                </>
              ) : null}
            </DetailList>
          </Card>
        </>
      )}
    </div>
  );
}
