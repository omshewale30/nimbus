import type { ProjectStatus } from "@/types";

const LABELS: Record<ProjectStatus, string> = {
  proposed: "Proposed",
  idea: "Idea",
  pilot: "Pilot",
  active: "Active",
  paused: "Paused",
  done: "Done",
  rejected: "Rejected",
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`pill pill-${status}`}>{LABELS[status] ?? status}</span>;
}
