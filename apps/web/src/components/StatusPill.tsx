import type { ProjectStatus } from "@/types";

import { Badge } from "@/components/ui";

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
  const variant =
    status === "active"
      ? "success"
      : status === "pilot"
        ? "primary"
        : status === "proposed"
          ? "warning"
          : status === "rejected"
            ? "danger"
            : "default";

  return <Badge variant={variant}>{LABELS[status] ?? status}</Badge>;
}
