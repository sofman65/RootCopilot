"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { UserButton, OrganizationSwitcher, useOrganization } from "@clerk/nextjs";
import { IconSettings } from "@tabler/icons-react";

import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

import type { Id } from "@/convex/_generated/dataModel";
import SidebarHeader from "@/components/sidebar/SidebarHeader";
import WorkspaceTree from "@/components/sidebar/WorkspaceTree";
import ThemeToggle from "@/components/ThemeToggle";
import { DEMO_MODE, DEMO_ORG_NAME, DEMO_ORG_ID } from "@/lib/demo";

const STORAGE_KEY = "rcp.sidebar.expanded.v1";

type Persisted = {
  clients: Id<"clients">[];
  projects: Id<"projects">[];
  envs: Id<"environments">[];
};

export default function AppSidebar() {
  const router = useRouter();
  const { open } = useSidebar();
  const { organization } = useOrganization();
  const orgId = DEMO_MODE ? DEMO_ORG_ID : organization?.id;

  const [expandedClients, setExpandedClients] = useState(new Set<Id<"clients">>());
  const [expandedProjects, setExpandedProjects] = useState(new Set<Id<"projects">>());
  const [expandedEnvs, setExpandedEnvs] = useState(new Set<Id<"environments">>());

  // Restore saved expansion state
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed: Persisted = JSON.parse(raw);
      setExpandedClients(new Set(parsed.clients));
      setExpandedProjects(new Set(parsed.projects));
      setExpandedEnvs(new Set(parsed.envs));
    } catch {}
  }, []);

  // Save expansion state
  useEffect(() => {
    const p: Persisted = {
      clients: Array.from(expandedClients),
      projects: Array.from(expandedProjects),
      envs: Array.from(expandedEnvs)
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
  }, [expandedClients, expandedProjects, expandedEnvs]);

  // Pass orgId to the query so it can filter by tenant
  const clients = useQuery(
    api.clients.list, 
    orgId ? { orgId } : "skip"
  );

  return (
    <Sidebar>
      <SidebarBody className="flex flex-col h-full select-none">
        <div className="px-3 py-3">
          <SidebarHeader />
        </div>

        {/* PRIMARY NAV */}
        {open && <SectionLabel label="Demo" />}
        <div className={cn("flex flex-col mt-2", open ? "gap-1" : "gap-0")}>
          <SidebarLink
            link={{
              label: "Workspace",
              href: "/workspace",
              icon: <IconSettings className="h-5 w-5" />
            }}
          />
        </div>

        {open && <div className="mt-4 border-b border-neutral-200 dark:border-neutral-700" />}

        {/* SCROLLABLE WORKSPACE NAV */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden mt-4 min-h-0">
          {open && <SectionLabel label="Workspaces" className="px-3 mb-2" />}
          <WorkspaceTree
            clients={clients}
            orgId={orgId}
            expandedClients={expandedClients}
            setExpandedClients={setExpandedClients}
            expandedProjects={expandedProjects}
            setExpandedProjects={setExpandedProjects}
            expandedEnvs={expandedEnvs}
            setExpandedEnvs={setExpandedEnvs}
            openIssue={(id) => router.push(`/issues/${id}/thread`)}
          />
        </div>

        <div className={cn("mt-4 flex flex-col", open ? "gap-1" : "gap-0")}>
          {open && <SectionLabel label="Appearance" className="px-1 mb-1" />}
          <ThemeToggle />
        </div>

        {!DEMO_MODE && (
          <>
            <div className={cn("border-t border-neutral-200 dark:border-neutral-700 p-2", open ? "pt-3" : "pt-2")}>
              {open && <SectionLabel label="Organization" className="px-1 mb-2" />}
              {open ? (
                <OrganizationSwitcher
                  hidePersonal
                  afterCreateOrganizationUrl="/copilot"
                  afterSelectOrganizationUrl="/copilot"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      organizationSwitcherTrigger:
                        "w-full justify-start p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                    }
                  }}
                />
              ) : null}
            </div>

            <div className={cn("border-t border-neutral-200 dark:border-neutral-700 p-2", open ? "pt-3" : "pt-2")}>
              {open && <SectionLabel label="Profile" className="px-1 mb-1" />}
              <UserButton
                appearance={{
                  elements: {
                    userButtonBox: "w-full justify-start",
                    userButtonTrigger:
                      "w-full justify-start p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }
                }}
              />
            </div>
          </>
        )}

        {DEMO_MODE && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 p-3">
            <p className="text-xs text-neutral-500">Demo org</p>
            <p className="text-sm font-medium text-neutral-100">{DEMO_ORG_NAME}</p>
          </div>
        )}
      </SidebarBody>
    </Sidebar>
  );
}

function SectionLabel({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      className={`px-2 text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ${className}`}
    >
      {label}
    </div>
  );
}
