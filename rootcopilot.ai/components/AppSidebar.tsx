"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { IconDashboard, IconSettings } from "@tabler/icons-react";

import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";

import type { Id } from "@/convex/_generated/dataModel";
import SidebarHeader from "@/components/sidebar/SidebarHeader";
import WorkspaceTree from "@/components/sidebar/WorkspaceTree";

const STORAGE_KEY = "rcp.sidebar.expanded.v1";

type Persisted = {
  clients: Id<"clients">[];
  projects: Id<"projects">[];
  envs: Id<"environments">[];
};

export default function AppSidebar() {
  const router = useRouter();

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

  const clients = useQuery(api.clients.list);

  return (
    <Sidebar>
      <SidebarBody className="flex flex-col h-full select-none">
        <div className="px-3 py-3">
          <SidebarHeader />
        </div>

        {/* MAIN NAV */}
        <div className="flex flex-col gap-1 mt-3">
          <SidebarLink
            link={{
              label: "Dashboard",
              href: "/dashboard",
              icon: <IconDashboard className="h-5 w-5" />
            }}
          />
          <SidebarLink
            link={{
              label: "Settings",
              href: "/settings",
              icon: <IconSettings className="h-5 w-5" />
            }}
          />
        </div>

        {/* SCROLLABLE WORKSPACE NAV */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden mt-6 min-h-0">
          <WorkspaceTree
            clients={clients}
            expandedClients={expandedClients}
            setExpandedClients={setExpandedClients}
            expandedProjects={expandedProjects}
            setExpandedProjects={setExpandedProjects}
            expandedEnvs={expandedEnvs}
            setExpandedEnvs={setExpandedEnvs}
            openIssue={(id) => router.push(`/issues/${id}/thread`)}
          />
        </div>

        {/* USER BUTTON AT BOTTOM (REAL CHATGPT STYLE) */}
        <div className="mt-auto border-t border-neutral-200 dark:border-neutral-700 p-2">
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
      </SidebarBody>
    </Sidebar>
  );
}
