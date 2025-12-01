import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId, getOrgId } from "./lib/auth";

/**
 * Ensure a tenant exists for the current organization.
 * Creates one if it doesn't exist.
 * Returns the tenant ID.
 */
export const ensureTenant = mutation({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);

    // Check if tenant already exists
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();

    if (existing) return existing._id;

    // Create new tenant
    const tenantId = await ctx.db.insert("tenants", {
      orgId,
      name: "Organization",
      created_at: Date.now(),
    });

    return tenantId;
  },
});

/**
 * Get the current tenant for the authenticated organization.
 * Returns null if no tenant exists.
 */
export const getCurrentTenant = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return null;

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();

    return tenant;
  },
});

/**
 * Update tenant name
 */
export const updateTenantName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const orgId = await requireOrgId(ctx);

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ctx.db.patch(tenant._id, { name });
    return tenant._id;
  },
});

