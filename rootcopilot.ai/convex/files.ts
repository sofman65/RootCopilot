import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { storageId, name, type, size, namespace } = args;
    const fileId = await ctx.db.insert("files", {
      name,
      type,
      size,
      storageId,
      namespace,
      created_at: Date.now(),
    });
    return fileId;
  },
});

export const listFiles = query({
  args: { namespace: v.optional(v.string()) },
  handler: async (ctx, { namespace }) => {
    let q = ctx.db.query("files");
    if (namespace) {
      q = q.withIndex("by_namespace", (q2) => q2.eq("namespace", namespace));
    }
    return await q.order("desc").collect();
  },
});
