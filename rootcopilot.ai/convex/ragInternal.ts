import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to save RAG entry
export const insertRagEntry = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    entryId: v.string(),
    title: v.string(),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("rag_entries", {
      tenantId: args.tenantId,
      entryId: args.entryId,
      title: args.title,
      namespace: args.namespace,
      created_at: Date.now(),
    });
  },
});

export const getRagEntries = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    namespace: v.string(),
  },
  handler: async (ctx, { tenantId, namespace }): Promise<Array<{
    entryId: string;
    title: string;
    namespace: string;
    createdAt: number;
  }>> => {
    const entries = await ctx.db
      .query("rag_entries")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    return entries
      .filter((e) => e.namespace === namespace)
      .map((entry) => ({
        entryId: entry.entryId,
        title: entry.title,
        namespace: entry.namespace,
        createdAt: entry.created_at,
      }));
  },
});

export const deleteRagEntryMutation = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    entryId: v.string(),
  },
  handler: async (ctx, { tenantId, entryId }) => {
    const entry = await ctx.db
      .query("rag_entries")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) => q.eq(q.field("entryId"), entryId))
      .first();

    if (entry) {
      await ctx.db.delete(entry._id);
    }
  },
});

export const getFile = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    return await ctx.db.get(fileId);
  },
});

export const updateFileStatus = internalMutation({
  args: { 
    fileId: v.id("files"), 
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
    ragEntryId: v.optional(v.string()),
  },
  handler: async (ctx, { fileId, status, ragEntryId }) => {
    const updates: { 
      status: "pending" | "processing" | "ready" | "error"; 
      ragEntryId?: string;
    } = { status };
    if (ragEntryId) updates.ragEntryId = ragEntryId;
    await ctx.db.patch(fileId, updates);
  },
});

