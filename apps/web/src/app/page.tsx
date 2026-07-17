"use client";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge, ButtonLink, Card, CardLink, EmptyState, PageHeader } from "@/components/ui";
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="UNC Finance & Operations"
        title="AI enablement hub"
        description="How-to guides, reusable prompts, and approved AI tools for Finance & Operations staff."
      />
      <Card className="flex flex-col gap-4 border-carolina/25 bg-surface sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg">Have a question?</h2>
          <p className="mt-1 text-sm text-muted">
            Ask the assistant from the guides, prompts, and project inventory, with sources cited.
          </p>
        </div>
        <ButtonLink href="/ask">Ask Nimbus</ButtonLink>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardLink href="/guides">
          <h2 className="text-lg">Guides</h2>
          <p className="text-sm text-muted">Step-by-step playbooks and acceptable-use guidance.</p>
        </CardLink>
        <CardLink href="/prompts">
          <h2 className="text-lg">Prompt library</h2>
          <p className="text-sm text-muted">Copy-paste prompts for everyday Finance &amp; Ops work.</p>
        </CardLink>
        <CardLink href="/projects">
          <h2 className="text-lg">Project inventory</h2>
          <p className="text-sm text-muted">AI projects and pilots across F&amp;O: status, owners, value.</p>
        </CardLink>
        <CardLink href="/chat">
          <h2 className="text-lg">Assistant</h2>
          <p className="text-sm text-muted">Ask a question and get pointed to the right resource.</p>
        </CardLink>
      </div>

      <Card className="flex flex-col gap-4 border-carolina/25 bg-gradient-to-br from-cloud to-surface sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg">Have an AI idea for your team?</h2>
          <p className="mt-1 text-sm text-muted">
            Propose a use case in two minutes — it goes straight to the inventory for review.
          </p>
        </div>
        <ButtonLink href="/propose">Propose an AI use case</ButtonLink>
      </Card>

      <section className="space-y-4">
        <h2>Featured</h2>
        {loading ? (
          <LoadingSpinner label="Loading…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : featured.length === 0 ? (
          <EmptyState title="Nothing featured yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((item) => (
              <CardLink key={item.slug} href={itemHref(item)}>
                <div>
                  <Badge variant="primary">{KIND_LABEL[item.kind] ?? item.kind}</Badge>
                </div>
                <h2 className="text-lg">{item.title}</h2>
                <p className="text-sm text-muted">{item.summary}</p>
              </CardLink>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
