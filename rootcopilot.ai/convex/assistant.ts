import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ---------------------------
// ENV
// ---------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ---------------------------
// HELPERS
// ---------------------------

async function buildPrompt(ctx: any, threadId: string) {
  // Fetch full conversation
  const messages = await ctx.runQuery(api.thread_messages.getByThread, {
    threadId,
  });
  const lastUser = [...messages].reverse().find((m: any) => m.role === "user");

  // Thread
  const thread = await ctx.runQuery(api.threads.getById, { id: threadId });
  if (!thread) throw new Error("Thread not found");

  // Issue
  const issue = await ctx.runQuery(api.issues.getById, {
    issueId: thread.issue_id,
  });
  if (!issue) throw new Error("Issue not found");

  // Environment
  const env = await ctx.runQuery(api.environments.getById, {
    id: issue.environment_id,
  });

  // Project
  const project = env
    ? await ctx.runQuery(api.projects.getById, { id: env.project_id })
    : null;

  // Client
  const client = project
    ? await ctx.runQuery(api.clients.getById, { id: project.client_id })
    : null;

  const systemPrompt = `
You are RootCopilot — an enterprise AI debugging assistant.
You analyze issues in multi-environment payment systems.

Available context:
Client: ${client?.name ?? "Unknown"}
Project: ${project?.name ?? "Unknown"}
Environment: ${env?.name ?? "Unknown"}
Issue: ${issue?.title ?? "Unknown"}
Created: ${
      issue ? new Date(issue.created_at).toLocaleString() : "Unknown"
    }

Guidelines:
- Provide actionable debugging guidance.
- Use realistic payment-system reasoning.
- Never hallucinate system behavior.
- If needed, ask the user short clarifying questions.
`.trim();

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  return { chatMessages, lastUserContent: lastUser?.content ?? "" };
}

// ---------------------------
// Main Assistant Reply (Streaming)
// ---------------------------

export const reply = action({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

    // Build prompt with full DB context
    const { chatMessages, lastUserContent } = await buildPrompt(ctx, threadId);

    // Pull semantic context from RAG if available
    let ragContext = "";
    if (lastUserContent) {
      try {
        const ragResults = await ctx.runAction(api.rag.search, {
          query: lastUserContent,
          limit: 5,
          threshold: 0.15,
        });
        ragContext = ragResults
          .map(
            (r: any) =>
              `● Source: ${r.doc?.name ?? "Unknown"}\n${r.chunk}`
          )
          .join("\n\n");
      } catch (err) {
        console.error("RAG search failed", err);
      }
    }

    if (ragContext) {
      chatMessages.push({
        role: "system",
        content: `Relevant context:\n${ragContext}`,
      });
    }

    // Create assistant placeholder message
    const msgId = await ctx.runMutation(
      api.thread_messages.startAssistantMessage,
      { threadId }
    );

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body)
      throw new Error("OpenAI streaming failed");

    // Stream handling
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.replace("data:", "").trim();
        if (data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            await ctx.runMutation(api.thread_messages.appendToMessage, {
              messageId: msgId,
              delta,
            });
          }
        } catch (err) {
          console.error("Streaming parse error", err);
        }
      }
    }
  },
});

// ---------------------------
// QUICK ACTIONS (Placeholder or Streaming)
// ---------------------------

export const quickAction = action({
  args: { threadId: v.id("threads"), instruction: v.string() },
  handler: async (ctx, { threadId, instruction }) => {
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

    // Build contextual system prompt + history
    const { chatMessages } = await buildPrompt(ctx, threadId);

    // Add the quick-action instruction as a "new user message"
    chatMessages.push({
      role: "user",
      content: instruction,
    });

    // Create streaming assistant placeholder
    const msgId = await ctx.runMutation(api.thread_messages.startAssistantMessage, {
      threadId,
    });

    // Call OpenAI for streaming
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("OpenAI streaming error");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // STREAM CHUNKS FROM OPENAI
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const data = line.replace("data:", "").trim();
        if (data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;

          if (delta) {
            await ctx.runMutation(api.thread_messages.appendToMessage, {
              messageId: msgId,
              delta,
            });
          }
        } catch (err) {
          console.error("Stream parse error", err);
        }
      }
    }
  },
});
