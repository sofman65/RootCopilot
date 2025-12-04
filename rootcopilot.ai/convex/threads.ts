import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { 
  getTenant,
  ensureTenantId,
  getWithTenantCheck,
  verifyParentTenant,
} from "./lib/tenant";

export const getByIssue = query({
  args: {
    issueId: v.id("issues"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { issueId, orgId }) => {
    const tenant = await getTenant(ctx, orgId);
    if (!tenant) return null;

    // Verify issue belongs to tenant
    const issue = await ctx.db.get(issueId);
    if (!issue || issue.tenantId !== tenant._id) return null;

    return ctx.db
      .query("threads")
      .withIndex("by_issue", (q) => q.eq("issue_id", issueId))
      .unique();
  },
});

export const create = mutation({
  args: {
    issueId: v.id("issues"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { issueId, orgId }) => {
    const tenantId = await ensureTenantId(ctx, orgId);

    // Verify issue belongs to tenant
    if (!await verifyParentTenant(ctx, issueId, tenantId)) {
      throw new Error("Issue not found or unauthorized");
    }

    return ctx.db.insert("threads", {
      tenantId,
      issue_id: issueId,
    });
  },
});

export const getById = query({
  args: {
    id: v.id("threads"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    return getWithTenantCheck(ctx, "threads", id, orgId);
  },
});
