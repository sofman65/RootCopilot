"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { requireOrgId } from "./lib/auth";

// ========================
// TYPES
// ========================

type ExternalIssue = {
  key: string;
  id: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  created?: string;
  updated?: string;
  url?: string;
};

type MappingConfig = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  created?: string;
  updated?: string;
  externalKey?: string;
  customFields?: Record<string, string>;
};

// ========================
// HELPER: Get nested value from object using dot notation
// ========================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// ========================
// JIRA INTEGRATION
// ========================

export const fetchJiraProjects = action({
  args: {
    integrationId: v.id("integrations"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { integrationId, orgId }) => {
    await requireOrgId(ctx, orgId);

    const integration = await ctx.runQuery(internal.importPipelineInternal.getIntegrationInternal, {
      integrationId,
    });

    if (!integration || integration.provider !== "jira") {
      throw new Error("Invalid Jira integration");
    }

    const baseUrl = integration.baseUrl || "https://api.atlassian.com";
    
    const response = await fetch(`${baseUrl}/rest/api/3/project/search`, {
      headers: {
        Authorization: `Basic ${integration.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    const data = await response.json();
    return data.values || [];
  },
});

export const fetchJiraIssues = action({
  args: {
    integrationId: v.id("integrations"),
    projectKey: v.string(),
    jql: v.optional(v.string()),
    maxResults: v.optional(v.number()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { integrationId, projectKey, jql, maxResults = 50, orgId }) => {
    await requireOrgId(ctx, orgId);

    const integration = await ctx.runQuery(internal.importPipelineInternal.getIntegrationInternal, {
      integrationId,
    });

    if (!integration || integration.provider !== "jira") {
      throw new Error("Invalid Jira integration");
    }

    const baseUrl = integration.baseUrl || "https://api.atlassian.com";
    const query = jql || `project=${projectKey} ORDER BY created DESC`;
    
    const response = await fetch(
      `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Basic ${integration.accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      issues: data.issues || [],
      total: data.total || 0,
      maxResults: data.maxResults || maxResults,
    };
  },
});

// ========================
// LINEAR INTEGRATION
// ========================

export const fetchLinearTeams = action({
  args: {
    integrationId: v.id("integrations"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { integrationId, orgId }) => {
    await requireOrgId(ctx, orgId);

    const integration = await ctx.runQuery(internal.importPipelineInternal.getIntegrationInternal, {
      integrationId,
    });

    if (!integration || integration.provider !== "linear") {
      throw new Error("Invalid Linear integration");
    }

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: integration.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query { teams { nodes { id name key } } }`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.teams?.nodes || [];
  },
});

export const fetchLinearIssues = action({
  args: {
    integrationId: v.id("integrations"),
    teamId: v.string(),
    maxResults: v.optional(v.number()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { integrationId, teamId, maxResults = 50, orgId }) => {
    await requireOrgId(ctx, orgId);

    const integration = await ctx.runQuery(internal.importPipelineInternal.getIntegrationInternal, {
      integrationId,
    });

    if (!integration || integration.provider !== "linear") {
      throw new Error("Invalid Linear integration");
    }

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: integration.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query($teamId: String!, $first: Int!) {
            team(id: $teamId) {
              issues(first: $first, orderBy: createdAt) {
                nodes {
                  id
                  identifier
                  title
                  description
                  state { name }
                  priority
                  labels { nodes { name } }
                  assignee { name }
                  createdAt
                  updatedAt
                  url
                }
              }
            }
          }
        `,
        variables: { teamId, first: maxResults },
      }),
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status}`);
    }

    const data = await response.json();
    const issues = data.data?.team?.issues?.nodes || [];

    return {
      issues,
      total: issues.length,
      maxResults,
    };
  },
});

// ========================
// AZURE DEVOPS INTEGRATION
// ========================

export const fetchAzureProjects = action({
  args: {
    integrationId: v.id("integrations"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { integrationId, orgId }) => {
    await requireOrgId(ctx, orgId);

    const integration = await ctx.runQuery(internal.importPipelineInternal.getIntegrationInternal, {
      integrationId,
    });

    if (!integration || integration.provider !== "azure") {
      throw new Error("Invalid Azure DevOps integration");
    }

    const baseUrl = integration.baseUrl;
    if (!baseUrl) throw new Error("Azure DevOps requires a base URL");

    const response = await fetch(`${baseUrl}/_apis/projects?api-version=7.0`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${integration.accessToken}`).toString("base64")}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.status}`);
    }

    const data = await response.json();
    return data.value || [];
  },
});

export const fetchAzureWorkItems = action({
  args: {
    integrationId: v.id("integrations"),
    project: v.string(),
    wiql: v.optional(v.string()),
    maxResults: v.optional(v.number()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { integrationId, project, wiql, maxResults = 50, orgId }) => {
    await requireOrgId(ctx, orgId);

    const integration = await ctx.runQuery(internal.importPipelineInternal.getIntegrationInternal, {
      integrationId,
    });

    if (!integration || integration.provider !== "azure") {
      throw new Error("Invalid Azure DevOps integration");
    }

    const baseUrl = integration.baseUrl;
    if (!baseUrl) throw new Error("Azure DevOps requires a base URL");

    const query = wiql || `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [System.CreatedDate] DESC`;

    // First, get work item IDs via WIQL
    const wiqlResponse = await fetch(`${baseUrl}/${project}/_apis/wit/wiql?api-version=7.0&$top=${maxResults}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`:${integration.accessToken}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!wiqlResponse.ok) {
      throw new Error(`Azure DevOps WIQL error: ${wiqlResponse.status}`);
    }

    const wiqlData = await wiqlResponse.json();
    const ids = (wiqlData.workItems || []).map((w: { id: number }) => w.id);

    if (ids.length === 0) {
      return { issues: [], total: 0, maxResults };
    }

    // Then fetch full work item details
    const idsStr = ids.slice(0, maxResults).join(",");
    const itemsResponse = await fetch(
      `${baseUrl}/_apis/wit/workitems?ids=${idsStr}&api-version=7.0`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${integration.accessToken}`).toString("base64")}`,
          Accept: "application/json",
        },
      }
    );

    if (!itemsResponse.ok) {
      throw new Error(`Azure DevOps work items error: ${itemsResponse.status}`);
    }

    const itemsData = await itemsResponse.json();

    return {
      issues: itemsData.value || [],
      total: wiqlData.workItems?.length || 0,
      maxResults,
    };
  },
});

// ========================
// GENERIC PREVIEW (Normalizes external issues)
// ========================

export const previewImport = action({
  args: {
    integrationId: v.id("integrations"),
    mappingId: v.optional(v.id("mappings")),
    externalIssues: v.array(v.any()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { integrationId, mappingId, externalIssues, orgId }) => {
    await requireOrgId(ctx, orgId);

    // Get mapping (or use defaults)
    let mapping: MappingConfig;

    if (mappingId) {
      const m = await ctx.runQuery(internal.importPipelineInternal.getMappingInternal, { mappingId });
      if (!m) throw new Error("Mapping not found");
      mapping = m.mapping as MappingConfig;
    } else {
      const integration = await ctx.runQuery(internal.importPipelineInternal.getIntegrationInternal, {
        integrationId,
      });
      if (!integration) throw new Error("Integration not found");

      mapping = await ctx.runQuery(api.integrations.getDefaultMapping, {
        provider: integration.provider,
      }) as MappingConfig;
    }

    // Normalize issues using mapping
    const normalized: ExternalIssue[] = externalIssues.map((issue) => ({
      key: String(getNestedValue(issue, mapping.externalKey || "key") || issue.id || "unknown"),
      id: String(issue.id || ""),
      title: String(getNestedValue(issue, mapping.title) || "Untitled"),
      description: mapping.description
        ? String(getNestedValue(issue, mapping.description) || "")
        : undefined,
      status: mapping.status
        ? String(getNestedValue(issue, mapping.status) || "unknown")
        : undefined,
      priority: mapping.priority
        ? String(getNestedValue(issue, mapping.priority) || "unknown")
        : undefined,
      created: mapping.created
        ? String(getNestedValue(issue, mapping.created) || "")
        : undefined,
      updated: mapping.updated
        ? String(getNestedValue(issue, mapping.updated) || "")
        : undefined,
      url: issue.url || issue.self || undefined,
    }));

    return normalized;
  },
});

// ========================
// IMPORT EXECUTION
// ========================

export const importIssues = action({
  args: {
    integrationId: v.id("integrations"),
    mappingId: v.optional(v.id("mappings")),
    projectId: v.id("projects"),
    environmentId: v.id("environments"),
    externalIssues: v.array(v.any()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { integrationId, mappingId, projectId, environmentId, externalIssues, orgId } = args;

    await requireOrgId(ctx, orgId);

    // Create import job
    const jobId = await ctx.runMutation(internal.importPipelineInternal.createImportJob, {
      integrationId,
      mappingId,
      projectId,
      environmentId,
      totalIssues: externalIssues.length,
      orgId,
    });

    try {
      // Get normalized preview
      const normalized = await ctx.runAction(api.importPipeline.previewImport, {
        integrationId,
        mappingId,
        externalIssues,
        orgId,
      });

      // Get integration info
      const integration = await ctx.runQuery(internal.importPipelineInternal.getIntegrationInternal, {
        integrationId,
      });

      let importedCount = 0;
      let failedCount = 0;

      for (const issue of normalized) {
        try {
          await ctx.runMutation(internal.importPipelineInternal.insertImportedIssue, {
            environmentId,
            issue: {
              ...issue,
              externalSource: integration?.provider,
            },
            importJobId: jobId,
            orgId,
          });
          importedCount++;
        } catch (err) {
          console.error("Failed to import issue:", issue.key, err);
          failedCount++;
        }
      }

      // Update job status
      await ctx.runMutation(internal.importPipelineInternal.updateImportJob, {
        jobId,
        status: "completed",
        importedCount,
        failedCount,
      });

      // Update integration sync time
      await ctx.runMutation(api.integrations.updateLastSync, {
        id: integrationId,
        orgId,
      });

      return {
        success: true,
        jobId,
        importedCount,
        failedCount,
      };
    } catch (err) {
      // Mark job as failed
      await ctx.runMutation(internal.importPipelineInternal.updateImportJob, {
        jobId,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });

      throw err;
    }
  },
});

// ========================
// IMPORT HISTORY
// ========================

export const listImportJobs = action({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    limit: v.optional(v.number()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, { status, limit = 20, orgId }) => {
    await requireOrgId(ctx, orgId);

    const jobs = await ctx.runQuery(internal.importPipelineInternal.getImportJobsInternal, {
      status,
      limit,
      orgId,
    });

    return jobs;
  },
});
