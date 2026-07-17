/**
 * Backend API client.
 *
 * `createApiClient` is a pure factory (no React, no MSAL) so it is trivially
 * testable: pass a `getToken` function and it attaches the Entra access token
 * as a Bearer header on every request. The React hook `useApiClient`
 * (see ./useApiClient) wires it to MSAL.
 */
import type {
  ApiErrorBody,
  AskResponse,
  ContentDetail,
  ContentEventType,
  ContentListFilters,
  ContentListResponse,
  InsightsSummary,
  IntakePayload,
  MeResponse,
  Project,
  ProjectListFilters,
  ProjectListResponse,
  ProjectWritePayload,
} from "@/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId?: string | null;

  constructor(status: number, code: string, message: string, correlationId?: string | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

export type GetToken = () => Promise<string | null>;

export interface ApiClientOptions {
  baseUrl: string;
  getToken: GetToken;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  getMe(): Promise<MeResponse>;
  listContent(filters?: ContentListFilters): Promise<ContentListResponse>;
  getContent(slug: string): Promise<ContentDetail>;
  recordContentEvent(slug: string, eventType: ContentEventType): Promise<void>;
  listProjects(filters?: ProjectListFilters): Promise<ProjectListResponse>;
  getProject(id: number): Promise<Project>;
  submitIntake(payload: IntakePayload): Promise<Project>;
  createProject(payload: ProjectWritePayload): Promise<Project>;
  updateProject(id: number, payload: ProjectWritePayload): Promise<Project>;
  ask(question: string): Promise<AskResponse>;
  getInsightsSummary(): Promise<InsightsSummary>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const doFetch = options.fetchImpl ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await options.getToken();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await doFetch(`${options.baseUrl}${path}`, { ...init, headers });
    } catch (cause) {
      throw new ApiError(0, "network_error", "Could not reach the server");
    }

    if (!response.ok) {
      // Try to parse the backend's error envelope; fall back gracefully.
      let code = "http_error";
      let message = `Request failed (${response.status})`;
      let correlationId: string | null | undefined;
      try {
        const body = (await response.json()) as ApiErrorBody;
        if (body?.error) {
          code = body.error.code ?? code;
          message = body.error.message ?? message;
          correlationId = body.error.correlationId;
        }
      } catch {
        // response had no JSON body
      }
      throw new ApiError(response.status, code, message, correlationId);
    }

    return (await response.json()) as T;
  }

  return {
    getMe: () => request<MeResponse>("/api/v1/me"),
    listContent: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.kind) params.set("kind", filters.kind);
      if (filters.tag) params.set("tag", filters.tag);
      if (filters.q) params.set("q", filters.q);
      const qs = params.toString();
      return request<ContentListResponse>(`/api/v1/content${qs ? `?${qs}` : ""}`);
    },
    getContent: (slug: string) =>
      request<ContentDetail>(`/api/v1/content/${encodeURIComponent(slug)}`),
    recordContentEvent: async (slug: string, eventType: ContentEventType) => {
      await request(`/api/v1/content/${encodeURIComponent(slug)}/events`, {
        method: "POST",
        body: JSON.stringify({ eventType }),
      });
    },
    listProjects: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.department) params.set("department", filters.department);
      const qs = params.toString();
      return request<ProjectListResponse>(`/api/v1/projects${qs ? `?${qs}` : ""}`);
    },
    getProject: (id: number) => request<Project>(`/api/v1/projects/${id}`),
    submitIntake: (payload: IntakePayload) =>
      request<Project>("/api/v1/projects/intake", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    createProject: (payload: ProjectWritePayload) =>
      request<Project>("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    updateProject: (id: number, payload: ProjectWritePayload) =>
      request<Project>(`/api/v1/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    ask: (question: string) =>
      request<AskResponse>("/api/v1/ask", {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
    getInsightsSummary: () => request<InsightsSummary>("/api/v1/insights/summary"),
  };
}
