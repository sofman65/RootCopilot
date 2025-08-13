import { query } from './_generated/server'
import { v } from 'convex/values'

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }
    return await ctx.db
      .query('messages')
      .filter((q) => q.eq(q.field('author'), identity.email))
      .collect()
  },
})

export const getByThread = query({
  args: { threadId: v.id('threads') },
  handler: async (ctx, { threadId }) => {
    return ctx.db
      .query('thread_messages')
      .withIndex('by_thread', (q) => q.eq('thread_id', threadId))
      .order('asc')
      .collect()
  },
})