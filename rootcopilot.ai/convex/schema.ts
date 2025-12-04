import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Provider types for integrations
const providerType = v.union(
  v.literal("jira"),
  v.literal("linear"),
  v.literal("azure")
);

// Issue status types
const issueStatusType = v.union(
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("closed"),
  v.literal("unknown")
);

// Issue priority types
const issuePriorityType = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("unknown")
);

export default defineSchema({
  // Tenants table - maps Clerk organizations to internal tenant IDs
  tenants: defineTable({
    orgId: v.string(),     // Clerk Organization ID
    name: v.string(),
    created_at: v.number(),
  }).index("by_orgId", ["orgId"]),

  // ========================
  // INTEGRATIONS & MAPPINGS
  // ========================
  
  // External system integrations (Jira, Linear, Azure DevOps)
  integrations: defineTable({
    tenantId: v.id("tenants"),
    provider: providerType,
    name: v.string(),                          // "My Jira Cloud"
    baseUrl: v.optional(v.string()),           // "https://company.atlassian.net"
    accessToken: v.string(),                   // Encrypted token
    refreshToken: v.optional(v.string()),      // For OAuth refresh
    expiresAt: v.optional(v.number()),         // Token expiry
    config: v.optional(v.any()),               // Provider-specific config
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("error")
    ),
    lastSyncAt: v.optional(v.number()),
    created_at: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_provider", ["tenantId", "provider"]),

  // Field mappings for imports
  mappings: defineTable({
    tenantId: v.id("tenants"),
    integrationId: v.id("integrations"),
    name: v.string(),                          // "Default Jira Mapping"
    mapping: v.object({
      // External field → Internal field
      title: v.string(),                       // e.g., "summary"
      description: v.optional(v.string()),     // e.g., "description"
      status: v.optional(v.string()),          // e.g., "status.name"
      priority: v.optional(v.string()),        // e.g., "priority.name"
      created: v.optional(v.string()),         // e.g., "created"
      updated: v.optional(v.string()),         // e.g., "updated"
      externalKey: v.optional(v.string()),     // e.g., "key"
      customFields: v.optional(v.any()),       // Additional mappings
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
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    totalIssues: v.optional(v.number()),
    importedCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    externalQuery: v.optional(v.string()),     // JQL, Linear filter, etc.
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
    entryId: v.string(),      // RAG component entry ID
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
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    )),
    ragEntryId: v.optional(v.string()),  // Link to RAG entry once processed
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
    // External project info (for imported projects)
    externalId: v.optional(v.string()),
    externalKey: v.optional(v.string()),       // e.g., "PROJ" in Jira
    externalSource: v.optional(providerType),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_client", ["client_id"])
    .index("by_external", ["tenantId", "externalSource", "externalKey"]),

  environments: defineTable({
    tenantId: v.optional(v.id("tenants")),
    project_id: v.id("projects"),
    name: v.union(
      v.literal("PROD"),
      v.literal("UAT"),
      v.literal("SIT"),
      v.literal("PRE-SIT"),
      v.literal("DEV")
    ),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_project", ["project_id"]),

  // EXPANDED ISSUES TABLE
  issues: defineTable({
    tenantId: v.optional(v.id("tenants")),
    environment_id: v.id("environments"),
    title: v.string(),
    // Rich text description (stored as JSON from Tiptap/Lexical)
    description: v.optional(v.string()),
    descriptionHtml: v.optional(v.string()),   // Pre-rendered HTML for display
    // External issue tracking
    externalKey: v.optional(v.string()),       // "JIRA-9283"
    externalId: v.optional(v.string()),        // External system ID
    externalSource: v.optional(providerType),
    externalUrl: v.optional(v.string()),       // Link back to source
    // Status & priority
    status: v.optional(issueStatusType),
    priority: v.optional(issuePriorityType),
    // Labels/tags
    labels: v.optional(v.array(v.string())),
    // Assignee (optional, for display)
    assignee: v.optional(v.string()),
    // Timestamps
    created_at: v.number(),
    updated_at: v.optional(v.number()),
    // Import tracking
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
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    created_at: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_thread", ["thread_id", "created_at"]),
})
