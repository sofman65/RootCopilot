import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { 
  getTenant, 
  ensureTenantId, 
  getWithTenantCheck,
  requireWithTenantCheck,
} from "./lib/tenant";

export const list = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { orgId }) => {
    const tenant = await getTenant(ctx, orgId);
    if (!tenant) return [];

    return ctx.db
      .query("clients")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("clients"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    return getWithTenantCheck(ctx, "clients", id, orgId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { name, orgId }) => {
    const tenantId = await ensureTenantId(ctx, orgId);

    return ctx.db.insert("clients", {
      tenantId,
      name,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.string(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, orgId }) => {
    await requireWithTenantCheck(ctx, "clients", id, orgId, "Client not found or unauthorized");
    await ctx.db.patch(id, { name });
  },
});

export const remove = mutation({
  args: {
    id: v.id("clients"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    await requireWithTenantCheck(ctx, "clients", id, orgId, "Client not found or unauthorized");
    await ctx.db.delete(id);
  },
});
