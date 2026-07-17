"use client";

import type { ReactNode } from "react";

import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";

const knowledgeSignals = [
  { label: "Guides", value: "Policy-ready playbooks" },
  { label: "Prompts", value: "Reusable team workflows" },
  { label: "Projects", value: "Live F&O inventory" },
];

const sourceChips = ["Budget variance guide", "Prompt library", "Project inventory"];

const projectRows = [
  { name: "Spend analysis pilot", status: "Active", owner: "Procurement" },
  { name: "Month-end close assistant", status: "Pilot", owner: "Controller" },
  { name: "Policy Q&A intake", status: "Review", owner: "Finance Ops" },
];

/**
 * The authenticated application shell.
 *
 * Renders the nav and, when auth is enabled, gates protected content behind a
 * sign-in prompt (the "unauthorized" state). Authorization decisions are always
 * enforced by the backend as well — this is UX, not a security boundary.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, authDisabled, login } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {authDisabled ? (
        <div className="border-b border-warning/20 bg-warning-bg px-4 py-2 text-center text-sm font-medium text-warning">
          Auth is disabled (local development mode). Do not use this configuration in a deployed
          environment.
        </div>
      ) : null}
      <NavBar />
      <main
        className={
          isAuthenticated
            ? "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10"
            : "relative overflow-hidden"
        }
      >
        {isAuthenticated ? (
          children
        ) : (
          <UnauthenticatedLanding onLogin={login} />
        )}
      </main>
    </div>
  );
}

function UnauthenticatedLanding({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(75,156,211,0.32),transparent_30%),linear-gradient(135deg,#07172c_0%,#13294b_48%,#f7fbfd_100%)] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-carolina to-transparent opacity-80"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-16">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cloud shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-carolina shadow-[0_0_18px_rgb(75_156_211)]" />
            Nimbus for Finance &amp; Operations
          </div>

          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl lg:text-[3.45rem] lg:leading-[1.03]">
            AI enablement, anchored in your operating knowledge.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-cloud sm:text-lg">
            Nimbus brings approved guides, reusable prompts, project context, and grounded assistant
            answers into one secure workspace for Finance &amp; Operations teams.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              className="min-h-11 border-carolina bg-carolina px-5 text-navy shadow-[0_0_28px_rgba(75,156,211,0.35)] hover:bg-[#64afe3]"
              type="button"
              onClick={onLogin}
            >
              Sign in with Microsoft
            </Button>
            <p className="text-sm font-medium text-cloud/85">Organization account required</p>
          </div>

          <dl className="mt-8 grid gap-3 sm:grid-cols-3">
            {knowledgeSignals.map((item) => (
              <div
                className="rounded-lg border border-white/15 bg-white/[0.08] p-3 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-carolina/55 hover:bg-white/[0.12] motion-reduce:hover:translate-y-0"
                key={item.label}
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-carolina">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm text-cloud">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <NimbusPreviewPanel />
      </div>
    </section>
  );
}

function NimbusPreviewPanel() {
  return (
    <div
      aria-label="Nimbus product preview"
      className="relative rounded-xl border border-white/15 bg-[#07182c]/80 p-3 shadow-[0_24px_80px_-42px_rgba(75,156,211,0.95)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-carolina/60 motion-reduce:hover:translate-y-0"
    >
      <div
        aria-hidden="true"
        className="absolute left-4 right-4 top-16 h-px animate-pulse bg-gradient-to-r from-transparent via-carolina to-transparent motion-reduce:hidden"
      />

      <div className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-carolina">
              Nimbus workspace
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Grounded assistant console</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success-bg/10 px-2.5 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
            Grounded
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-navy/65 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cloud/70">
            <span className="h-1.5 w-1.5 rounded-full bg-carolina" />
            Ask Nimbus
          </div>
          <p className="mt-3 text-sm font-medium text-white">
            How should we frame an AI pilot for month-end close?
          </p>
          <div className="mt-4 rounded-lg bg-white/[0.07] p-3 text-sm leading-6 text-cloud">
            Start with the control objective, identify reviewer checkpoints, and connect expected
            time savings to the project inventory before intake.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sourceChips.map((source) => (
              <span
                className="rounded-full border border-carolina/35 bg-carolina/10 px-2.5 py-1 text-xs font-medium text-cloud"
                key={source}
              >
                {source}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.07] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-carolina">
              Suggested prompt
            </p>
            <p className="mt-2 text-sm text-cloud">Draft a pilot charter with risks and controls.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.07] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-carolina">
              Next action
            </p>
            <p className="mt-2 text-sm text-cloud">Route the proposal to Finance Ops triage.</p>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cloud/70 sm:grid-cols-[1fr_auto_auto]">
            <span>Project signal</span>
            <span>Status</span>
            <span className="hidden sm:inline">Owner</span>
          </div>
          {projectRows.map((project) => (
            <div
              className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/10 px-3 py-3 text-sm text-cloud transition last:border-b-0 hover:bg-white/[0.06] sm:grid-cols-[1fr_auto_auto]"
              key={project.name}
            >
              <span className="font-medium text-white">{project.name}</span>
              <span className="rounded-full border border-carolina/30 bg-carolina/10 px-2 py-0.5 text-xs font-semibold text-cloud">
                {project.status}
              </span>
              <span className="hidden text-cloud/75 sm:inline">{project.owner}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
