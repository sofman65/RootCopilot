import { v } from "convex/values";

// ========================
// ENVIRONMENT TYPES
// ========================
export const ENV_NAMES = ["PROD", "UAT", "SIT", "PRE-SIT", "DEV"] as const;
export type EnvName = (typeof ENV_NAMES)[number];

export const envNameValidator = v.union(
  v.literal("PROD"),
  v.literal("UAT"),
  v.literal("SIT"),
  v.literal("PRE-SIT"),
  v.literal("DEV")
);

// ========================
// ISSUE TYPES
// ========================
export const ISSUE_STATUSES = ["open", "in_progress", "resolved", "closed", "unknown"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const issueStatusValidator = v.union(
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("closed"),
  v.literal("unknown")
);

export const ISSUE_PRIORITIES = ["critical", "high", "medium", "low", "unknown"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const issuePriorityValidator = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("unknown")
);

// ========================
// INTEGRATION TYPES
// ========================
export const PROVIDERS = ["jira", "linear", "azure"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const providerValidator = v.union(
  v.literal("jira"),
  v.literal("linear"),
  v.literal("azure")
);

export const INTEGRATION_STATUSES = ["active", "expired", "error"] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export const integrationStatusValidator = v.union(
  v.literal("active"),
  v.literal("expired"),
  v.literal("error")
);

// ========================
// FILE TYPES
// ========================
export const FILE_STATUSES = ["pending", "processing", "ready", "error"] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

export const fileStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("error")
);

// ========================
// IMPORT JOB TYPES
// ========================
export const IMPORT_JOB_STATUSES = ["pending", "running", "completed", "failed"] as const;
export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export const importJobStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed")
);

// ========================
// CHAT TYPES
// ========================
export const CHAT_ROLES = ["user", "assistant"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export const chatRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant")
);

