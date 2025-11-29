import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
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
    await ctx.db.insert("thread_messages", {
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
    const id = await ctx.db.insert("thread_messages", {
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
    const msg = await ctx.db.get(messageId);
    if (!msg) {
      throw new Error("Assistant message not found");
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
    return await ctx.db.insert("thread_messages", {
      thread_id: threadId,
      role: "user",
      content: instruction,
      created_at: Date.now(),
    });
  },
});
