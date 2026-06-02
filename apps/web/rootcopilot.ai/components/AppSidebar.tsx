"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconSearch,
  IconChartBar,
  IconRobot,
  IconBook2,
  IconPlugConnected,
  IconUserCircle,
  IconTicket,
  IconRefresh,
  IconWifiOff,
} from "@tabler/icons-react";

import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { type EntityId, type WorkspaceTreeResponse, getWorkspaceTree } from "@/lib/rootcopilot-api";

import SidebarHeader from "@/components/sidebar/SidebarHeader";
import WorkspaceTree from "@/components/sidebar/WorkspaceTree";
import ThemeToggle from "@/components/ThemeToggle";

const STORAGE_KEY = "rcp.sidebar.expanded.v2";

type Persisted = {
  clients: EntityId[];
  projects: EntityId[];
  envs: EntityId[];
};

export default function AppSidebar() {
  const router = useRouter();
  const { open } = useSidebar();

  const [tree, setTree] = useState<WorkspaceTreeResponse | undefined>(undefined);
  const [fetchError, setFetchError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [expandedClients, setExpandedClients] = useState(new Set<EntityId>());
  const [expandedProjects, setExpandedProjects] = useState(new Set<EntityId>());
  const [expandedEnvs, setExpandedEnvs] = useState(new Set<EntityId>());

  const retry = useCallback(() => {
    setTree(undefined);
    setFetchError(false);
    setRetryKey((k) => k + 1);
  }, []);

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
      envs: Array.from(expandedEnvs),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
  }, [expandedClients, expandedProjects, expandedEnvs]);

  // Load workspace tree — retryKey forces a fresh fetch on retry
  useEffect(() => {
    let cancelled = false;

    getWorkspaceTree()
      .then((data) => {
        if (!cancelled) {
          setTree(data);
          setFetchError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTree({ clients: [] });
          setFetchError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  return (
    <Sidebar>
      <SidebarBody className="flex flex-col h-full select-none">
        <div className="px-3 py-3">
          <SidebarHeader />
        </div>

        {/* PRIMARY NAV */}
        {open && <SectionLabel label="Tools" />}
        <div className={cn("flex flex-col mt-2", open ? "gap-1" : "gap-0")}>
          <SidebarLink
            link={{
              label: "Search Issues",
              href: "/search",
              icon: <IconSearch className="h-5 w-5" />,
            }}
          />
          <SidebarLink
            link={{
              label: "Tickets",
              href: "/tickets",
              icon: <IconTicket className="h-5 w-5" />,
            }}
          />
          <SidebarLink
            link={{
              label: "Insights",
              href: "/insights",
              icon: <IconChartBar className="h-5 w-5" />,
            }}
          />
          <SidebarLink
            link={{
              label: "Copilot",
              href: "/copilot",
              icon: <IconRobot className="h-5 w-5" />,
            }}
          />
        </div>

        {open && <div className="mt-4 border-b border-neutral-200 dark:border-neutral-700" />}

        {/* SCROLLABLE WORKSPACE NAV */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden mt-4 min-h-0">
          {open && <SectionLabel label="Workspaces" className="px-3 mb-2" />}
          {fetchError ? (
            <WorkspaceFetchError open={open} onRetry={retry} />
          ) : (
            <WorkspaceTree
              tree={tree}
              expandedClients={expandedClients}
              setExpandedClients={setExpandedClients}
              expandedProjects={expandedProjects}
              setExpandedProjects={setExpandedProjects}
              expandedEnvs={expandedEnvs}
              setExpandedEnvs={setExpandedEnvs}
              openTicket={(id) => router.push(`/tickets/${id}`)}
            />
          )}
        </div>

        {/* SECONDARY NAV */}
        {open && <div className="mt-4 border-t border-neutral-200 dark:border-neutral-700" />}
        <div className={cn("pt-4 flex flex-col", open ? "gap-1" : "gap-0")}>
          {open && <SectionLabel label="System" className="px-1 mb-2" />}
          <SidebarLink
            link={{
              label: "Documentation",
              href: "/docs",
              icon: <IconBook2 className="h-5 w-5" />,
            }}
          />
          <SidebarLink
            link={{
              label: "Integrations",
              href: "/integrations",
              icon: <IconPlugConnected className="h-5 w-5" />,
            }}
          />
        </div>

        <div className={cn("mt-4 flex flex-col", open ? "gap-1" : "gap-0")}>
          {open && <SectionLabel label="Appearance" className="px-1 mb-1" />}
          <ThemeToggle />
        </div>

        <div className={cn("mt-auto border-t border-neutral-200 dark:border-neutral-700 p-2", open ? "pt-3" : "pt-2")}>
          <div className="h-4" aria-hidden />
          {open && <SectionLabel label="Profile" className="px-1 mb-1" />}
          <SidebarLink
            link={{
              label: "Local Session",
              href: "/",
              icon: <IconUserCircle className="h-5 w-5" />,
            }}
          />
        </div>
      </SidebarBody>
    </Sidebar>
  );
}

function SectionLabel({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`px-2 text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ${className}`}>
      {label}
    </div>
  );
}

function WorkspaceFetchError({ open, onRetry }: { open: boolean; onRetry: () => void }) {
  if (!open) {
    return (
      <button
        onClick={onRetry}
        title="Workspace unreachable — click to retry"
        className="flex items-center justify-center w-full py-2 text-amber-600 dark:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition"
      >
        <IconWifiOff className="h-5 w-5" />
      </button>
    );
  }
  return (
    <div className="mx-2 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 text-xs">
      <div className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
        <IconWifiOff className="h-3.5 w-3.5" />
        API unreachable
      </div>
      <p className="mt-1 text-amber-700/80 dark:text-amber-300/80 leading-snug">
        The backend at port 8000 is not responding. Start the API and retry.
      </p>
      <button
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 transition"
      >
        <IconRefresh className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}
