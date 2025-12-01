import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // RAG tables (managed manually)
  rag_documents: defineTable({
    name: v.string(),
    type: v.union(v.literal('pdf'), v.literal('text'), v.literal('log'), v.literal('markdown')),
    namespace: v.optional(v.string()),
    created_at: v.number(),
  }),

  rag_chunks: defineTable({
    doc_id: v.id('rag_documents'),
    chunk: v.string(),
    embedding: v.array(v.number()),
  }).index('by_doc', ['doc_id']),

  // Keep existing simple messages table used by current UI
  messages: defineTable({
    author: v.string(),
    content: v.string(),
  }),

  clients: defineTable({
    name: v.string(),
  }),

  projects: defineTable({
    client_id: v.id('clients'),
    name: v.string(),
  }).index('by_client', ['client_id']),

  environments: defineTable({
    project_id: v.id('projects'),
    name: v.union(
      v.literal('PROD'),
      v.literal('UAT'),
      v.literal('SIT'),
      v.literal('PRE-SIT'),
      v.literal('DEV')
    ),
  }).index('by_project', ['project_id']),

  issues: defineTable({
    environment_id: v.id('environments'),
    title: v.string(),
    created_at: v.number(),
  }).index('by_env', ['environment_id']),

  threads: defineTable({
    issue_id: v.id('issues'),
  }).index('by_issue', ['issue_id']),

  thread_messages: defineTable({
    thread_id: v.id('threads'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    created_at: v.number(),
  }).index('by_thread', ['thread_id', 'created_at']),
})
