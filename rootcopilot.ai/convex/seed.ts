import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireOrgId } from './lib/auth'
import { api } from './_generated/api'

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOrgId(ctx);
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Idempotent: reuse if already present by name
    const clientName = 'Demo Client'
    const projectName = 'Demo Project'

    let client = await ctx.db
      .query('clients')
      .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId))
      .filter((q) => q.eq(q.field('name'), clientName))
      .first()

    if (!client) {
      const clientId = await ctx.db.insert('clients', { 
        tenantId,
        name: clientName,
      })
      client = (await ctx.db.get(clientId))!
    }

    let project = await ctx.db
      .query('projects')
      .withIndex('by_client', (q) => q.eq('client_id', client._id))
      .filter((q) => q.eq(q.field('name'), projectName))
      .first()

    if (!project) {
      const projectId = await ctx.db.insert('projects', {
        tenantId,
        client_id: client._id,
        name: projectName,
      })
      project = (await ctx.db.get(projectId))!
    }

    const envNames = ['DEV', 'SIT', 'UAT', 'PRE-SIT', 'PROD'] as const
    const envIds: Array<import('./_generated/dataModel').Id<'environments'>> = []

    for (const name of envNames) {
      let env = await ctx.db
        .query('environments')
        .withIndex('by_project', (q) => q.eq('project_id', project._id))
        .filter((q) => q.eq(q.field('name'), name))
        .first()
      if (!env) {
        const envId = await ctx.db.insert('environments', {
          tenantId,
          project_id: project._id,
          name,
        })
        env = (await ctx.db.get(envId))!
      }
      envIds.push(env._id)
    }

    const now = Date.now()
    const createdIssueIds: string[] = []

    for (const [i, envId] of envIds.entries()) {
      // seed 3 issues per env if none exist
      const existing = await ctx.db
        .query('issues')
        .withIndex('by_env', (q) => q.eq('environment_id', envId))
        .first()
      if (existing) continue

      for (let j = 0; j < 3; j++) {
        const issueId = await ctx.db.insert('issues', {
          tenantId,
          environment_id: envId,
          title: `Sample issue ${i + 1}-${j + 1}`,
          created_at: now - (i * 3 + j) * 3600_000,
        })
        createdIssueIds.push(issueId)
        const threadId = await ctx.db.insert('threads', {
          tenantId,
          issue_id: issueId,
        })
        await ctx.db.insert('messages', {
          author: 'system',
          content: 'Thread created with seed data.',
        })
      }
    }

    return {
      client: client._id,
      project: project._id,
      seededIssues: createdIssueIds.length,
    }
  },
})
