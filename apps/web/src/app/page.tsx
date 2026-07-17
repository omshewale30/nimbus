"use client";

import Link from "next/link";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useContentList } from "@/lib/api/useContent";
import type { ContentSummary } from "@/types";

function itemHref(item: ContentSummary): string {
  return item.kind === "prompt" ? `/prompts/${item.slug}` : `/guides/${item.slug}`;
}

const KIND_LABEL: Record<string, string> = {
  playbook: "Playbook",
  guidance: "Guidance",
  tool: "Tool",
  prompt: "Prompt",
};

export default function HomePage() {
  const { items, loading, error, reload } = useContentList();
  const featured = items.filter((i) => i.featured);

  return (
    <>
      <h1>AI enablement hub</h1>
      <p className="muted">
        How-to guides, reusable prompts, and approved AI tools for Finance &amp; Operations staff.
      </p>

      <div className="card-grid">
        <Link className="card content-card" href="/guides">
          <h2>Guides</h2>
          <p className="muted">Step-by-step playbooks and acceptable-use guidance.</p>
        </Link>
        <Link className="card content-card" href="/prompts">
          <h2>Prompt library</h2>
          <p className="muted">Copy-paste prompts for everyday Finance &amp; Ops work.</p>
        </Link>
        <Link className="card content-card" href="/projects">
          <h2>Project inventory</h2>
          <p className="muted">AI projects and pilots across F&amp;O — status, owners, value.</p>
        </Link>
        <Link className="card content-card" href="/chat">
          <h2>Assistant</h2>
          <p className="muted">Ask a question and get pointed to the right resource.</p>
        </Link>
      </div>

      <div className="card banner-cta">
        <div>
          <h2>Have an AI idea for your team?</h2>
          <p className="muted">
            Propose a use case in two minutes — it goes straight to the inventory for review.
          </p>
        </div>
        <Link className="btn" href="/propose">
          Propose an AI use case
        </Link>
      </div>

      <h2>Featured</h2>
      {loading ? (
        <LoadingSpinner label="Loading…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : featured.length === 0 ? (
        <p className="muted">Nothing featured yet.</p>
      ) : (
        <div className="card-grid">
          {featured.map((item) => (
            <Link key={item.slug} className="card content-card" href={itemHref(item)}>
              <div className="chip-row">
                <span className="chip chip-kind">{KIND_LABEL[item.kind] ?? item.kind}</span>
              </div>
              <h2>{item.title}</h2>
              <p className="muted">{item.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
