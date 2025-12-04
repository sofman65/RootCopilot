import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Id, Doc, TableNames } from "../_generated/dataModel";
import { getOrgId, requireOrgId } from "./auth";
import { api } from "../_generated/api";

type ConvexCtx = QueryCtx | MutationCtx | ActionCtx;

// ========================
// TENANT LOOKUP HELPERS
// ========================

/**
 * Get tenant for the current organization (query context).
 * Returns null if not authenticated or tenant doesn't exist.
 */
export async function getTenant(
  ctx: QueryCtx,
  passedOrgId?: string
): Promise<Doc<"tenants"> | null> {
  const orgId = await getOrgId(ctx, passedOrgId);
  if (!orgId) return null;

  return ctx.db
    .query("tenants")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .unique();
}

/**
 * Get tenant ID, returns null if not found.
 * Use this when you just need the ID, not the full tenant doc.
 */
export async function getTenantId(
  ctx: QueryCtx,
  passedOrgId?: string
): Promise<Id<"tenants"> | null> {
  const tenant = await getTenant(ctx, passedOrgId);
  return tenant?._id ?? null;
}

/**
 * Ensure tenant exists for the current organization (mutation context).
 * Creates the tenant if it doesn't exist.
 * Throws if no organization context.
 */
export async function ensureTenantId(
  ctx: MutationCtx,
  passedOrgId?: string
): Promise<Id<"tenants">> {
  await requireOrgId(ctx, passedOrgId);
  return ctx.runMutation(api.tenants.ensureTenant, { orgId: passedOrgId });
}

// ========================
// AUTHORIZATION HELPERS
// ========================

type TenantDoc = Doc<"clients"> | Doc<"projects"> | Doc<"environments"> | 
                Doc<"issues"> | Doc<"threads"> | Doc<"integrations"> | Doc<"mappings">;

/**
 * Verify an item belongs to the current tenant (query context).
 * Returns true if authorized, false otherwise.
 */
export async function verifyTenantAccess<T extends TenantDoc>(
  ctx: QueryCtx,
  item: T | null,
  passedOrgId?: string
): Promise<boolean> {
  if (!item) return false;
  
  const tenant = await getTenant(ctx, passedOrgId);
  if (!tenant) return false;
  
  // Handle both optional and required tenantId
  const itemTenantId = (item as { tenantId?: Id<"tenants"> }).tenantId;
  return itemTenantId === tenant._id;
}

/**
 * Get an item by ID and verify tenant access (query context).
 * Returns null if not found or unauthorized.
 */
export async function getWithTenantCheck<T extends TableNames>(
  ctx: QueryCtx,
  table: T,
  id: Id<T>,
  passedOrgId?: string
): Promise<Doc<T> | null> {
  const item = await ctx.db.get(id);
  if (!item) return null;
  
  const tenant = await getTenant(ctx, passedOrgId);
  if (!tenant) return null;
  
  // Check if item has tenantId field and matches
  const tenantId = (item as unknown as { tenantId?: Id<"tenants"> }).tenantId;
  if (tenantId && tenantId !== tenant._id) return null;
  
  return item;
}

/**
 * Require an item exists and belongs to tenant (mutation context).
 * Throws if not found or unauthorized.
 */
export async function requireWithTenantCheck<T extends TableNames>(
  ctx: MutationCtx,
  table: T,
  id: Id<T>,
  passedOrgId?: string,
  errorMessage?: string
): Promise<{ item: Doc<T>; tenantId: Id<"tenants"> }> {
  const tenantId = await ensureTenantId(ctx, passedOrgId);
  const item = await ctx.db.get(id);
  
  if (!item) {
    throw new Error(errorMessage ?? `${table} not found`);
  }
  
  const itemTenantId = (item as unknown as { tenantId?: Id<"tenants"> }).tenantId;
  if (itemTenantId && itemTenantId !== tenantId) {
    throw new Error(errorMessage ?? `${table} not found or unauthorized`);
  }
  
  return { item, tenantId };
}

// ========================
// COMMON QUERY PATTERNS
// ========================

/**
 * Verify a parent entity belongs to tenant before operations.
 * Uses type assertion since we're dealing with a union of ID types.
 */
export async function verifyParentTenant(
  ctx: QueryCtx | MutationCtx,
  parentId: Id<"clients"> | Id<"projects"> | Id<"environments"> | Id<"issues">,
  tenantId: Id<"tenants">
): Promise<boolean> {
  // Use type assertion to get the document - all these tables have tenantId
  const parent = await (ctx.db.get as (id: typeof parentId) => Promise<{ tenantId?: Id<"tenants"> } | null>)(parentId);
  if (!parent) return false;
  
  return parent.tenantId === tenantId;
}

