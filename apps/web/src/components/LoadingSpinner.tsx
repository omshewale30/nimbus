export function LoadingSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-muted">
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-carolina"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}
