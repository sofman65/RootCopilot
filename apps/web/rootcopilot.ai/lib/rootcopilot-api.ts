/**
 * RootCopilot API client.
 *
 * Aligned with the locked canonical backend in apps/api/.
 * All IDs are UUID strings. Timestamps are ISO 8601.
 *
 * The bottom of the file holds legacy types and helpers used only by the
 * old thread page and the search page — they hit /clients, /issues/*,
 * /threads/* on the backend's legacy compatibility layer.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export type EntityId = string;


// ===========================================================================
// Error handling
// ===========================================================================

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: unknown;
  readonly isNetworkError: boolean;

  constructor(status: number, message: string, detail?: unknown, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.isNetworkError = isNetworkError;
  }
}


// ===========================================================================
// Low-level request helper
// ===========================================================================

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (e) {
    // fetch only rejects on network-level failures (server down, CORS, DNS).
    throw new ApiError(
      0,
      `Cannot reach API at ${API_BASE_URL}. Is the server running?`,
      e,
      true,
    );
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      // body wasn't JSON — that's fine
    }
    const fastapiDetail =
      detail && typeof detail === "object" && "detail" in detail
        ? (detail as { detail: unknown }).detail
        : undefined;
    const message =
      typeof fastapiDetail === "string"
        ? fastapiDetail
        : `${response.status} ${response.statusText}`;
    throw new ApiError(response.status, message, detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function qs(params: Record<string, string | undefined | null>): string {
  const search = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return search ? `?${search}` : "";
}


// ===========================================================================
// Workspace
// ===========================================================================

export type Workspace = {
  id: string;
  name: string;
  created_at: string | null;
  updated_at: string | null;
};

export type TicketSummary = {
  id: string;
  title: string;
  status: string;
  priority: string;
  source_system: string;
  created_at: string | null;
  updated_at: string | null;
};

export type EnvironmentNode = {
  id: string;
  name: string;
  tickets: TicketSummary[];
};

export type ProjectNode = {
  id: string;
  name: string;
  environments: EnvironmentNode[];
};

export type ClientNode = {
  id: string;
  name: string;
  projects: ProjectNode[];
};

export type WorkspaceTreeResponse = {
  clients: ClientNode[];
};

export async function getCurrentWorkspace(): Promise<Workspace> {
  return request<Workspace>("/workspace/current");
}

export async function getWorkspaceTree(): Promise<WorkspaceTreeResponse> {
  return request<WorkspaceTreeResponse>("/workspace/tree");
}


// ===========================================================================
// Integrations
// ===========================================================================

export type IntegrationType = "manual" | "jira" | "azure_devops";
export type IntegrationStatus = "active" | "paused" | "error";

export type Integration = {
  id: string;
  workspace_id: string;
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  last_synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type IntegrationCreate = {
  type: IntegrationType;
  name: string;
  config?: Record<string, unknown>;
};

export async function listIntegrations(): Promise<Integration[]> {
  return request<Integration[]>("/integrations");
}

export async function createIntegration(input: IntegrationCreate): Promise<Integration> {
  return request<Integration>("/integrations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}


// ===========================================================================
// Projects (canonical — distinct from the legacy ProjectNode used in the tree)
// ===========================================================================

export type Project = {
  id: string;
  workspace_id: string;
  integration_id: string;
  external_id: string | null;
  name: string;
  created_at: string | null;
  updated_at: string | null;
};

export type ProjectCreate = {
  integration_id: string;
  name: string;
  external_id?: string | null;
};

export async function listProjects(filter?: { integration_id?: string }): Promise<Project[]> {
  return request<Project[]>(`/projects${qs(filter ?? {})}`);
}

export async function getProject(id: EntityId): Promise<Project> {
  return request<Project>(`/projects/${id}`);
}

export async function createProject(input: ProjectCreate): Promise<Project> {
  return request<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}


// ===========================================================================
// Tickets
// ===========================================================================

export type Ticket = {
  id: EntityId;
  workspace_id: string;
  project_id: string;
  integration_id: string | null;
  source_system: string;
  external_id: string | null;
  external_url: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  client_name: string | null;
  environment: string | null;
  component: string | null;
  service_name: string | null;
  labels: string[];
  area_path: string | null;
  assignee: string | null;
  reporter: string | null;
  source_created_at: string | null;
  source_updated_at: string | null;
  ingested_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TicketListFilter = {
  project_id?: string;
  integration_id?: string;
  source_system?: string;
  client_name?: string;
  environment?: string;
  component?: string;
  status?: string;
  priority?: string;
  q?: string;
};

export type TicketCreate = {
  project_id: string;
  integration_id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  client_name?: string;
  environment?: string;
  component?: string;
  service_name?: string;
  labels?: string[];
  assignee?: string;
  reporter?: string;
};

export type TicketPatch = Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  client_name: string;
  environment: string;
  component: string;
  service_name: string;
  labels: string[];
  assignee: string;
  reporter: string;
}>;

export async function listTickets(filter?: TicketListFilter): Promise<Ticket[]> {
  return request<Ticket[]>(`/tickets${qs((filter ?? {}) as Record<string, string | undefined>)}`);
}

export async function getTicket(ticketId: EntityId): Promise<Ticket> {
  return request<Ticket>(`/tickets/${ticketId}`);
}

export async function createTicket(input: TicketCreate): Promise<Ticket> {
  return request<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function patchTicket(ticketId: EntityId, input: TicketPatch): Promise<Ticket> {
  return request<Ticket>(`/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}


// ===========================================================================
// Comments
// ===========================================================================

export type CommentSource = "internal" | "external";

export type Comment = {
  id: string;
  ticket_id: string;
  source: CommentSource;
  external_id: string | null;
  author: string;
  body: string;
  created_at: string | null;
  updated_at: string | null;
};

export type CommentCreate = {
  body: string;
  author?: string;
};

export async function listComments(ticketId: EntityId): Promise<Comment[]> {
  return request<Comment[]>(`/tickets/${ticketId}/comments`);
}

export async function createComment(ticketId: EntityId, input: CommentCreate): Promise<Comment> {
  return request<Comment>(`/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}


// ===========================================================================
// Artifacts
// ===========================================================================

export type ArtifactType = "log" | "screenshot" | "stacktrace" | "config" | "other";

export type Artifact = {
  id: string;
  ticket_id: string;
  name: string;
  type: ArtifactType;
  content: string | null;
  storage_url: string | null;
  created_at: string | null;
};

export type ArtifactCreate = {
  name: string;
  content: string;
  type?: ArtifactType;
};

export async function listArtifacts(ticketId: EntityId): Promise<Artifact[]> {
  return request<Artifact[]>(`/tickets/${ticketId}/artifacts`);
}

export async function createArtifact(ticketId: EntityId, input: ArtifactCreate): Promise<Artifact> {
  return request<Artifact>(`/tickets/${ticketId}/artifacts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}


// ===========================================================================
// Analysis
// ===========================================================================

export type AnalysisStatus = "pending" | "running" | "done" | "failed" | "error";
export type TriggeredBy = "user" | "auto" | "quick_action";

export type SimilarTicketRef = {
  ticket_id: string;
  title: string;
  score: number;
  explanation: string | null;
};

export type AnalysisResultJson = {
  summary: string;
  likely_root_cause: string;
  confidence: "low" | "medium" | "high";
  evidence: string[];
  suggested_steps: string[];
  stakeholder_summary: string;
};

export type AnalysisRun = {
  id: string;
  ticket_id: string;
  triggered_by: TriggeredBy;
  instruction: string;
  status: AnalysisStatus;
  model: string | null;
  result_markdown: string | null;
  result_json: AnalysisResultJson | null;
  similar_tickets: SimilarTicketRef[];
  input_tokens?: number | null;
  output_tokens?: number | null;
  latency_ms?: number | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

export type AnalyzeOptions = {
  instruction?: string;
  triggered_by?: TriggeredBy;
};

export async function analyzeTicket(
  ticketId: EntityId,
  options?: AnalyzeOptions,
): Promise<AnalysisRun> {
  return request<AnalysisRun>(`/tickets/${ticketId}/analyze`, {
    method: "POST",
    body: JSON.stringify(options ?? {}),
  });
}

export async function getTicketAnalysis(ticketId: EntityId): Promise<AnalysisRun> {
  return request<AnalysisRun>(`/tickets/${ticketId}/analysis`);
}

export async function getAnalysis(id: EntityId): Promise<AnalysisRun> {
  return request<AnalysisRun>(`/analysis/${id}`);
}


// ===========================================================================
// RAG / Knowledge
// ===========================================================================

export type RagEntry = {
  entryId: string;
  title?: string;
  namespace?: string;
  createdAt?: number;
};

export type RagSource = {
  chunk: string;
  score: number;
  doc: { name?: string; namespace: string } | null;
};

export async function listRagEntries(namespace?: string): Promise<RagEntry[]> {
  const query = namespace ? `?namespace=${encodeURIComponent(namespace)}` : "";
  return request<RagEntry[]>(`/rag/entries${query}`);
}

export async function addRagDocument(input: {
  name: string;
  text: string;
  namespace?: string;
}): Promise<void> {
  await request<void>("/rag/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function askRag(input: {
  question: string;
  namespace?: string;
}): Promise<{ answer: string; contexts?: RagSource[] }> {
  return request<{ answer: string; contexts?: RagSource[] }>("/rag/ask", {
    method: "POST",
    body: JSON.stringify(input),
  });
}


// ===========================================================================
// LLM subsystem observability
// ===========================================================================

export type LLMHealth = {
  status: "healthy" | "degraded" | "unhealthy";
  environment: string;
  version: string;
  checks: Record<string, boolean | string>;
};

export type LLMMetrics = {
  total_requests: number;
  total_errors: number;
  error_rate: string;
  avg_latency_ms: number;
  cache_hit_rate: string;
  total_input_tokens: number;
  total_output_tokens: number;
};

export type CacheStats = {
  hits: number;
  misses: number;
  hit_rate: string;
  cached_entries: number;
};

export async function getLLMHealth(): Promise<LLMHealth> {
  return request<LLMHealth>("/llm/health");
}

export async function getLLMMetrics(): Promise<LLMMetrics> {
  return request<LLMMetrics>("/llm/metrics");
}

export async function getLLMCacheStats(): Promise<CacheStats> {
  return request<CacheStats>("/llm/cache/stats");
}


// ===========================================================================
// Legacy — kept until the old thread page and search page migrate.
// These hit the backend's /clients, /issues/*, /threads/* compatibility layer.
// ===========================================================================

export type Issue = {
  _id: EntityId;
  title: string;
  created_at: number;
  environment?: string;
  breadcrumb?: string;
};

export type Thread = {
  _id: EntityId;
  issue_id?: EntityId;
};

export type ThreadMessage = {
  _id: EntityId;
  role: "user" | "assistant";
  content: string;
  created_at: number;
};

type LegacyEntity = {
  _id?: string;
  id?: string;
  created_at?: number | string;
  [key: string]: unknown;
};

function normalizeLegacy<T extends LegacyEntity>(
  entity: T,
): T & { _id: string; created_at: number } {
  const id = entity._id ?? entity.id;
  if (!id) throw new ApiError(500, "Legacy entity is missing id/_id");
  const createdAt = entity.created_at ?? 0;
  return {
    ...entity,
    _id: String(id),
    created_at: typeof createdAt === "string" ? Date.parse(createdAt) : Number(createdAt),
  };
}

export async function getIssue(issueId: EntityId): Promise<Issue> {
  return normalizeLegacy(await request<LegacyEntity>(`/issues/${issueId}`)) as unknown as Issue;
}

export async function getThreadByIssue(issueId: EntityId): Promise<Thread> {
  return normalizeLegacy(
    await request<LegacyEntity>(`/issues/${issueId}/thread`),
  ) as unknown as Thread;
}

export async function createThread(issueId: EntityId): Promise<Thread> {
  return normalizeLegacy(
    await request<LegacyEntity>(`/issues/${issueId}/thread`, { method: "POST" }),
  ) as unknown as Thread;
}

export async function listThreadMessages(threadId: EntityId): Promise<ThreadMessage[]> {
  const items = await request<LegacyEntity[]>(`/threads/${threadId}/messages`);
  return items.map(normalizeLegacy) as unknown as ThreadMessage[];
}

export async function sendThreadMessage(input: {
  threadId: EntityId;
  content: string;
}): Promise<void> {
  await request<void>(`/threads/${input.threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: input.content }),
  });
}

export async function sendQuickActionUserMessage(input: {
  threadId: EntityId;
  instruction: string;
}): Promise<void> {
  await request<void>(`/threads/${input.threadId}/quick-action-message`, {
    method: "POST",
    body: JSON.stringify({ instruction: input.instruction }),
  });
}

export async function triggerAssistantReply(threadId: EntityId): Promise<void> {
  await request<void>(`/threads/${threadId}/assistant/reply`, { method: "POST" });
}

export async function triggerAssistantQuickAction(input: {
  threadId: EntityId;
  instruction: string;
}): Promise<void> {
  await request<void>(`/threads/${input.threadId}/assistant/quick-action`, {
    method: "POST",
    body: JSON.stringify({ instruction: input.instruction }),
  });
}


// ===========================================================================
// Search
// ===========================================================================

export type TicketSearchResult = {
  id: EntityId;
  title: string;
  breadcrumb?: string | null;
  environment?: string | null;
  priority: string;
  status: string;
};

export type SearchComment = {
  id: EntityId;
  ticket_id?: EntityId;
  body: string;
  created_at?: string | null;
  updated_at?: string | null;
  author?: string | null;
  source?: string | null;
};

export type SearchResults = {
  /** Canonical results — UUID-keyed. */
  tickets: TicketSearchResult[];
  comments: SearchComment[];
  /** Legacy aliases — kept while the search page hasn't migrated. */
  issues: Issue[];
  messages: Array<
    ThreadMessage & {
      issue_id?: EntityId;
      issue_title?: string;
      environment?: string;
      breadcrumb?: string;
    }
  >;
};

