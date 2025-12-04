import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { 
  providerValidator, 
  issueStatusValidator, 
  issuePriorityValidator,
  envNameValidator,
  integrationStatusValidator,
  fileStatusValidator,
  importJobStatusValidator,
  chatRoleValidator,
} from "./lib/types";

export default defineSchema({
  // Tenants table - maps Clerk organizations to internal tenant IDs
  tenants: defineTable({
    orgId: v.string(),
    name: v.string(),
    created_at: v.number(),
  }).index("by_orgId", ["orgId"]),

  // ========================
  // INTEGRATIONS & MAPPINGS
  // ========================

  // External system integrations (Jira, Linear, Azure DevOps)
  integrations: defineTable({
    tenantId: v.id("tenants"),
    provider: providerValidator,
    name: v.string(),
    baseUrl: v.optional(v.string()),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    config: v.optional(v.any()),
    status: integrationStatusValidator,
    lastSyncAt: v.optional(v.number()),
    created_at: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_provider", ["tenantId", "provider"]),

  // Field mappings for imports
  mappings: defineTable({
    tenantId: v.id("tenants"),
    integrationId: v.id("integrations"),
    name: v.string(),
    mapping: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      priority: v.optional(v.string()),
      created: v.optional(v.string()),
      updated: v.optional(v.string()),
      externalKey: v.optional(v.string()),
      customFields: v.optional(v.any()),
    }),
    isDefault: v.boolean(),
    created_at: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_integration", ["integrationId"]),

  // Import history/jobs
  importJobs: defineTable({
    tenantId: v.id("tenants"),
    integrationId: v.id("integrations"),
    mappingId: v.optional(v.id("mappings")),
    projectId: v.id("projects"),
    environmentId: v.id("environments"),
    status: importJobStatusValidator,
    totalIssues: v.optional(v.number()),
    importedCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    externalQuery: v.optional(v.string()),
    started_at: v.number(),
    completed_at: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_status", ["tenantId", "status"]),

  // ========================
  // RAG & FILES
  // ========================

  // RAG entries - tracks documents indexed in the RAG component
  rag_entries: defineTable({
    tenantId: v.id("tenants"),
    entryId: v.string(),
    title: v.string(),
    namespace: v.string(),
    created_at: v.number(),
  }).index("by_tenant", ["tenantId"]),

  // Files - uploaded documents
  files: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    namespace: v.optional(v.string()),
    status: v.optional(fileStatusValidator),
    ragEntryId: v.optional(v.string()),
    created_at: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_namespace", ["tenantId", "namespace"]),

  // Simple messages table (legacy)
  messages: defineTable({
    author: v.string(),
    content: v.string(),
  }),

  // ========================
  // ISSUE TREE (Multi-tenant)
  // ========================

  clients: defineTable({
    tenantId: v.optional(v.id("tenants")),
    name: v.string(),
  }).index("by_tenant", ["tenantId"]),

  projects: defineTable({
    tenantId: v.optional(v.id("tenants")),
    client_id: v.id("clients"),
    name: v.string(),
    externalId: v.optional(v.string()),
    externalKey: v.optional(v.string()),
    externalSource: v.optional(providerValidator),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_client", ["client_id"])
    .index("by_external", ["tenantId", "externalSource", "externalKey"]),

  environments: defineTable({
    tenantId: v.optional(v.id("tenants")),
    project_id: v.id("projects"),
    name: envNameValidator,
  })
    .index("by_tenant", ["tenantId"])
    .index("by_project", ["project_id"]),

  // EXPANDED ISSUES TABLE
  issues: defineTable({
    tenantId: v.optional(v.id("tenants")),
    environment_id: v.id("environments"),
    title: v.string(),
    description: v.optional(v.string()),
    descriptionHtml: v.optional(v.string()),
    externalKey: v.optional(v.string()),
    externalId: v.optional(v.string()),
    externalSource: v.optional(providerValidator),
    externalUrl: v.optional(v.string()),
    status: v.optional(issueStatusValidator),
    priority: v.optional(issuePriorityValidator),
    labels: v.optional(v.array(v.string())),
    assignee: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.optional(v.number()),
    importJobId: v.optional(v.id("importJobs")),
    lastSyncAt: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_env", ["environment_id"])
    .index("by_external", ["tenantId", "externalSource", "externalKey"])
    .index("by_status", ["tenantId", "status"]),

  threads: defineTable({
    tenantId: v.optional(v.id("tenants")),
    issue_id: v.id("issues"),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_issue", ["issue_id"]),

  thread_messages: defineTable({
    tenantId: v.optional(v.id("tenants")),
    thread_id: v.id("threads"),
    role: chatRoleValidator,
    content: v.string(),
    created_at: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_thread", ["thread_id", "created_at"]),
});
