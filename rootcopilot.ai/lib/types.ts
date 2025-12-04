/**
 * Re-export shared types from Convex for frontend use.
 * This provides a single import location for common types.
 */

export type {
  EnvName,
  IssueStatus,
  IssuePriority,
  Provider,
  IntegrationStatus,
  FileStatus,
  ImportJobStatus,
  ChatRole,
} from "@/convex/lib/types";

// Constants for UI dropdowns and selects
export { 
  ENV_NAMES,
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
  PROVIDERS,
  INTEGRATION_STATUSES,
  FILE_STATUSES,
  IMPORT_JOB_STATUSES,
  CHAT_ROLES,
} from "@/convex/lib/types";

