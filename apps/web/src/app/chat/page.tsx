"use client";

import { useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useApiClient } from "@/lib/api/useApiClient";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const api = useApiClient();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    setError(null);
    setSending(true);
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setInput("");

    try {
      const result = await api.chat(message);
      setTurns((prev) => [...prev, { role: "assistant", content: result.response }]);
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant"
        description="Prompts are sent to the backend, which calls the AI provider. The frontend never talks to the AI service directly."
      />

      <Card>
        <div className="mb-4 flex min-h-64 flex-col gap-3">
          {turns.length === 0 ? (
            <p className="text-sm text-muted">Ask something to get started.</p>
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
                {turn.content}
              </div>
            ))
          )}
          {sending ? <LoadingSpinner label="Thinking…" /> : null}
        </div>

        {error ? <ErrorState error={error} /> : null}

        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
          <Input
            aria-label="Message"
            placeholder="Summarize this text..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <Button type="submit" disabled={sending || input.trim().length === 0}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
