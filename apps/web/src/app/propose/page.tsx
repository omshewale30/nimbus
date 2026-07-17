"use client";

import { useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { useApiClient } from "@/lib/api/useApiClient";
import type { Project } from "@/types";

const DEPARTMENTS = ["Finance", "Procurement", "Operations", "Other"];

export default function ProposePage() {
  const api = useApiClient();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [summary, setSummary] = useState("");
  const [businessValue, setBusinessValue] = useState("");
  const [risks, setRisks] = useState("");
  const [tools, setTools] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState<Project | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const project = await api.submitIntake({
        name: name.trim(),
        department,
        summary: summary.trim(),
        businessValue: businessValue.trim(),
        risks: risks.trim(),
        toolsUsed: tools
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setSubmitted(project);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Thanks — proposal submitted" />
        <Card className="space-y-5">
          <p>
            <strong>{submitted.name}</strong> is now in the inventory as{" "}
            <Badge variant="warning">Proposed</Badge> and will be reviewed by the platform editors.
            You can follow its status on the projects page.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/projects/${submitted.id}`}>View your proposal</ButtonLink>
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
        title="Propose an AI use case"
        description="Have an idea where AI could help your team — or already experimenting? Tell us about it. Proposals go into the project inventory for review; no idea is too small."
      />

      <Card>
        <form className="space-y-5" onSubmit={onSubmit}>
          <Field label="Name your idea *">
            <Input
              required
              minLength={3}
              maxLength={256}
              placeholder="e.g. AI-assisted invoice triage"
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
          <Field label="What problem would it solve? *">
            <Textarea
              required
              minLength={10}
              rows={4}
              placeholder="Describe the task or process today and where AI could help."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </Field>
          <Field label="Expected value">
            <Textarea
              rows={2}
              placeholder="Time saved, errors avoided, faster turnaround…"
              value={businessValue}
              onChange={(e) => setBusinessValue(e.target.value)}
            />
          </Field>
          <Field label="Tools involved">
            <Input
              placeholder="e.g. Microsoft 365 Copilot, Excel (comma-separated)"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
            />
          </Field>
          <Field label="Risks or concerns">
            <Textarea
              rows={2}
              placeholder="Sensitive data? Accuracy requirements? Anything to watch."
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
            />
          </Field>

          {error ? <ErrorState error={error} /> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit proposal"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
