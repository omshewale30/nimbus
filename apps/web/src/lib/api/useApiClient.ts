"use client";

/** React hook returning a backend API client wired to the current auth token. */
import { useEffect, useMemo, useRef } from "react";

import { createApiClient, type ApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { config } from "@/lib/config";

export function useApiClient(): ApiClient {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  return useMemo(
    () =>
      createApiClient({
        baseUrl: config.apiBaseUrl,
        getToken: () => getTokenRef.current(),
      }),
    [],
  );
}
