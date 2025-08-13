import { query } from './_generated/server'
import { v } from 'convex/values'

export const getByIssue = query({
  args: { issueId: v.id('issues') },
  handler: async (ctx, { issueId }) => {
    return ctx.db
      .query('threads')
      .withIndex('by_issue', (q) => q.eq('issue_id', issueId))
      .unique()
  },
})
