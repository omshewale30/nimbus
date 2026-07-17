"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Markdown } from "@/components/Markdown";
import { Badge, Card, PageHeader } from "@/components/ui";
import { useContentDetail } from "@/lib/api/useContent";
import type { RelatedItem } from "@/types";

function relatedHref(item: RelatedItem): string {
  return item.kind === "prompt" ? `/prompts/${item.slug}` : `/guides/${item.slug}`;
}

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { item, loading, error, reload } = useContentDetail(slug);

  if (loading) return <LoadingSpinner label="Loading…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!item) return null;

  return (
    <div className="space-y-6">
      <Link className="text-sm font-medium text-muted hover:text-carolina" href="/guides">
        ← All guides
      </Link>
      <PageHeader title={item.title} description={item.summary} />
      {item.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {item.tags.map((t) => (
            <Badge key={t}>
              {t}
            </Badge>
          ))}
        </div>
      ) : null}

      <Card>
        <Markdown>{item.bodyMd}</Markdown>
      </Card>

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
