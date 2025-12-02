import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOrgId, getOrgId } from './lib/auth'
import { api } from './_generated/api'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return [];
    
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) return [];
    
    return ctx.db
      .query('clients')
      .withIndex('by_tenant', (q) => q.eq('tenantId', tenant._id))
      .collect();
  },
})

export const getById = query({
  args: { id: v.id('clients') },
  handler: async (ctx, { id }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return null;
    
    const client = await ctx.db.get(id);
    if (!client) return null;
    
    // Verify tenant access
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant || client.tenantId !== tenant._id) return null;
    
    return client;
  },
})

export const create = mutation({
  args: { 
    name: v.string(),
    orgId: v.optional(v.string()), // Pass from client-side Clerk
  },
  handler: async (ctx, { name, orgId }) => {
    await requireOrgId(ctx, orgId);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant, { orgId });
    
    return await ctx.db.insert('clients', {
      tenantId,
      name,
    });
  },
})

export const update = mutation({
  args: { id: v.id('clients'), name: v.string() },
  handler: async (ctx, { id, name }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    const client = await ctx.db.get(id);
    if (!client || client.tenantId !== tenantId) {
      throw new Error('Client not found or unauthorized');
    }
    
    await ctx.db.patch(id, { name });
  },
})

export const remove = mutation({
  args: { id: v.id('clients') },
  handler: async (ctx, { id }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    const client = await ctx.db.get(id);
    if (!client || client.tenantId !== tenantId) {
      throw new Error('Client not found or unauthorized');
    }
    
    await ctx.db.delete(id);
  },
})
