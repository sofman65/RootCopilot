import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Provider type for validation
const providerType = v.union(
  v.literal("jira"),
  v.literal("linear"),
  v.literal("azure")
);

// ========================
// INTERNAL QUERIES
// ========================

export const getIntegrationInternal = internalQuery({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, { integrationId }) => {
    return await ctx.db.get(integrationId);
  },
});

export const getMappingInternal = internalQuery({
  args: { mappingId: v.id("mappings") },
  handler: async (ctx, { mappingId }) => {
    return await ctx.db.get(mappingId);
  },
});

export const getImportJobsInternal = internalQuery({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    limit: v.number(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { status, limit, orgId }) => {
    if (!orgId) return [];

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();

    if (!tenant) return [];

    const jobs = await ctx.db
      .query("importJobs")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .order("desc")
      .take(limit);

    if (status) {
      return jobs.filter((j) => j.status === status);
    }

    return jobs;
  },
});

// ========================
// INTERNAL MUTATIONS
// ========================

export const createImportJob = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    mappingId: v.optional(v.id("mappings")),
    projectId: v.id("projects"),
    environmentId: v.id("environments"),
    totalIssues: v.number(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId: args.orgId });

    return await ctx.db.insert("importJobs", {
      tenantId,
      integrationId: args.integrationId,
      mappingId: args.mappingId,
      projectId: args.projectId,
      environmentId: args.environmentId,
      status: "running",
      totalIssues: args.totalIssues,
      importedCount: 0,
      failedCount: 0,
      started_at: Date.now(),
    });
  },
});

export const updateImportJob = internalMutation({
  args: {
    jobId: v.id("importJobs"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    importedCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, ...updates }) => {
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }

    if (updates.status === "completed" || updates.status === "failed") {
      patch.completed_at = Date.now();
    }

    await ctx.db.patch(jobId, patch);
  },
});

export const insertImportedIssue = internalMutation({
  args: {
    environmentId: v.id("environments"),
    issue: v.object({
      key: v.string(),
      id: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      descriptionHtml: v.optional(v.string()),
      status: v.optional(v.string()),
      priority: v.optional(v.string()),
      labels: v.optional(v.array(v.string())),
      assignee: v.optional(v.string()),
      created: v.optional(v.string()),
      updated: v.optional(v.string()),
      url: v.optional(v.string()),
      externalSource: v.optional(providerType),
    }),
    importJobId: v.id("importJobs"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { environmentId, issue, importJobId, orgId }) => {
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });

    // Map status to internal enum
    const statusMap: Record<string, "open" | "in_progress" | "resolved" | "closed" | "unknown"> = {
      open: "open",
      new: "open",
      todo: "open",
      "to do": "open",
      "in progress": "in_progress",
      "in review": "in_progress",
      doing: "in_progress",
      done: "resolved",
      resolved: "resolved",
      closed: "closed",
      cancelled: "closed",
    };

    const priorityMap: Record<string, "critical" | "high" | "medium" | "low" | "unknown"> = {
      critical: "critical",
      highest: "critical",
      urgent: "critical",
      high: "high",
      medium: "medium",
      normal: "medium",
      low: "low",
      lowest: "low",
    };

    const normalizedStatus = statusMap[issue.status?.toLowerCase() || ""] || "unknown";
    const normalizedPriority = priorityMap[issue.priority?.toLowerCase() || ""] || "unknown";

    // Check if issue already exists
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_external", (q) =>
        q
          .eq("tenantId", tenantId)
          .eq("externalSource", issue.externalSource)
          .eq("externalKey", issue.key)
      )
      .first();

    if (existing) {
      // Update existing issue
      await ctx.db.patch(existing._id, {
        title: issue.title,
        description: issue.description,
        descriptionHtml: issue.descriptionHtml,
        status: normalizedStatus,
        priority: normalizedPriority,
        labels: issue.labels,
        assignee: issue.assignee,
        updated_at: Date.now(),
        lastSyncAt: Date.now(),
      });
      return existing._id;
    }

    // Create new issue
    const issueId = await ctx.db.insert("issues", {
      tenantId,
      environment_id: environmentId,
      title: issue.title,
      description: issue.description,
      descriptionHtml: issue.descriptionHtml,
      externalKey: issue.key,
      externalId: issue.id,
      externalSource: issue.externalSource,
      externalUrl: issue.url,
      status: normalizedStatus,
      priority: normalizedPriority,
      labels: issue.labels,
      assignee: issue.assignee,
      created_at: issue.created ? new Date(issue.created).getTime() : Date.now(),
      updated_at: issue.updated ? new Date(issue.updated).getTime() : undefined,
      importJobId,
      lastSyncAt: Date.now(),
    });

    // Create thread for RootCopilot
    await ctx.db.insert("threads", {
      tenantId,
      issue_id: issueId,
    });

    return issueId;
  },
});

