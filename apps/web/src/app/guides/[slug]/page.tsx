"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Markdown } from "@/components/Markdown";
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
    <>
      <p>
        <Link href="/guides">← All guides</Link>
      </p>
      <h1>{item.title}</h1>
      <p className="muted">{item.summary}</p>
      {item.tags.length > 0 ? (
        <div className="chip-row">
          {item.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="card">
        <Markdown>{item.bodyMd}</Markdown>
      </div>

      {item.related.length > 0 ? (
        <div className="card">
          <h2>Related</h2>
          <ul className="related-list">
            {item.related.map((r) => (
              <li key={r.slug}>
                <Link href={relatedHref(r)}>{r.title}</Link>{" "}
                <span className="muted">({r.kind})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="muted">
        <small>Last updated {new Date(item.updatedAt).toLocaleDateString()}</small>
      </p>
    </>
  );
}
