"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";

import {
  IconDashboard,
  IconSettings,
  IconFolders,
  IconFolder,
  IconLayersSubtract,
  IconList,
  IconChevronRight
} from "@tabler/icons-react";

import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

type Issue = Doc<"issues">;

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

/* ──────────────────────────────────────────────────────────────────────────────
   LOGO (ChatGPT-style)
   ────────────────────────────────────────────────────────────────────────────── */

function SidebarHeader() {
  const { open } = useSidebar();

  return open ? <LogoExpanded /> : <LogoCollapsed />;
}

function LogoExpanded() {
  return (
    <Link href="/" className="flex items-center gap-2 px-2 text-neutral-900 dark:text-neutral-100">
      <div className="h-6 w-6 rounded-md bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-sm"
      >
        rootcopilot.ai
      </motion.span>
    </Link>
  );
}

function LogoCollapsed() {
  return (
    <Link href="/" className="flex items-center justify-center px-1 text-neutral-900 dark:text-neutral-100">
      <div className="h-6 w-6 rounded-md bg-black dark:bg-white" />
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   WORKSPACE TREE (Clients > Projects > Envs > Issues)
   ────────────────────────────────────────────────────────────────────────────── */

function WorkspaceTree({
  clients,
  expandedClients,
  setExpandedClients,
  expandedProjects,
  setExpandedProjects,
  expandedEnvs,
  setExpandedEnvs,
  openIssue
}: {
  clients: ReturnType<typeof useQuery<typeof api.clients.list>>;
  expandedClients: Set<Id<"clients">>;
  setExpandedClients: React.Dispatch<React.SetStateAction<Set<Id<"clients">>>>;
  expandedProjects: Set<Id<"projects">>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<Id<"projects">>>>;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (x: Id<"issues">) => void;
}) {
  const { open } = useSidebar();

  if (!open) {
    // Collapsed mode: show only icons to match ChatGPT
    return (
      <div className="flex flex-col gap-4 items-center text-neutral-500 dark:text-neutral-400 pt-2">
        {/* Looks empty in collapsed mode, correct ChatGPT behavior */}
      </div>
    );
  }

  if (clients === undefined) return <SkeletonList count={5} />;

  return (
    <div className="flex flex-col gap-1 pb-4">
      {clients.map((client) => (
        <div key={client._id}>
          <TreeRow
            label={client.name}
            icon={<IconFolders className="h-5 w-5" />}
            expanded={expandedClients.has(client._id)}
            onToggle={() =>
              toggle(expandedClients, setExpandedClients, client._id)
            }
          />

          {expandedClients.has(client._id) && (
            <ProjectList
              clientId={client._id}
              expandedProjects={expandedProjects}
              setExpandedProjects={setExpandedProjects}
              expandedEnvs={expandedEnvs}
              setExpandedEnvs={setExpandedEnvs}
              openIssue={openIssue}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── UTILS ─────────────── */

function toggle<T>(set: Set<T>, setter: (v: Set<T>) => void, val: T) {
  const next = new Set(set);
  next.has(val) ? next.delete(val) : next.add(val);
  setter(next);
}

/* ─────────────── RECURSIVE TREE COMPONENTS ─────────────── */

function TreeRow({
  label,
  icon,
  expanded,
  onToggle
}: {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-sm font-medium"
    >
      {icon}
      <span className="flex-1 text-left truncate">{label}</span>
      <IconChevronRight
        className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
      />
    </button>
  );
}

function ProjectList({ clientId, expandedProjects, setExpandedProjects, expandedEnvs, setExpandedEnvs, openIssue }:
{
  clientId: Id<"clients">;
  expandedProjects: Set<Id<"projects">>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<Id<"projects">>>>;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (x: Id<"issues">) => void;
}) {
  const projects = useQuery(api.projects.listByClient, { clientId });
  if (projects === undefined) return <SkeletonList count={3} indent />;

  return (
    <div className="ml-3">
      {projects.map((p) => (
        <div key={p._id}>
          <TreeRow
            label={p.name}
            icon={<IconFolder className="h-5 w-5" />}
            expanded={expandedProjects.has(p._id)}
            onToggle={() => toggle(expandedProjects, setExpandedProjects, p._id)}
          />
          {expandedProjects.has(p._id) && (
            <EnvironmentList
              projectId={p._id}
              expandedEnvs={expandedEnvs}
              setExpandedEnvs={setExpandedEnvs}
              openIssue={openIssue}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function EnvironmentList({ projectId, expandedEnvs, setExpandedEnvs, openIssue }:
{
  projectId: Id<"projects">;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (x: Id<"issues">) => void;
}) {
  const envs = useQuery(api.environments.listByProject, { projectId });
  if (envs === undefined) return <SkeletonList count={4} indent />;

  return (
    <div className="ml-3">
      {envs.map((env) => (
        <div key={env._id}>
          <TreeRow
            label={env.name}
            icon={<IconLayersSubtract className="h-5 w-5" />}
            expanded={expandedEnvs.has(env._id)}
            onToggle={() => toggle(expandedEnvs, setExpandedEnvs, env._id)}
          />
          {expandedEnvs.has(env._id) && (
            <IssueList environmentId={env._id} openIssue={openIssue} />
          )}
        </div>
      ))}
    </div>
  );
}

function IssueList({ environmentId, openIssue }:
{
  environmentId: Id<"environments">;
  openIssue: (x: Id<"issues">) => void;
}) {
  const issues = useQuery(api.issues.listByEnvironment, { environmentId });
  if (issues === undefined) return <SkeletonList count={5} indent />;

  return (
    <div className="ml-3">
      {issues.map((issue) => (
        <SidebarLink
          key={issue._id}
          link={{
            label: `#${issue._id.slice(-6)} ${issue.title}`,
            href: "#",
            icon: <IconList className="h-5 w-5" />
          }}
          onClick={() => openIssue(issue._id)}
        />
      ))}
    </div>
  );
}

/* ─────────────── SKELETON LOADER ─────────────── */

function SkeletonList({ count, indent = false }: { count: number; indent?: boolean }) {
  return (
    <ul className={indent ? "ml-3" : ""}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="my-1">
          <div className="h-6 w-full rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}
