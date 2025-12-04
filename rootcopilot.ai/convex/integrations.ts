import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId, getOrgId } from "./lib/auth";
import { api } from "./_generated/api";

// Provider type validator
const providerType = v.union(
  v.literal("jira"),
  v.literal("linear"),
  v.literal("azure")
);

// ========================
// QUERIES
// ========================

export const list = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
    if (!orgId) return [];

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();

    if (!tenant) return [];

    return ctx.db
      .query("integrations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("integrations"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
    if (!orgId) return null;

    const integration = await ctx.db.get(id);
    if (!integration) return null;

    // Verify tenant access
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();

    if (!tenant || integration.tenantId !== tenant._id) return null;

    // Don't expose tokens in queries
    return {
      ...integration,
      accessToken: "***",
      refreshToken: integration.refreshToken ? "***" : undefined,
    };
  },
});

export const getByProvider = query({
  args: {
    provider: providerType,
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { provider, orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
    if (!orgId) return [];

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();

    if (!tenant) return [];

    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_provider", (q) =>
        q.eq("tenantId", tenant._id).eq("provider", provider)
      )
      .collect();

    // Hide tokens
    return integrations.map((i) => ({
      ...i,
      accessToken: "***",
      refreshToken: i.refreshToken ? "***" : undefined,
    }));
  },
});

// ========================
// MUTATIONS
// ========================

export const create = mutation({
  args: {
    provider: providerType,
    name: v.string(),
    baseUrl: v.optional(v.string()),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    config: v.optional(v.any()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, ...data } = args;
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });

    return await ctx.db.insert("integrations", {
      tenantId,
      provider: data.provider,
      name: data.name,
      baseUrl: data.baseUrl,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      config: data.config,
      status: "active",
      created_at: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("integrations"),
    name: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    config: v.optional(v.any()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("expired"), v.literal("error"))
    ),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, orgId, ...updates } = args;
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });

    const integration = await ctx.db.get(id);
    if (!integration || integration.tenantId !== tenantId) {
      throw new Error("Integration not found or unauthorized");
    }

    // Filter out undefined values
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }

    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: {
    id: v.id("integrations"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });

    const integration = await ctx.db.get(id);
    if (!integration || integration.tenantId !== tenantId) {
      throw new Error("Integration not found or unauthorized");
    }

    // Delete associated mappings
    const mappings = await ctx.db
      .query("mappings")
      .withIndex("by_integration", (q) => q.eq("integrationId", id))
      .collect();

    for (const mapping of mappings) {
      await ctx.db.delete(mapping._id);
    }

    await ctx.db.delete(id);
  },
});

export const updateLastSync = mutation({
  args: {
    id: v.id("integrations"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });

    const integration = await ctx.db.get(id);
    if (!integration || integration.tenantId !== tenantId) {
      throw new Error("Integration not found or unauthorized");
    }

    await ctx.db.patch(id, { lastSyncAt: Date.now() });
  },
});

// ========================
// MAPPINGS
// ========================

export const listMappings = query({
  args: {
    integrationId: v.optional(v.id("integrations")),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { integrationId, orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
    if (!orgId) return [];

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();

    if (!tenant) return [];

    if (integrationId) {
      return ctx.db
        .query("mappings")
        .withIndex("by_integration", (q) => q.eq("integrationId", integrationId))
        .collect();
    }

    return ctx.db
      .query("mappings")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();
  },
});

export const createMapping = mutation({
  args: {
    integrationId: v.id("integrations"),
    name: v.string(),
    mapping: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      priority: v.optional(v.string()),
      created: v.optional(v.string()),
      updated: v.optional(v.string()),
      externalKey: v.optional(v.string()),
      customFields: v.optional(v.any()),
    }),
    isDefault: v.optional(v.boolean()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, ...data } = args;
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });

    // Verify integration belongs to tenant
    const integration = await ctx.db.get(data.integrationId);
    if (!integration || integration.tenantId !== tenantId) {
      throw new Error("Integration not found or unauthorized");
    }

    // If this is the default, unset other defaults
    if (data.isDefault) {
      const existingMappings = await ctx.db
        .query("mappings")
        .withIndex("by_integration", (q) =>
          q.eq("integrationId", data.integrationId)
        )
        .collect();

      for (const m of existingMappings) {
        if (m.isDefault) {
          await ctx.db.patch(m._id, { isDefault: false });
        }
      }
    }

    return await ctx.db.insert("mappings", {
      tenantId,
      integrationId: data.integrationId,
      name: data.name,
      mapping: data.mapping,
      isDefault: data.isDefault ?? false,
      created_at: Date.now(),
    });
  },
});

export const updateMapping = mutation({
  args: {
    id: v.id("mappings"),
    name: v.optional(v.string()),
    mapping: v.optional(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        status: v.optional(v.string()),
        priority: v.optional(v.string()),
        created: v.optional(v.string()),
        updated: v.optional(v.string()),
        externalKey: v.optional(v.string()),
        customFields: v.optional(v.any()),
      })
    ),
    isDefault: v.optional(v.boolean()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, orgId, ...updates } = args;
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });

    const mapping = await ctx.db.get(id);
    if (!mapping || mapping.tenantId !== tenantId) {
      throw new Error("Mapping not found or unauthorized");
    }

    // If setting as default, unset others
    if (updates.isDefault) {
      const existingMappings = await ctx.db
        .query("mappings")
        .withIndex("by_integration", (q) =>
          q.eq("integrationId", mapping.integrationId)
        )
        .collect();

      for (const m of existingMappings) {
        if (m._id !== id && m.isDefault) {
          await ctx.db.patch(m._id, { isDefault: false });
        }
      }
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }

    await ctx.db.patch(id, patch);
  },
});

export const deleteMapping = mutation({
  args: {
    id: v.id("mappings"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { id, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });

    const mapping = await ctx.db.get(id);
    if (!mapping || mapping.tenantId !== tenantId) {
      throw new Error("Mapping not found or unauthorized");
    }

    await ctx.db.delete(id);
  },
});

// ========================
// DEFAULT MAPPINGS PER PROVIDER
// ========================

export const getDefaultMapping = query({
  args: {
    provider: providerType,
  },
  handler: async (_, { provider }) => {
    // Return sensible defaults for each provider
    switch (provider) {
      case "jira":
        return {
          title: "fields.summary",
          description: "fields.description",
          status: "fields.status.name",
          priority: "fields.priority.name",
          created: "fields.created",
          updated: "fields.updated",
          externalKey: "key",
        };
      case "linear":
        return {
          title: "title",
          description: "description",
          status: "state.name",
          priority: "priority",
          created: "createdAt",
          updated: "updatedAt",
          externalKey: "identifier",
        };
      case "azure":
        return {
          title: "fields.System.Title",
          description: "fields.System.Description",
          status: "fields.System.State",
          priority: "fields.Microsoft.VSTS.Common.Priority",
          created: "fields.System.CreatedDate",
          updated: "fields.System.ChangedDate",
          externalKey: "id",
        };
      default:
        return {
          title: "title",
          description: "description",
          status: "status",
          priority: "priority",
          created: "created",
          updated: "updated",
          externalKey: "id",
        };
    }
  },
});

