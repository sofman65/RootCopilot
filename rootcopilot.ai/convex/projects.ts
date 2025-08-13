import { query } from './_generated/server'
import { v } from 'convex/values'

export const listByClient = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, { clientId }) => {
    return ctx.db
      .query('projects')
      .withIndex('by_client', (q) => q.eq('client_id', clientId))
      .collect()
  },
})
