import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOrgId, getOrgId } from './lib/auth'
import { api } from './_generated/api'

export const listByEnvironment = query({
  args: { 
    environmentId: v.id('environments'),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { environmentId, orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
    if (!orgId) return [];
    
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) return [];
    
    // Verify environment belongs to tenant
    const env = await ctx.db.get(environmentId);
    if (!env || env.tenantId !== tenant._id) return [];
    
    return ctx.db
      .query('issues')
      .withIndex('by_env', (q) => q.eq('environment_id', environmentId))
      .collect();
  },
})

export const listAll = query({
  args: {
    orgId: v.optional(v.string()), // Pass from client-side Clerk
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
      .query('issues')
      .withIndex('by_tenant', (q) => q.eq('tenantId', tenant._id))
      .order('desc')
      .collect();
  },
})

export const get = query({
  args: { 
    id: v.id('issues'),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { id, orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
    if (!orgId) return null;
    
    const issue = await ctx.db.get(id);
    if (!issue) return null;
    
    // Verify tenant access
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant || issue.tenantId !== tenant._id) return null;
    
    return issue;
  },
})

export const getById = query({
  args: { 
    issueId: v.id("issues"),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { issueId, orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
    if (!orgId) return null;
    
    const issue = await ctx.db.get(issueId);
    if (!issue) return null;
    
    // Verify tenant access
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant || issue.tenantId !== tenant._id) return null;
    
    return issue;
  },
})

export const create = mutation({
  args: { 
    environmentId: v.id('environments'), 
    title: v.string(),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { environmentId, title, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });
    
    // Verify environment belongs to tenant
    const env = await ctx.db.get(environmentId);
    if (!env || env.tenantId !== tenantId) {
      throw new Error('Environment not found or unauthorized');
    }
    
    return await ctx.db.insert('issues', {
      tenantId,
      environment_id: environmentId,
      title,
      created_at: Date.now(),
    });
  },
})

export const update = mutation({
  args: { 
    id: v.id('issues'), 
    title: v.string(),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { id, title, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });
    
    const issue = await ctx.db.get(id);
    if (!issue || issue.tenantId !== tenantId) {
      throw new Error('Issue not found or unauthorized');
    }
    
    await ctx.db.patch(id, { title });
  },
})

export const remove = mutation({
  args: { 
    id: v.id('issues'),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { id, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });
    
    const issue = await ctx.db.get(id);
    if (!issue || issue.tenantId !== tenantId) {
      throw new Error('Issue not found or unauthorized');
    }
    
    await ctx.db.delete(id);
  },
})
