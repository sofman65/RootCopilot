import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOrgId, getOrgId } from './lib/auth'
import { api } from './_generated/api'

export const listByClient = query({
  args: { 
    clientId: v.id('clients'),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { clientId, orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
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
  args: { 
    id: v.id('projects'),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { id, orgId: passedOrgId }) => {
    const orgId = await getOrgId(ctx, passedOrgId);
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
  args: { 
    clientId: v.id('clients'), 
    name: v.string(),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { clientId, name, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });
    
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
  args: { 
    id: v.id('projects'), 
    name: v.string(),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { id, name, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });
    
    const project = await ctx.db.get(id);
    if (!project || project.tenantId !== tenantId) {
      throw new Error('Project not found or unauthorized');
    }
    
    await ctx.db.patch(id, { name });
  },
})

export const remove = mutation({
  args: { 
    id: v.id('projects'),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { id, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });
    
    const project = await ctx.db.get(id);
    if (!project || project.tenantId !== tenantId) {
      throw new Error('Project not found or unauthorized');
    }
    
    await ctx.db.delete(id);
  },
})
