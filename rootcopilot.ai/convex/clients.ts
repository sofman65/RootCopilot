import { query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('clients').collect()
  },
})

export const getById = query({
  args: { id: v.id('clients') },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id)
  },
})
