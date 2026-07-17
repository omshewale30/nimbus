"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CopyPromptButton } from "@/components/CopyPromptButton";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Markdown } from "@/components/Markdown";
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
    <>
      <p>
        <Link href="/prompts">← Prompt library</Link>
      </p>
      <h1>{item.title}</h1>
      <p className="muted">{item.summary}</p>
      <div className="chip-row">
        {audience ? <span className="chip chip-kind">{String(audience)}</span> : null}
        {tool ? <span className="chip">{String(tool)}</span> : null}
        {item.tags.map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
      </div>

      {typeof prompt === "string" ? (
        <div className="card">
          <pre className="prompt-text">{prompt}</pre>
          <CopyPromptButton
            text={prompt}
            onCopied={() => void api.recordContentEvent(item.slug, "copy").catch(() => {})}
          />
        </div>
      ) : null}

      {example_input || example_output ? (
        <div className="card">
          <h2>Example</h2>
          {example_input ? (
            <>
              <h3>Input</h3>
              <p className="muted">{String(example_input)}</p>
            </>
          ) : null}
          {example_output ? (
            <>
              <h3>What a good result looks like</h3>
              <p className="muted">{String(example_output)}</p>
            </>
          ) : null}
        </div>
      ) : null}

      {item.bodyMd ? (
        <div className="card">
          <Markdown>{item.bodyMd}</Markdown>
        </div>
      ) : null}

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
