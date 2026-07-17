"use client";

import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, PageHeader } from "@/components/ui";
import { useApiClient } from "@/lib/api/useApiClient";
import type { MeResponse } from "@/types";

export default function ProfilePage() {
  const api = useApiClient();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMe(await api.getMe());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Identity and roles as resolved by the backend from your token."
      />

      <Card>
        {loading ? (
          <LoadingSpinner label="Loading profile…" />
        ) : error ? (
          <ErrorState error={error} onRetry={load} />
        ) : me ? (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="font-medium text-muted">Name</dt>
            <dd>{me.name || "—"}</dd>
            <dt className="font-medium text-muted">Email</dt>
            <dd>{me.email || "—"}</dd>
            <dt className="font-medium text-muted">Subject</dt>
            <dd>{me.subject}</dd>
            <dt className="font-medium text-muted">Roles</dt>
            <dd>{me.roles.length ? me.roles.join(", ") : "—"}</dd>
            <dt className="font-medium text-muted">Groups</dt>
            <dd>{me.groups.length ? me.groups.join(", ") : "—"}</dd>
            <dt className="font-medium text-muted">Admin</dt>
            <dd>{me.isAdmin ? "Yes" : "No"}</dd>
          </dl>
        ) : null}
      </Card>

      {me?.isDevPrincipal ? (
        <p className="text-sm text-muted">
          <small>
            This is a fake local-development principal (auth disabled). It does not represent a real
            signed-in user.
          </small>
        </p>
      ) : null}
    </div>
  );
}
