"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CopyPromptButton } from "@/components/CopyPromptButton";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Markdown } from "@/components/Markdown";
import { Badge, Card, PageHeader } from "@/components/ui";
import { useApiClient } from "@/lib/api/useApiClient";
import { useContentDetail } from "@/lib/api/useContent";
import type { RelatedItem } from "@/types";

function relatedHref(item: RelatedItem): string {
  return item.kind === "prompt" ? `/prompts/${item.slug}` : `/guides/${item.slug}`;
}

export default function PromptDetailPage() {
  const api = useApiClient();
  const { slug } = useParams<{ slug: string }>();
  const { item, loading, error, reload } = useContentDetail(slug);

  if (loading) return <LoadingSpinner label="Loading…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!item) return null;

  const { prompt, audience, tool, example_input, example_output } = item.attributes;

  return (
    <div className="space-y-6">
      <Link className="text-sm font-medium text-muted hover:text-carolina" href="/prompts">
        ← Prompt library
      </Link>
      <PageHeader title={item.title} description={item.summary} />
      <div className="flex flex-wrap gap-2">
        {audience ? <Badge variant="primary">{String(audience)}</Badge> : null}
        {tool ? <Badge>{String(tool)}</Badge> : null}
        {item.tags.map((t) => (
          <Badge key={t}>
            {t}
          </Badge>
        ))}
      </div>

      {typeof prompt === "string" ? (
        <Card>
          <pre className="mb-4 whitespace-pre-wrap rounded-lg border border-border bg-cloud/70 p-4 font-mono text-sm text-navy">
            {prompt}
          </pre>
          <CopyPromptButton
            text={prompt}
            onCopied={() => void api.recordContentEvent(item.slug, "copy").catch(() => {})}
          />
        </Card>
      ) : null}

      {example_input || example_output ? (
        <Card className="space-y-4">
          <h2 className="text-lg">Example</h2>
          {example_input ? (
            <div className="space-y-1">
              <h3>Input</h3>
              <p className="text-sm text-muted">{String(example_input)}</p>
            </div>
          ) : null}
          {example_output ? (
            <div className="space-y-1">
              <h3>What a good result looks like</h3>
              <p className="text-sm text-muted">{String(example_output)}</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {item.bodyMd ? (
        <Card>
          <Markdown>{item.bodyMd}</Markdown>
        </Card>
      ) : null}

      {item.related.length > 0 ? (
        <Card>
          <h2 className="text-lg">Related</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {item.related.map((r) => (
              <li key={r.slug}>
                <Link className="font-medium" href={relatedHref(r)}>
                  {r.title}
                </Link>{" "}
                <span className="text-muted">({r.kind})</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <p className="text-sm text-muted">
        <small>Last updated {new Date(item.updatedAt).toLocaleDateString()}</small>
      </p>
    </div>
  );
}
