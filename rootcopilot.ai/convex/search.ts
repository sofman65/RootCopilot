import { query } from "./_generated/server";
import { v } from "convex/values";

export const searchEverything = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const q = term.trim().toLowerCase();
    if (!q) return { issues: [], messages: [] };

    const [issues, threads, messages, envs, projects, clients] = await Promise.all([
      ctx.db.query("issues").collect(),
      ctx.db.query("threads").collect(),
      ctx.db.query("thread_messages").collect(),
      ctx.db.query("environments").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("clients").collect(),
    ]);

    const issueById = new Map(issues.map((i) => [i._id, i]));
    const envById = new Map(envs.map((e) => [e._id, e]));
    const threadById = new Map(threads.map((t) => [t._id, t]));
    const projectById = new Map(projects.map((p) => [p._id, p]));
    const clientById = new Map(clients.map((c) => [c._id, c]));

    const issueResults = issues
      .filter((i) => i.title.toLowerCase().includes(q))
      .map((i) => {
        const env = envById.get(i.environment_id);
        const project = env ? projectById.get(env.project_id) : undefined;
        const client = project ? clientById.get(project.client_id) : undefined;
        const breadcrumb = [client?.name, project?.name, env?.name]
          .filter(Boolean)
          .join(" › ");
        return {
          _id: i._id,
          title: i.title,
          created_at: i.created_at,
          environment_id: i.environment_id,
          environment: env?.name ?? "Unknown",
          breadcrumb,
        };
      })
      .sort((a, b) => b.created_at - a.created_at);

    const messageResults = messages
      .filter((m) => m.content.toLowerCase().includes(q))
      .map((m) => {
        const thread = threadById.get(m.thread_id);
        const issue = thread ? issueById.get(thread.issue_id) : undefined;
        const env = issue ? envById.get(issue.environment_id) : undefined;
        const project = env ? projectById.get(env.project_id) : undefined;
        const client = project ? clientById.get(project.client_id) : undefined;
        const envName = env?.name;
        const breadcrumb = issue
          ? [client?.name, project?.name, env?.name].filter(Boolean).join(" › ")
          : undefined;
        return {
          _id: m._id,
          content: m.content,
          created_at: m.created_at,
          thread_id: m.thread_id,
          issue_id: issue?._id,
          issue_title: issue?.title,
          environment: envName ?? "Unknown",
          breadcrumb,
        };
      })
      .sort((a, b) => b.created_at - a.created_at);

    return { issues: issueResults, messages: messageResults };
  },
});
