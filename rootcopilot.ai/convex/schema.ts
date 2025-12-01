import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Tenants table - maps Clerk organizations to internal tenant IDs
  tenants: defineTable({
    orgId: v.string(),     // Clerk Organization ID
    name: v.string(),
    created_at: v.number(),
  }).index("by_orgId", ["orgId"]),

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

  // Simple messages table
  messages: defineTable({
    author: v.string(),
    content: v.string(),
  }),

  // Issue tree - all scoped by tenant
  // Note: tenantId is optional for migration - existing data may not have it
  clients: defineTable({
    tenantId: v.optional(v.id("tenants")),
    name: v.string(),
  }).index("by_tenant", ["tenantId"]),

  projects: defineTable({
    tenantId: v.optional(v.id("tenants")),
    client_id: v.id("clients"),
    name: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_client", ["client_id"]),

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

  issues: defineTable({
    tenantId: v.optional(v.id("tenants")),
    environment_id: v.id("environments"),
    title: v.string(),
    created_at: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_env", ["environment_id"]),

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
