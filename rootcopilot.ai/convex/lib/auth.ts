import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

type ConvexCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Get the organization ID from the authenticated user's identity.
 * This is the primary tenant key for multitenancy.
 */
export async function getOrgId(ctx: ConvexCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  // Clerk stores org info in the token claims
  // The org_id claim is set when a user is in an organization context
  const orgId = (identity as any).org_id ?? (identity as any).orgId ?? null;
  return orgId;
}

/**
 * Require organization ID - throws if not present
 */
export async function requireOrgId(ctx: ConvexCtx): Promise<string> {
  const orgId = await getOrgId(ctx);
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

