import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId, getOrgId } from "./lib/auth";
import { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireOrgId(ctx);
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
  handler: async (ctx, args): Promise<Id<"files">> => {
    const orgId = await requireOrgId(ctx);
    
    // Get tenant
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const { storageId, name, type, size, namespace } = args;
    const fileId = await ctx.db.insert("files", {
      tenantId: tenant._id,
      name,
      type,
      size,
      storageId,
      namespace,
      status: "pending",
      created_at: Date.now(),
    });
    return fileId;
  },
});

export const listFiles = query({
  args: { namespace: v.optional(v.string()) },
  handler: async (ctx, { namespace }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return [];
    
    // Get tenant
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) return [];

    let files;
    if (namespace) {
      files = await ctx.db
        .query("files")
        .withIndex("by_namespace", (q) => 
          q.eq("tenantId", tenant._id).eq("namespace", namespace)
        )
        .order("desc")
        .collect();
    } else {
      files = await ctx.db
        .query("files")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
        .order("desc")
        .collect();
    }
    
    return files;
  },
});

export const getFile = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return null;
    
    const file = await ctx.db.get(fileId);
    if (!file) return null;
    
    // Verify tenant access
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant || file.tenantId !== tenant._id) return null;
    
    return file;
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const orgId = await requireOrgId(ctx);
    
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");
    if (file.tenantId !== tenant._id) throw new Error("Unauthorized");
    
    // Delete from storage
    await ctx.storage.delete(file.storageId);
    
    // Delete file record
    await ctx.db.delete(fileId);
  },
});
