/** Shared response types mirrored from the backend Pydantic schemas. */

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

/** Origin of a registry record: staff intake vs editor-inventoried existing project. */
export type ProjectSource = "proposed" | "inventoried";

export interface Project {
  id: number;
  name: string;
  department: string;
  ownerEmail: string;
  sponsor: string;
  status: ProjectStatus;
  source: ProjectSource;
  summary: string;
  businessValue: string;
  risks: string;
  dependencies: string;
  nextSteps: string;
  triageNote: string;
  toolsUsed: string[];
  relatedSlugs: string[];
  stakeholders: string[];
  strategicCategory: string;
  startDate: string | null;
  targetDate: string | null;
  submittedBy: string;
  lastUpdatedBy: string;
  archivedAt: string | null;
  archivedBy: string;
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
  stakeholders?: string[];
  strategicCategory?: string;
  startDate?: string | null;
  targetDate?: string | null;
}

/** Editor-only "inventory an existing project" form (POST /projects/inventory). */
export interface InventoryPayload {
  name: string;
  department?: string;
  ownerEmail?: string;
  sponsor?: string;
  stakeholders?: string[];
  status?: ProjectStatus;
  summary: string;
  businessValue?: string;
  risks?: string;
  dependencies?: string;
  nextSteps?: string;
  toolsUsed?: string[];
  strategicCategory?: string;
  startDate?: string | null;
  targetDate?: string | null;
}

export interface ProjectListFilters {
  status?: ProjectStatus;
  department?: string;
  source?: ProjectSource;
  q?: string;
  includeArchived?: boolean;
}

/** Leadership usage metrics (GET /insights/summary). */
export interface TopCopiedItem {
  slug: string;
  title: string;
  copies: number;
}

export interface InsightsSummary {
  publishedGuides: number;
  publishedPrompts: number;
  projectsTotal: number;
  projectsByStatus: Record<ProjectStatus, number>;
  intakesLast30d: number;
  copiesLast30d: number;
  asksLast30d: number;
  topCopied: TopCopiedItem[];
  windowDays: number;
}

/** The backend's consistent error envelope. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    correlationId?: string | null;
  };
}
