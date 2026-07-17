import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api/client";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Renders a friendly error box, surfacing the backend correlation id if any. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Something went wrong.";
  const correlationId = error instanceof ApiError ? error.correlationId : undefined;

  return (
    <div
      className="rounded-xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger"
      role="alert"
    >
      <strong className="font-semibold">Error:</strong> {message}
      {correlationId ? (
        <div className="mt-1 text-danger/75">
          <small>Correlation ID: {correlationId}</small>
        </div>
      ) : null}
      {onRetry ? (
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={onRetry} type="button">
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
