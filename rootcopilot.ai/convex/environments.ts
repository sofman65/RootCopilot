import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOrgId, getOrgId } from './lib/auth'
import { api } from './_generated/api'

const envNames = v.union(
  v.literal("PROD"),
  v.literal("UAT"),
  v.literal("SIT"),
  v.literal("PRE-SIT"),
  v.literal("DEV")
);

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return [];
    
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) return [];
    
    // Verify project belongs to tenant
    const project = await ctx.db.get(projectId);
    if (!project || project.tenantId !== tenant._id) return [];
    
    return ctx.db
      .query('environments')
      .withIndex('by_project', (q) => q.eq('project_id', projectId))
      .collect();
  },
})

export const getById = query({
  args: { id: v.id('environments') },
  handler: async (ctx, { id }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return null;
    
    const env = await ctx.db.get(id);
    if (!env) return null;
    
    // Verify tenant access
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant || env.tenantId !== tenant._id) return null;
    
    return env;
  },
})

export const create = mutation({
  args: { 
    projectId: v.id('projects'), 
    name: envNames,
  },
  handler: async (ctx, { projectId, name }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Verify project belongs to tenant
    const project = await ctx.db.get(projectId);
    if (!project || project.tenantId !== tenantId) {
      throw new Error('Project not found or unauthorized');
    }
    
    return await ctx.db.insert('environments', {
      tenantId,
      project_id: projectId,
      name,
    });
  },
})

export const remove = mutation({
  args: { id: v.id('environments') },
  handler: async (ctx, { id }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    const env = await ctx.db.get(id);
    if (!env || env.tenantId !== tenantId) {
      throw new Error('Environment not found or unauthorized');
    }
    
    await ctx.db.delete(id);
  },
})
