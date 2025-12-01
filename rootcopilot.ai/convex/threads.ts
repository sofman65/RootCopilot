import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOrgId, getOrgId } from './lib/auth'
import { api } from './_generated/api'

export const getByIssue = query({
  args: { issueId: v.id('issues') },
  handler: async (ctx, { issueId }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return null;
    
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant) return null;
    
    // Verify issue belongs to tenant
    const issue = await ctx.db.get(issueId);
    if (!issue || issue.tenantId !== tenant._id) return null;
    
    return ctx.db
      .query('threads')
      .withIndex('by_issue', (q) => q.eq('issue_id', issueId))
      .unique();
  },
})

export const create = mutation({
  args: { issueId: v.id('issues') },
  handler: async (ctx, { issueId }) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Verify issue belongs to tenant
    const issue = await ctx.db.get(issueId);
    if (!issue || issue.tenantId !== tenantId) {
      throw new Error('Issue not found or unauthorized');
    }
    
    return await ctx.db.insert('threads', { 
      tenantId,
      issue_id: issueId,
    });
  },
})

export const getById = query({
  args: { id: v.id('threads') },
  handler: async (ctx, { id }) => {
    const orgId = await getOrgId(ctx);
    if (!orgId) return null;
    
    const thread = await ctx.db.get(id);
    if (!thread) return null;
    
    // Verify tenant access
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    
    if (!tenant || thread.tenantId !== tenant._id) return null;
    
    return thread;
  },
})
