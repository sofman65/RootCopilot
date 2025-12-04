import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { 
  getTenant,
  ensureTenantId,
  getWithTenantCheck,
  requireWithTenantCheck,
  verifyParentTenant,
} from "./lib/tenant";

export const listByClient = query({
  args: {
    clientId: v.id("clients"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, orgId }) => {
    const tenant = await getTenant(ctx, orgId);
    if (!tenant) return [];

    // Verify client belongs to tenant
    const client = await ctx.db.get(clientId);
    if (!client || client.tenantId !== tenant._id) return [];

    return ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("client_id", clientId))
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("projects"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    return getWithTenantCheck(ctx, "projects", id, orgId);
  },
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, name, orgId }) => {
    const tenantId = await ensureTenantId(ctx, orgId);

    // Verify client belongs to tenant
    if (!await verifyParentTenant(ctx, clientId, tenantId)) {
      throw new Error("Client not found or unauthorized");
    }

    return ctx.db.insert("projects", {
      tenantId,
      client_id: clientId,
      name,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, orgId }) => {
    await requireWithTenantCheck(ctx, "projects", id, orgId, "Project not found or unauthorized");
    await ctx.db.patch(id, { name });
  },
});

export const remove = mutation({
  args: {
    id: v.id("projects"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    await requireWithTenantCheck(ctx, "projects", id, orgId, "Project not found or unauthorized");
    await ctx.db.delete(id);
  },
});
