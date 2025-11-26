import { query } from './_generated/server'
import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const getByIssue = query({
  args: { issueId: v.id('issues') },
  handler: async (ctx, { issueId }) => {
    return ctx.db
      .query('threads')
      .withIndex('by_issue', (q) => q.eq('issue_id', issueId))
      .unique()
  },
})

export const create = mutation({
  args: { issueId: v.id('issues') },
  handler: async (ctx, { issueId }) => {
    return await ctx.db.insert('threads', { issue_id: issueId })
  },
})

export const getById = query({
  args: { id: v.id('threads') },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id)
  },
})
