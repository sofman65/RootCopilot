import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { 
  getTenant,
  ensureTenantId,
  getWithTenantCheck,
  requireWithTenantCheck,
  verifyParentTenant,
} from "./lib/tenant";
import { issueStatusValidator, issuePriorityValidator } from "./lib/types";

export const listByEnvironment = query({
  args: {
    environmentId: v.id("environments"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { environmentId, orgId }) => {
    const tenant = await getTenant(ctx, orgId);
    if (!tenant) return [];

    // Verify environment belongs to tenant
    const env = await ctx.db.get(environmentId);
    if (!env || env.tenantId !== tenant._id) return [];

    return ctx.db
      .query("issues")
      .withIndex("by_env", (q) => q.eq("environment_id", environmentId))
      .collect();
  },
});

export const listAll = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { orgId }) => {
    const tenant = await getTenant(ctx, orgId);
    if (!tenant) return [];

    return ctx.db
      .query("issues")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id("issues"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    return getWithTenantCheck(ctx, "issues", id, orgId);
  },
});

export const getById = query({
  args: {
    issueId: v.id("issues"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { issueId, orgId }) => {
    return getWithTenantCheck(ctx, "issues", issueId, orgId);
  },
});

export const create = mutation({
  args: {
    environmentId: v.id("environments"),
    title: v.string(),
    description: v.optional(v.string()),
    descriptionHtml: v.optional(v.string()),
    status: v.optional(issueStatusValidator),
    priority: v.optional(issuePriorityValidator),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { environmentId, title, description, descriptionHtml, status, priority, orgId }) => {
    const tenantId = await ensureTenantId(ctx, orgId);

    // Verify environment belongs to tenant
    if (!await verifyParentTenant(ctx, environmentId, tenantId)) {
      throw new Error("Environment not found or unauthorized");
    }

    const issueId = await ctx.db.insert("issues", {
      tenantId,
      environment_id: environmentId,
      title,
      description,
      descriptionHtml,
      status: status ?? "open",
      priority: priority ?? "medium",
      created_at: Date.now(),
    });

    // Auto-create thread for the issue
    await ctx.db.insert("threads", {
      tenantId,
      issue_id: issueId,
    });

    return issueId;
  },
});

export const update = mutation({
  args: {
    id: v.id("issues"),
    title: v.string(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, title, orgId }) => {
    await requireWithTenantCheck(ctx, "issues", id, orgId, "Issue not found or unauthorized");
    await ctx.db.patch(id, { title });
  },
});

export const remove = mutation({
  args: {
    id: v.id("issues"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    await requireWithTenantCheck(ctx, "issues", id, orgId, "Issue not found or unauthorized");
    await ctx.db.delete(id);
  },
});
