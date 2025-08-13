import { query } from './_generated/server'
import { v } from 'convex/values'

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return ctx.db
      .query('environments')
      .withIndex('by_project', (q) => q.eq('project_id', projectId))
      .collect()
  },
})
