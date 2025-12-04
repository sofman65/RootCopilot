"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";

interface UseOrgGuardOptions {
  /** Route to redirect to if no organization (default: "/onboarding") */
  redirectTo?: string;
  /** Whether to perform the redirect (default: true) */
  shouldRedirect?: boolean;
}

interface UseOrgGuardReturn {
  /** The current organization (or null if not selected) */
  organization: ReturnType<typeof useOrganization>["organization"];
  /** Whether the organization data is loaded */
  isLoaded: boolean;
  /** Whether there's a valid organization selected */
  hasOrganization: boolean;
}

/**
 * Hook for guarding routes that require an organization.
 * Automatically redirects to onboarding if no organization is selected.
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { organization, hasOrganization } = useOrgGuard();
 * 
 *   if (!hasOrganization) {
 *     return <LoadingSkeleton />;
 *   }
 * 
 *   return <div>Welcome to {organization.name}</div>;
 * }
 * ```
 */
export function useOrgGuard(options: UseOrgGuardOptions = {}): UseOrgGuardReturn {
  const { redirectTo = "/onboarding", shouldRedirect = true } = options;
  
  const router = useRouter();
  const { organization, isLoaded } = useOrganization();

  useEffect(() => {
    if (isLoaded && !organization && shouldRedirect) {
      router.push(redirectTo);
    }
  }, [isLoaded, organization, shouldRedirect, redirectTo, router]);

  return {
    organization,
    isLoaded,
    hasOrganization: isLoaded && !!organization,
  };
}

export default useOrgGuard;

