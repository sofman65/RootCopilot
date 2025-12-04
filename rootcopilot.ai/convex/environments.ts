import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { 
  getTenant,
  ensureTenantId,
  getWithTenantCheck,
  requireWithTenantCheck,
  verifyParentTenant,
} from "./lib/tenant";
import { envNameValidator } from "./lib/types";

export const listByProject = query({
  args: {
    projectId: v.id("projects"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, orgId }) => {
    const tenant = await getTenant(ctx, orgId);
    if (!tenant) return [];

    // Verify project belongs to tenant
    const project = await ctx.db.get(projectId);
    if (!project || project.tenantId !== tenant._id) return [];

    return ctx.db
      .query("environments")
      .withIndex("by_project", (q) => q.eq("project_id", projectId))
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("environments"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    return getWithTenantCheck(ctx, "environments", id, orgId);
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: envNameValidator,
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, name, orgId }) => {
    const tenantId = await ensureTenantId(ctx, orgId);

    // Verify project belongs to tenant
    if (!await verifyParentTenant(ctx, projectId, tenantId)) {
      throw new Error("Project not found or unauthorized");
    }

    return ctx.db.insert("environments", {
      tenantId,
      project_id: projectId,
      name,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("environments"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    await requireWithTenantCheck(ctx, "environments", id, orgId, "Environment not found or unauthorized");
    await ctx.db.delete(id);
  },
});
