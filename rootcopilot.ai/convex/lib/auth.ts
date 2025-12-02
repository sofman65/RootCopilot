import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

type ConvexCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Get the organization ID from the authenticated user's identity.
 * This is the primary tenant key for multitenancy.
 * 
 * Note: Clerk's org_id may need to be configured in JWT templates.
 * As a fallback, we accept orgId as a parameter from the client.
 */
export async function getOrgId(ctx: ConvexCtx, passedOrgId?: string): Promise<string | null> {
  // If passed from client, use it (client-side Clerk has org context)
  if (passedOrgId) {
    return passedOrgId;
  }
  
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  // Clerk stores org info in the token claims
  // Check various possible claim names
  const id = identity as Record<string, unknown>;
  const orgId = 
    id.org_id ?? 
    id.orgId ?? 
    id.organization_id ?? 
    id.organizationId ??
    // Clerk sometimes nests org info
    (id.org as Record<string, unknown>)?.id ??
    null;
  
  return orgId as string | null;
}

/**
 * Require organization ID - throws if not present
 */
export async function requireOrgId(ctx: ConvexCtx, passedOrgId?: string): Promise<string> {
  const orgId = await getOrgId(ctx, passedOrgId);
  if (!orgId) {
    throw new Error("Unauthorized: Organization context required");
  }
  return orgId;
}

/**
 * Get user ID from identity
 */
export async function getUserId(ctx: ConvexCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return identity.subject;
}