export async function searchEverything(term: string): Promise<SearchResults> {
  type RawSearchResponse = Partial<SearchResults>;
  const data = await request<RawSearchResponse>(`/search?term=${encodeURIComponent(term)}`);

  const tickets = data.tickets ?? [];
  const comments = data.comments ?? [];

  const rawIssues = data.issues ?? tickets.map(ticketToIssue);
  const rawMessages = data.messages ?? [];

  return {
    tickets,
    comments,
    issues: rawIssues.map(normalizeSearchIssue),
    messages: rawMessages.map(normalizeSearchMessage),
  };
}

function ticketToIssue(t: TicketSearchResult): Issue {
  return {
    _id: t.id,
    title: t.title,
    created_at: 0,
    environment: t.environment ?? undefined,
    breadcrumb: t.breadcrumb ?? undefined,
  };
}

function normalizeSearchIssue(raw: LegacyEntity & Partial<TicketSearchResult>): Issue {
  const id = String(raw._id ?? raw.id ?? "");
  const createdAt = raw.created_at ?? 0;
  return {
    _id: id,
    title: String(raw.title ?? ""),
    created_at: typeof createdAt === "string" ? Date.parse(createdAt) : Number(createdAt),
    environment: typeof raw.environment === "string" ? raw.environment : undefined,
    breadcrumb: typeof raw.breadcrumb === "string" ? raw.breadcrumb : undefined,
  };
}

function normalizeSearchMessage(
  raw: LegacyEntity & {
    role?: string;
    content?: unknown;
    body?: unknown;
    issue_id?: unknown;
    ticket_id?: unknown;
    issue_title?: unknown;
    environment?: unknown;
    breadcrumb?: unknown;
  },
): SearchResults["messages"][number] {
  const id = String(raw._id ?? raw.id ?? "");
  const createdAt = raw.created_at ?? 0;
  const issueId = raw.issue_id ?? raw.ticket_id;
  const content = raw.content ?? raw.body ?? "";
  return {
    _id: id,
    role: raw.role === "assistant" ? "assistant" : "user",
    content: String(content),
    created_at: typeof createdAt === "string" ? Date.parse(createdAt) : Number(createdAt),
    issue_id: typeof issueId === "string" ? issueId : undefined,
    issue_title: typeof raw.issue_title === "string" ? raw.issue_title : undefined,
    environment: typeof raw.environment === "string" ? raw.environment : undefined,
    breadcrumb: typeof raw.breadcrumb === "string" ? raw.breadcrumb : undefined,
  };
}
