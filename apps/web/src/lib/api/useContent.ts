"use client";

/** Data hooks for the content browse/detail pages. */
import { useCallback, useEffect, useState } from "react";

import { useApiClient } from "@/lib/api/useApiClient";
import type { ContentDetail, ContentKind, ContentSummary } from "@/types";

interface ListState {
  items: ContentSummary[];
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/** Load the published items for one kind (or all kinds when omitted). */
export function useContentList(kind?: ContentKind): ListState {
  const api = useApiClient();
  const [items, setItems] = useState<ContentSummary[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listContent(kind ? { kind } : {})
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, kind]);

  useEffect(() => reload(), [reload]);

  return { items, loading, error, reload };
}

interface DetailState {
  item: ContentDetail | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/** Load one item by slug and record a `view` event (fire-and-forget). */
export function useContentDetail(slug: string): DetailState {
  const api = useApiClient();
  const [item, setItem] = useState<ContentDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getContent(slug)
      .then((res) => {
        if (!cancelled) {
          setItem(res);
          void api.recordContentEvent(slug, "view").catch(() => {});
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, slug]);

  useEffect(() => reload(), [reload]);

  return { item, loading, error, reload };
}
