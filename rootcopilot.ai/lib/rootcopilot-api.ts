const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export type EntityId = string;

export type Client = {
  _id: EntityId;
  name: string;
};

export type Project = {
  _id: EntityId;
  client_id?: EntityId;
  name: string;
};

export type Environment = {
  _id: EntityId;
  project_id?: EntityId;
  name: string;
};

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

export type SearchResults = {
  issues: Issue[];
  messages: Array<ThreadMessage & {
    issue_id?: EntityId;
    issue_title?: string;
    environment?: string;
    breadcrumb?: string;
  }>;
};

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

type ApiEntity = {
  _id?: string;
  id?: string;
  created_at?: number | string;
  createdAt?: number | string;
  [key: string]: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function normalizeEntity<T extends ApiEntity>(entity: T): T & { _id: string; created_at: number } {
  const id = entity._id ?? entity.id;
  if (!id) {
    throw new Error("API entity is missing id/_id");
  }

  const createdAt = entity.created_at ?? entity.createdAt ?? Date.now();

  return {
    ...entity,
    _id: id,
    created_at: typeof createdAt === "string" ? Date.parse(createdAt) : createdAt,
  };
}

function normalizeList<T extends ApiEntity>(items: T[]) {
  return items.map(normalizeEntity);
}

export async function listClients() {
  return normalizeList(await request<ApiEntity[]>("/clients")) as unknown as Client[];
}

export async function listProjects(clientId: EntityId) {
  return normalizeList(await request<ApiEntity[]>(`/clients/${clientId}/projects`)) as unknown as Project[];
}

export async function listEnvironments(projectId: EntityId) {
  return normalizeList(await request<ApiEntity[]>(`/projects/${projectId}/environments`)) as unknown as Environment[];
}

export async function listIssues(environmentId: EntityId) {
  return normalizeList(await request<ApiEntity[]>(`/environments/${environmentId}/issues`)) as unknown as Issue[];
}

export async function searchEverything(term: string) {
  const data = await request<Partial<SearchResults>>(`/search?term=${encodeURIComponent(term)}`);
  return {
    issues: normalizeList((data.issues ?? []) as ApiEntity[]) as unknown as Issue[],
    messages: normalizeList((data.messages ?? []) as ApiEntity[]) as unknown as SearchResults["messages"],
  };
}

export async function listRagEntries(namespace?: string) {
  const query = namespace ? `?namespace=${encodeURIComponent(namespace)}` : "";
  return request<RagEntry[]>(`/rag/entries${query}`);
}

export async function addRagDocument(input: { name: string; text: string; namespace?: string }) {
  return request<void>("/rag/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function askRag(input: { question: string; namespace?: string }) {
  return request<{ answer: string; contexts?: RagSource[] }>("/rag/ask", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getIssue(issueId: EntityId) {
  return normalizeEntity(await request<ApiEntity>(`/issues/${issueId}`)) as unknown as Issue;
}

export async function getThreadByIssue(issueId: EntityId) {
  return normalizeEntity(await request<ApiEntity>(`/issues/${issueId}/thread`)) as unknown as Thread;
}

export async function createThread(issueId: EntityId) {
  return normalizeEntity(await request<ApiEntity>(`/issues/${issueId}/thread`, { method: "POST" })) as unknown as Thread;
}

export async function listThreadMessages(threadId: EntityId) {
  return normalizeList(await request<ApiEntity[]>(`/threads/${threadId}/messages`)) as unknown as ThreadMessage[];
}

export async function sendThreadMessage(input: { threadId: EntityId; content: string }) {
  return request<void>(`/threads/${input.threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: input.content }),
  });
}

export async function sendQuickActionUserMessage(input: { threadId: EntityId; instruction: string }) {
  return request<void>(`/threads/${input.threadId}/quick-action-message`, {
    method: "POST",
    body: JSON.stringify({ instruction: input.instruction }),
  });
}

export async function triggerAssistantReply(threadId: EntityId) {
  return request<void>(`/threads/${threadId}/assistant/reply`, { method: "POST" });
}

export async function triggerAssistantQuickAction(input: { threadId: EntityId; instruction: string }) {
  return request<void>(`/threads/${input.threadId}/assistant/quick-action`, {
    method: "POST",
    body: JSON.stringify({ instruction: input.instruction }),
  });
}
