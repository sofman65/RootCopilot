import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId, getOrgId } from "./lib/auth";
import { api } from "./_generated/api";

export const getByThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return [];
    
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) return [];
    
    // Verify thread belongs to tenant
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.tenantId !== tenant._id) return [];
    
    return await ctx.db
      .query("thread_messages")
      .withIndex("by_thread", (q) => q.eq("thread_id", threadId))
      .order("asc")
      .collect();
  },
});

export const sendMessage = mutation({
  args: { threadId: v.id("threads"), content: v.string() },
  handler: async (ctx, { threadId, content }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Verify thread belongs to tenant
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.tenantId !== tenantId) {
      throw new Error("Thread not found or unauthorized");
    }
    
    await ctx.db.insert("thread_messages", {
      tenantId,
      thread_id: threadId,
      role: "user",
      content,
      created_at: Date.now(),
    });
  },
});

export const startAssistantMessage = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Verify thread belongs to tenant
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.tenantId !== tenantId) {
      throw new Error("Thread not found or unauthorized");
    }
    
    const id = await ctx.db.insert("thread_messages", {
      tenantId,
      thread_id: threadId,
      role: "assistant",
      content: "",
      created_at: Date.now(),
    });
    return id;
  },
});

export const appendToMessage = mutation({
  args: {
    messageId: v.id("thread_messages"),
    delta: v.string(),
  },
  handler: async (ctx, { messageId, delta }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    const msg = await ctx.db.get(messageId);
    if (!msg) {
      throw new Error("Assistant message not found");
    }
    
    // Verify tenant access
    if (msg.tenantId !== tenantId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.patch(messageId, {
      content: (msg.content ?? "") + delta,
    });
  },
});

export const sendQuickActionUserMessage = mutation({
  args: {
    threadId: v.id("threads"),
    instruction: v.string(),
  },
  handler: async (ctx, { threadId, instruction }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Verify thread belongs to tenant
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.tenantId !== tenantId) {
      throw new Error("Thread not found or unauthorized");
    }
    
    return await ctx.db.insert("thread_messages", {
      tenantId,
      thread_id: threadId,
      role: "user",
      content: instruction,
      created_at: Date.now(),
    });
  },
});
