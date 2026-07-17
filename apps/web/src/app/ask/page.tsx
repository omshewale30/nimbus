"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useApiClient } from "@/lib/api/useApiClient";
import type { Citation } from "@/types";

interface Turn {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  grounded?: boolean;
}

function citationHref(c: Citation): string {
  if (c.sourceType === "project") return `/projects/${c.sourceKey}`;
  return c.kind === "prompt" ? `/prompts/${c.sourceKey}` : `/guides/${c.sourceKey}`;
}

export default function AskPage() {
  const api = useApiClient();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    setError(null);
    setSending(true);
    setTurns((prev) => [...prev, { role: "user", content: question }]);
    setInput("");

    try {
      const result = await api.ask(question);
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          citations: result.citations,
          grounded: result.grounded,
        },
      ]);
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ask Nimbus"
        description="Answers come only from what's in Nimbus: guides, prompts, and the project inventory, with sources cited."
      />

      <Card>
        <div className="mb-4 flex min-h-80 flex-col gap-3">
          {turns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-cloud/45 p-4 text-sm text-muted">
              Try: &quot;How do I analyze a budget variance with Copilot?&quot; or &quot;Are
              there any AI projects in Finance?&quot;
            </div>
          ) : (
            turns.map((turn, i) => (
              <div
                key={i}
                className={
                  turn.role === "user"
                    ? "max-w-[85%] self-end whitespace-pre-wrap rounded-xl bg-carolina px-4 py-3 text-sm text-navy"
                    : "max-w-[85%] self-start whitespace-pre-wrap rounded-xl bg-cloud px-4 py-3 text-sm text-foreground"
                }
              >
                <div>{turn.content}</div>
                {turn.citations && turn.citations.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {turn.citations.map((c) => (
                      <Link
                        key={`${c.sourceType}-${c.sourceKey}`}
                        className="inline-flex items-center rounded-full border border-carolina/35 bg-surface px-2.5 py-1 text-xs font-medium text-navy transition hover:border-carolina hover:bg-cloud focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carolina focus-visible:ring-offset-2"
                        href={citationHref(c)}
                      >
                        {c.title}
                        <span className="ml-1 text-muted">({c.kind})</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
          {sending ? <LoadingSpinner label="Searching Nimbus..." /> : null}
        </div>

        {error ? <ErrorState error={error} /> : null}

        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
          <Input
            aria-label="Question"
            placeholder="Ask about tools, guides, prompts, or projects..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <Button type="submit" disabled={sending || input.trim().length < 3}>
            Ask
          </Button>
        </form>
      </Card>
    </div>
  );
}
