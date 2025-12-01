import { action, query } from "./_generated/server";
import { v } from "convex/values";

const MODEL = "text-embedding-3-small";
const OPENAI_URL = "https://api.openai.com/v1/embeddings";

async function embed(text: string, apiKey: string) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: text }),
  });
  if (!res.ok) {
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.data[0].embedding as number[];
}

function chunkText(text: string, size = 400) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).trim().length > size) {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? " " : "") + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function cosine(a: number[], b: number[]) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const na = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const nb = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  if (na === 0 || nb === 0) return 0;
  return dot / (na * nb);
}

export const addDocument = action({
  args: {
    name: v.string(),
    type: v.union(v.literal("pdf"), v.literal("text"), v.literal("log"), v.literal("markdown")),
    text: v.string(),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    const docId = await ctx.db.insert("rag_documents", {
      name: args.name,
      type: args.type,
      namespace: args.namespace,
      created_at: Date.now(),
    });

    const chunks = chunkText(args.text);
    for (const chunk of chunks) {
      const embedding = await embed(chunk, apiKey);
      await ctx.db.insert("rag_chunks", {
        doc_id: docId,
        chunk,
        embedding,
      });
    }
    return docId;
  },
});

export const search = action({
  args: {
    query: v.string(),
    namespace: v.optional(v.string()),
    limit: v.optional(v.number()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, { query, namespace, limit, threshold }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
    const qEmbed = await embed(query, apiKey);

    const docs = await ctx.db.query("rag_documents").collect();
    const docById = new Map(docs.map((d) => [d._id, d]));

    const chunks = await ctx.db.query("rag_chunks").collect();
    const filtered = chunks.filter((c) => {
      if (!namespace) return true;
      const doc = docById.get(c.doc_id);
      return doc?.namespace === namespace;
    });

    const scored = filtered
      .map((c) => ({
        ...c,
        score: cosine(qEmbed, c.embedding),
      }))
      .filter((c) => c.score > (threshold ?? 0.15))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit ?? 10);

    return scored.map((c) => {
      const doc = docById.get(c.doc_id);
      return {
        chunk: c.chunk,
        score: c.score,
        doc: doc ? { id: doc._id, name: doc.name, type: doc.type, namespace: doc.namespace } : null,
      };
    });
  },
});

export const listDocs = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("rag_documents").order("desc").collect();
  },
});
