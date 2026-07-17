/**
 * Framework-agnostic client and response types for the backend API.
 *
 * This package is the canonical, dependency-free definition of the backend
 * contract. The Next.js app currently ships its own copy under
 * `apps/web/src/lib/api` so it can run standalone; in a larger monorepo you can
 * make `apps/web` depend on this package (npm/pnpm workspace) and delete the
 * copy. Keeping the shapes here documents the contract in one place.
 */

export interface MeResponse {
  subject: string;
  name: string;
  email: string;
  roles: string[];
  groups: string[];
  isAdmin: boolean;
  isEditor: boolean;
  isDevPrincipal: boolean;
}

export interface ChatResponse {
  response: string;
  model?: string | null;
}

/** One of the git-authored content kinds. */
export type ContentKind = "playbook" | "tool" | "guidance" | "prompt";

/** Kind-specific frontmatter attributes (prompt text, audience, tool owner…). */
export type ContentAttributes = Record<string, unknown> & {
  prompt?: string;
  audience?: string;
  department?: string;
  tool?: string;
  example_input?: string;
  example_output?: string;
};

export interface ContentSummary {
  slug: string;
  kind: ContentKind;
  title: string;
  summary: string;
  tags: string[];
  attributes: ContentAttributes;
  featured: boolean;
  updatedAt: string;
}

export interface RelatedItem {
  slug: string;
  kind: ContentKind;
  title: string;
}

export interface ContentDetail extends ContentSummary {
  bodyMd: string;
  related: RelatedItem[];
}

export interface ContentListResponse {
  items: ContentSummary[];
  total: number;
}

export type ContentEventType = "copy" | "view";

export interface ContentListFilters {
  kind?: ContentKind;
  tag?: string;
  q?: string;
}

/** Project inventory / intake workflow. */
export type ProjectStatus =
  | "proposed"
  | "idea"
  | "pilot"
  | "active"
  | "paused"
  | "done"
  | "rejected";

export interface Project {
  id: number;
  name: string;
  department: string;
  ownerEmail: string;
  sponsor: string;
  status: ProjectStatus;
  summary: string;
  businessValue: string;
  risks: string;
  dependencies: string;
  nextSteps: string;
  triageNote: string;
  toolsUsed: string[];
  relatedSlugs: string[];
  submittedBy: string;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
}

/** The staff-facing proposal form (narrow subset). */
export interface IntakePayload {
  name: string;
  department?: string;
  summary: string;
  businessValue?: string;
  risks?: string;
  toolsUsed?: string[];
}

/** Editor-only create/patch payloads. */
export interface ProjectWritePayload {
  name?: string;
  department?: string;
  ownerEmail?: string;
  sponsor?: string;
  status?: ProjectStatus;
  summary?: string;
  businessValue?: string;
  risks?: string;
  dependencies?: string;
  nextSteps?: string;
  triageNote?: string;
  toolsUsed?: string[];
  relatedSlugs?: string[];
}

export interface ProjectListFilters {
  status?: ProjectStatus;
  department?: string;
}

export interface Citation {
  sourceType: "content" | "project";
  sourceKey: string;
  title: string;
  kind: ContentKind | "project";
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  grounded: boolean;
  model?: string | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    correlationId?: string | null;
  };
}

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
  chat(message: string): Promise<ChatResponse>;
  listContent(filters?: ContentListFilters): Promise<ContentListResponse>;
  getContent(slug: string): Promise<ContentDetail>;
  recordContentEvent(slug: string, eventType: ContentEventType): Promise<void>;
  listProjects(filters?: ProjectListFilters): Promise<ProjectListResponse>;
  getProject(id: number): Promise<Project>;
  submitIntake(payload: IntakePayload): Promise<Project>;
  createProject(payload: ProjectWritePayload): Promise<Project>;
  updateProject(id: number, payload: ProjectWritePayload): Promise<Project>;
  ask(question: string): Promise<AskResponse>;
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
    } catch {
      throw new ApiError(0, "network_error", "Could not reach the server");
    }

    if (!response.ok) {
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
        // no JSON body
      }
      throw new ApiError(response.status, code, message, correlationId);
    }

    return (await response.json()) as T;
  }

  return {
    getMe: () => request<MeResponse>("/api/v1/me"),
    chat: (message: string) =>
      request<ChatResponse>("/api/v1/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
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
  };
}
