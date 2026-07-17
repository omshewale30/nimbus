"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorState } from "@/components/ErrorState";
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
      <>
        <h1>Thanks — proposal submitted</h1>
        <div className="card">
          <p>
            <strong>{submitted.name}</strong> is now in the inventory as{" "}
            <span className="pill pill-proposed">Proposed</span> and will be reviewed by the
            platform editors. You can follow its status on the projects page.
          </p>
          <div className="form-actions">
            <Link className="btn" href={`/projects/${submitted.id}`}>
              View your proposal
            </Link>
            <Link className="btn btn-secondary" href="/projects">
              All projects
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Propose an AI use case</h1>
      <p className="muted">
        Have an idea where AI could help your team — or already experimenting? Tell us about it.
        Proposals go into the project inventory for review; no idea is too small.
      </p>

      <form className="card form-grid" onSubmit={onSubmit}>
        <label>
          Name your idea *
          <input
            className="input"
            required
            minLength={3}
            maxLength={256}
            placeholder="e.g. AI-assisted invoice triage"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Department
          <select
            className="input"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Select…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          What problem would it solve? *
          <textarea
            className="input"
            required
            minLength={10}
            rows={4}
            placeholder="Describe the task or process today and where AI could help."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>
        <label>
          Expected value
          <textarea
            className="input"
            rows={2}
            placeholder="Time saved, errors avoided, faster turnaround…"
            value={businessValue}
            onChange={(e) => setBusinessValue(e.target.value)}
          />
        </label>
        <label>
          Tools involved
          <input
            className="input"
            placeholder="e.g. Microsoft 365 Copilot, Excel (comma-separated)"
            value={tools}
            onChange={(e) => setTools(e.target.value)}
          />
        </label>
        <label>
          Risks or concerns
          <textarea
            className="input"
            rows={2}
            placeholder="Sensitive data? Accuracy requirements? Anything to watch."
            value={risks}
            onChange={(e) => setRisks(e.target.value)}
          />
        </label>

        {error ? <ErrorState error={error} /> : null}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit proposal"}
          </button>
        </div>
      </form>
    </>
  );
}
