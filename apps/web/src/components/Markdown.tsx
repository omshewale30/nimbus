"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/** Map legacy /g/<slug> content links onto the guides route. */
function resolveHref(href: string): string {
  if (href.startsWith("/g/")) return `/guides/${href.slice(3)}`;
  return href;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-4 text-sm leading-6 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children: headingChildren }) => (
            <h2 className="pt-2 text-xl font-semibold text-navy">{headingChildren}</h2>
          ),
          h3: ({ children: headingChildren }) => (
            <h3 className="pt-1 text-base font-semibold text-navy">{headingChildren}</h3>
          ),
          p: ({ children: paragraphChildren }) => (
            <p className="text-foreground">{paragraphChildren}</p>
          ),
          ul: ({ children: listChildren }) => (
            <ul className="list-disc space-y-2 pl-5">{listChildren}</ul>
          ),
          ol: ({ children: listChildren }) => (
            <ol className="list-decimal space-y-2 pl-5">{listChildren}</ol>
          ),
          li: ({ children: itemChildren }) => <li className="pl-1">{itemChildren}</li>,
          blockquote: ({ children: quoteChildren }) => (
            <blockquote className="border-l-4 border-carolina/40 bg-cloud/60 py-2 pl-4 text-muted">
              {quoteChildren}
            </blockquote>
          ),
          pre: ({ children: preChildren }) => (
            <pre className="overflow-x-auto rounded-lg border border-border bg-cloud/70 p-4 text-sm">
              {preChildren}
            </pre>
          ),
          code: ({ children: codeChildren, className }) => (
            <code
              className={cn(
                "rounded bg-cloud px-1.5 py-0.5 font-mono text-[0.9em] text-navy",
                className,
              )}
            >
              {codeChildren}
            </code>
          ),
          table: ({ children: tableChildren }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">{tableChildren}</table>
            </div>
          ),
          th: ({ children: cellChildren }) => (
            <th className="border border-border bg-cloud/70 px-3 py-2 text-left font-semibold text-navy">
              {cellChildren}
            </th>
          ),
          td: ({ children: cellChildren }) => (
            <td className="border border-border px-3 py-2 align-top">{cellChildren}</td>
          ),
          a: ({ href, children: linkChildren }) => {
            const resolved = resolveHref(href ?? "");
            if (resolved.startsWith("/")) {
              return (
                <Link className="font-medium text-navy underline decoration-carolina/40" href={resolved}>
                  {linkChildren}
                </Link>
              );
            }
            return (
              <a
                className="font-medium text-navy underline decoration-carolina/40"
                href={resolved}
                target="_blank"
                rel="noreferrer"
              >
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
