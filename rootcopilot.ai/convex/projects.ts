import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOrgId, getOrgId } from './lib/auth'
import { api } from './_generated/api'

export const listByClient = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, { clientId }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return [];
    
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) return [];
    
    // Verify client belongs to tenant
    const client = await ctx.db.get(clientId);
    if (!client || client.tenantId !== tenant._id) return [];
    
    return ctx.db
      .query('projects')
      .withIndex('by_client', (q) => q.eq('client_id', clientId))
      .collect();
  },
})

export const getById = query({
  args: { id: v.id('projects') },
  handler: async (ctx, { id }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return null;
    
    const project = await ctx.db.get(id);
    if (!project) return null;
    
    // Verify tenant access
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant || project.tenantId !== tenant._id) return null;
    
    return project;
  },
})

export const create = mutation({
  args: { clientId: v.id('clients'), name: v.string() },
  handler: async (ctx, { clientId, name }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Verify client belongs to tenant
    const client = await ctx.db.get(clientId);
    if (!client || client.tenantId !== tenantId) {
      throw new Error('Client not found or unauthorized');
    }
    
    return await ctx.db.insert('projects', {
      tenantId,
      client_id: clientId,
      name,
    });
  },
})

export const update = mutation({
  args: { id: v.id('projects'), name: v.string() },
  handler: async (ctx, { id, name }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    const project = await ctx.db.get(id);
    if (!project || project.tenantId !== tenantId) {
      throw new Error('Project not found or unauthorized');
    }
    
    await ctx.db.patch(id, { name });
  },
})

export const remove = mutation({
  args: { id: v.id('projects') },
  handler: async (ctx, { id }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    const project = await ctx.db.get(id);
    if (!project || project.tenantId !== tenantId) {
      throw new Error('Project not found or unauthorized');
    }
    
    await ctx.db.delete(id);
  },
})
