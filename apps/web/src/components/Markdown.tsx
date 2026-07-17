"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Map legacy /g/<slug> content links onto the guides route. */
function resolveHref(href: string): string {
  if (href.startsWith("/g/")) return `/guides/${href.slice(3)}`;
  return href;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => {
            const resolved = resolveHref(href ?? "");
            if (resolved.startsWith("/")) {
              return <Link href={resolved}>{linkChildren}</Link>;
            }
            return (
              <a href={resolved} target="_blank" rel="noreferrer">
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
