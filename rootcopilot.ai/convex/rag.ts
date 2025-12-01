import { components } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { action } from "./_generated/server";
import { v } from "convex/values";

// Initialize RAG with OpenAI embeddings
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

// ------------------------------
// Add Document (text-based)
// ------------------------------
export const addDocument = action({
  args: {
    name: v.string(),
    text: v.string(),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, { name, text, namespace }) => {
    const { entryId } = await rag.add(ctx, {
      namespace: namespace ?? "global",
      text,
      title: name,
    });
    return { entryId };
  },
});

// ------------------------------
// Search
// ------------------------------
export const search = action({
  args: {
    query: v.string(),
    namespace: v.optional(v.string()),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, { query: q, namespace, limit, threshold }) => {
    const { results, text, entries, usage } = await rag.search(ctx, {
      namespace: namespace ?? "global",
      query: q,
      limit: limit ?? 10,
      vectorScoreThreshold: threshold ?? 0.3,
    });

    return {
      results,
      text,
      entries,
      usage,
    };
  },
});

// ------------------------------
// Ask - RAG-powered Q&A
// ------------------------------
export const ask = action({
  args: {
    question: v.string(),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, { question, namespace }) => {
    const { text: answer, context } = await rag.generateText(ctx, {
      search: {
        namespace: namespace ?? "global",
        limit: 10,
        vectorScoreThreshold: 0.3,
      },
      prompt: question,
      model: openai.chat("gpt-4o-mini"),
    });

    return {
      answer,
      contexts: context.results.map((r) => ({
        chunk: r.content.map((c) => c.text).join("\n"),
        score: r.score,
        doc: {
          name: context.entries.find((e) => e.entryId === r.entryId)?.title,
          namespace: namespace ?? "global",
        },
      })),
    };
  },
});

// ------------------------------
// List Entries (for sidebar)
// ------------------------------
export const listEntries = action({
  args: {
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, { namespace }) => {
    const ns = namespace ?? "global";
    // Get the namespace first
    const namespaceData = await rag.getNamespace(ctx, { namespace: ns });
    
    if (!namespaceData) {
      return [];
    }
    
    const { page } = await rag.list(ctx, {
      namespaceId: namespaceData.namespaceId,
      status: "ready",
      paginationOpts: { cursor: null, numItems: 50 },
    });

    return page.map((entry) => ({
      entryId: entry.entryId,
      title: entry.title,
      namespace: ns,
      createdAt: Date.now(), // Entry doesn't have createdAt, using current time as placeholder
    }));
  },
});

// ------------------------------
// Delete Entry
// ------------------------------
export const deleteEntry = action({
  args: {
    entryId: v.string(),
  },
  handler: async (ctx, { entryId }) => {
    await rag.delete(ctx, { entryId: entryId as `${string}:${string}` & { _: "EntryId" } });
  },
});
