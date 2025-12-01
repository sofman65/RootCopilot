"use node";

import { components, internal, api } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./lib/auth";

// Initialize RAG with OpenAI embeddings
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

// Helper to get tenant-scoped namespace
function getTenantNamespace(tenantId: string, namespace?: string): string {
  return `tenant:${tenantId}:${namespace ?? "global"}`;
}

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
    await requireOrgId(ctx);
    
    // Get or create tenant
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    const tenantNamespace = getTenantNamespace(tenantId, namespace);

    // Add to RAG component
    const { entryId } = await rag.add(ctx, {
      namespace: tenantNamespace,
      text,
      title: name,
    });

    // Track in our table
    await ctx.runMutation(internal.ragInternal.insertRagEntry, {
      tenantId,
      entryId,
      title: name,
      namespace: namespace ?? "global",
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
    await requireOrgId(ctx);
    
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    const tenantNamespace = getTenantNamespace(tenantId, namespace);

    const { results, text, entries, usage } = await rag.search(ctx, {
      namespace: tenantNamespace,
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
    await requireOrgId(ctx);
    
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    const tenantNamespace = getTenantNamespace(tenantId, namespace);

    const { text: answer, context } = await rag.generateText(ctx, {
      search: {
        namespace: tenantNamespace,
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
  handler: async (ctx, { namespace }): Promise<Array<{
    entryId: string;
    title: string;
    namespace: string;
    createdAt: number;
  }>> => {
    await requireOrgId(ctx);
    
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Get entries from our tracking table
    const entries: Array<{
      entryId: string;
      title: string;
      namespace: string;
      createdAt: number;
    }> = await ctx.runQuery(internal.ragInternal.getRagEntries, {
      tenantId,
      namespace: namespace ?? "global",
    });

    return entries;
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
    await requireOrgId(ctx);
    
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);

    // Delete from RAG component
    await rag.delete(ctx, { 
      entryId: entryId as `${string}:${string}` & { _: "EntryId" } 
    });

    // Delete from our tracking table
    await ctx.runMutation(internal.ragInternal.deleteRagEntryMutation, { tenantId, entryId });
  },
});

// ------------------------------
// Process File (OCR + RAG)
// ------------------------------
export const processFile = action({
  args: {
    fileId: v.id("files"),
    namespace: v.optional(v.string()),
  },
  handler: async (ctx, { fileId, namespace }) => {
    await requireOrgId(ctx);
    
    const tenantId = await ctx.runMutation(api.tenants.ensureTenant);
    
    // Get file info
    const file = await ctx.runQuery(internal.ragInternal.getFile, { fileId });
    if (!file) throw new Error("File not found");
    if (file.tenantId !== tenantId) throw new Error("Unauthorized");

    // Update status to processing
    await ctx.runMutation(internal.ragInternal.updateFileStatus, { 
      fileId, 
      status: "processing" 
    });

    try {
      // Get file from storage
      const blob = await ctx.storage.get(file.storageId);
      if (!blob) throw new Error("File not found in storage");

      const buffer = Buffer.from(await blob.arrayBuffer());
      let text = "";

      // Extract text based on file type
      const lowerName = file.name.toLowerCase();
      
      if (file.type.includes("pdf") || lowerName.endsWith(".pdf")) {
        text = await extractTextFromPdf(buffer);
      } else if (file.type.startsWith("image/")) {
        text = await ocrImage(buffer);
      } else if (
        lowerName.endsWith(".doc") || 
        lowerName.endsWith(".docx") ||
        file.type.includes("msword") ||
        file.type.includes("wordprocessingml")
      ) {
        text = await extractTextFromDocx(buffer);
      } else {
        // Assume plain text
        text = buffer.toString("utf-8");
      }

      if (!text.trim()) {
        throw new Error("No text could be extracted from file");
      }

      // Add to RAG
      const tenantNamespace = getTenantNamespace(tenantId, namespace);
      const { entryId } = await rag.add(ctx, {
        namespace: tenantNamespace,
        text,
        title: file.name,
      });

      // Track in our table
      await ctx.runMutation(internal.ragInternal.insertRagEntry, {
        tenantId,
        entryId,
        title: file.name,
        namespace: namespace ?? "global",
      });

      // Update file status
      await ctx.runMutation(internal.ragInternal.updateFileStatus, { 
        fileId, 
        status: "ready",
        ragEntryId: entryId,
      });

      return { entryId, textLength: text.length };
    } catch (error: unknown) {
      // Update file status to error
      await ctx.runMutation(internal.ragInternal.updateFileStatus, { 
        fileId, 
        status: "error" 
      });
      throw error;
    }
  },
});

// ------------------------------
// OCR and Text Extraction Helpers
// ------------------------------

const VISION_API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY;

async function ocrImage(buffer: Buffer): Promise<string> {
  if (!VISION_API_KEY) {
    throw new Error("GOOGLE_CLOUD_VISION_API_KEY not configured");
  }

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
  const content = buffer.toString("base64");
  
  const body = {
    requests: [
      {
        image: { content },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Vision API OCR failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const r = json.responses?.[0];
  
  if (r?.fullTextAnnotation?.text) {
    return r.fullTextAnnotation.text;
  }
  if (Array.isArray(r?.textAnnotations) && r.textAnnotations.length) {
    return r.textAnnotations.map((a: { description: string }) => a.description).join(" ");
  }
  
  return "";
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (!VISION_API_KEY) {
    throw new Error("GOOGLE_CLOUD_VISION_API_KEY not configured");
  }

  const url = `https://vision.googleapis.com/v1/files:annotate?key=${VISION_API_KEY}`;
  const content = buffer.toString("base64");
  
  const body = {
    requests: [
      {
        inputConfig: { mimeType: "application/pdf", content },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Vision PDF OCR failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const all = json.responses?.[0]?.responses ?? json.responses ?? [];
  const texts: string[] = [];

  for (const r of all) {
    if (r.fullTextAnnotation?.text) {
      texts.push(r.fullTextAnnotation.text);
    } else if (Array.isArray(r.textAnnotations) && r.textAnnotations.length) {
      texts.push(r.textAnnotations.map((a: { description: string }) => a.description).join(" "));
    }
  }

  return texts.join("\n\n");
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  // For DOCX files, we use mammoth if available, otherwise fall back to basic extraction
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    // Fallback: try to extract text from DOCX XML structure
    const content = buffer.toString("utf-8");
    // Basic XML text extraction
    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches) {
      return textMatches
        .map((m) => m.replace(/<[^>]+>/g, ""))
        .join(" ");
    }
    throw new Error("Unable to extract text from DOCX file");
  }
}
