"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { useApiClient } from "@/lib/api/useApiClient";
import type { MeResponse, Project, ProjectStatus } from "@/types";

const DEPARTMENTS = ["Finance", "Procurement", "Operations", "Other"];
// Lifecycle statuses that make sense for work that already exists.
const STATUSES: ProjectStatus[] = ["pilot", "active", "paused", "done"];

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function InventoryProjectPage() {
  const api = useApiClient();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [stakeholders, setStakeholders] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [summary, setSummary] = useState("");
  const [businessValue, setBusinessValue] = useState("");
  const [risks, setRisks] = useState("");
  const [dependencies, setDependencies] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [tools, setTools] = useState("");
  const [strategicCategory, setStrategicCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getMe()
      .then((profile) => {
        if (!cancelled) setMe(profile);
      })
      .finally(() => {
        if (!cancelled) setMeLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const project = await api.inventoryProject({
        name: name.trim(),
        department,
        ownerEmail: ownerEmail.trim(),
        sponsor: sponsor.trim(),
        stakeholders: splitList(stakeholders),
        status,
        summary: summary.trim(),
        businessValue: businessValue.trim(),
        risks: risks.trim(),
        dependencies: dependencies.trim(),
        nextSteps: nextSteps.trim(),
        toolsUsed: splitList(tools),
        strategicCategory: strategicCategory.trim(),
        startDate: startDate || null,
        targetDate: targetDate || null,
      });
      setSubmitted(project);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  // UX-only guard; the backend enforces editor access on the endpoint.
  if (meLoaded && !me?.isEditor) {
    return (
      <EmptyState title="Editor access required" action={<ButtonLink href="/projects">All projects</ButtonLink>}>
        <p>Only platform editors can inventory existing projects.</p>
      </EmptyState>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Project added to the registry" />
        <Card className="space-y-5">
          <p>
            <strong>{submitted.name}</strong> is now in the inventory as{" "}
            <Badge variant="primary">Inventoried</Badge> and visible to everyone across Finance
            &amp; Operations.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/projects/${submitted.id}`}>View project</ButtonLink>
            <ButtonLink variant="secondary" href="/projects">
              All projects
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory an existing project"
        description="Add a project that's already underway (or finished) so it shows up in the registry — ownership, status, and timeline included."
      />

      <Card>
        <form className="space-y-5" onSubmit={onSubmit}>
          <Field label="Project name *">
            <Input
              required
              minLength={3}
              maxLength={256}
              placeholder="e.g. Travel reimbursement automation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Department">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Select…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What is this project? *">
            <Textarea
              required
              minLength={10}
              rows={4}
              placeholder="What it does, who it serves, and where it stands today."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </Field>
          <Field label="Project owner email">
            <Input
              type="email"
              placeholder="owner@unc.edu"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </Field>
          <Field label="Sponsor">
            <Input
              placeholder="Executive sponsor or sponsoring unit"
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
            />
          </Field>
          <Field label="Stakeholders">
            <Input
              placeholder="Teams or people involved (comma-separated)"
              value={stakeholders}
              onChange={(e) => setStakeholders(e.target.value)}
            />
          </Field>
          <Field label="Strategic category">
            <Input
              maxLength={128}
              placeholder="e.g. automation, analytics, service improvement"
              value={strategicCategory}
              onChange={(e) => setStrategicCategory(e.target.value)}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Start date">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Target date">
              <Input
                type="date"
                min={startDate || undefined}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Business value">
            <Textarea
              rows={2}
              placeholder="Time saved, errors avoided, faster turnaround…"
              value={businessValue}
              onChange={(e) => setBusinessValue(e.target.value)}
            />
          </Field>
          <Field label="Tools / systems involved">
            <Input
              placeholder="e.g. UiPath, ConnectCarolina (comma-separated)"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
            />
          </Field>
          <Field label="Risks or concerns">
            <Textarea rows={2} value={risks} onChange={(e) => setRisks(e.target.value)} />
          </Field>
          <Field label="Dependencies">
            <Textarea
              rows={2}
              value={dependencies}
              onChange={(e) => setDependencies(e.target.value)}
            />
          </Field>
          <Field label="Next steps">
            <Textarea rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
          </Field>

          {error ? <ErrorState error={error} /> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add to registry"}
            </Button>
            <ButtonLink variant="secondary" href="/projects">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
