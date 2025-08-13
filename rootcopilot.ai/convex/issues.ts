import { query } from './_generated/server'
import { v } from 'convex/values'

export const listByEnvironment = query({
  args: { environmentId: v.id('environments') },
  handler: async (ctx, { environmentId }) => {
    return ctx.db
      .query('issues')
      .withIndex('by_env', (q) => q.eq('environment_id', environmentId))
      .collect()
  },
})

export const get = query({
  args: { id: v.id('issues') },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id)
  },
})


export const getById = query({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    return await ctx.db.get(issueId);
  },
});
