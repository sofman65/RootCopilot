"use client";

import { usePathname } from "next/navigation";
import { useUser, useOrganization } from "@clerk/nextjs";
import AppSidebar from "@/components/AppSidebar";
import RootContentWrapper from "@/components/RootContentWrapper";

// Routes that should NOT show the sidebar
const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/welcome",
];

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  // Check if current route is public (no sidebar)
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Show full-page layout without sidebar for:
  // 1. Public routes (landing, sign-in, sign-up, onboarding)
  // 2. When user is not signed in
  // 3. When user has no organization selected
  const showSidebar = userLoaded && orgLoaded && isSignedIn && organization && !isPublicRoute;

  if (!showSidebar) {
    // Full-page layout without sidebar - allow natural scrolling
    return (
      <div className="min-h-screen w-full bg-neutral-950">
        {children}
      </div>
    );
  }

  // Authenticated layout with sidebar
  return (
    <div className="h-screen w-screen flex bg-neutral-950 overflow-hidden">
      <AppSidebar />
      <RootContentWrapper>
        {children}
      </RootContentWrapper>
    </div>
  );
}

