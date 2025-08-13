"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import {
  IconDashboard,
  IconFolder,
  IconFolders,
  IconLayersSubtract,
  IconList,
  IconSettings,
  IconChevronRight,
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


  // expansion state
  const [expandedClients, setExpandedClients] = useState<Set<Id<"clients">>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<Id<"projects">>>(new Set());
  const [expandedEnvs, setExpandedEnvs] = useState<Set<Id<"environments">>>(new Set());

  // load persisted expansion
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p: Persisted = JSON.parse(raw);
        setExpandedClients(new Set(p.clients));
        setExpandedProjects(new Set(p.projects));
        setExpandedEnvs(new Set(p.envs));
      }
    } catch {}
  }, []);

  // persist on change
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

  const clients = useQuery(api.clients.list);

  return (
    <Sidebar>
      <SidebarBody className="justify-between h-full">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto" aria-label="Workspace navigation">
          <BrandHeader />

          <div className="mt-3 flex flex-col gap-1">
            <SidebarLink link={{ label: "Dashboard", href: "/dashboard", icon: <IconDashboard className="h-5 w-5" /> }} />
            <SidebarLink link={{ label: "Settings", href: "/settings", icon: <IconSettings className="h-5 w-5" /> }} />
          </div>

          <div className="mt-4 flex flex-col gap-1">
            {clients === undefined && <SkeletonList count={5} />}
            {clients?.map((c) => (
              <div key={c._id}>
                <SidebarRow
                  label={c.name}
                  icon={<IconFolders className="h-5 w-5" />}
                  expanded={expandedClients.has(c._id)}
                  onToggle={() =>
                    setExpandedClients((s) => {
                      const n = new Set(s);
                      if (n.has(c._id)) {
                        n.delete(c._id);
                      } else {
                        n.add(c._id);
                      }
                      return n;
                    })
                  }
                />
                {expandedClients.has(c._id) && (
                  <ProjectList
                    clientId={c._id}
                    expandedProjects={expandedProjects}
                    setExpandedProjects={setExpandedProjects}
                    expandedEnvs={expandedEnvs}
                    setExpandedEnvs={setExpandedEnvs}
                    openIssue={(id) => router.push(`/issues/${id}/thread`)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-1 py-2">
          <UserButton appearance={{ elements: { userButtonBox: "justify-start" } }} />
        </div>
      </SidebarBody>
    </Sidebar>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Branding
   ────────────────────────────────────────────────────────────────────────────── */

function BrandHeader() {
  const { open } = useSidebar();
  return open ? <Logo /> : <LogoIcon />;
}

function Logo() {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium whitespace-pre">
        rootcopilot.ai
      </motion.span>
    </Link> 
  );
}

function LogoIcon() {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Nodes
   ────────────────────────────────────────────────────────────────────────────── */





function IssueRow({ issue, openIssue }: { issue: Issue; openIssue: (id: Id<"issues">) => void }) {
  return (
    <SidebarLink
      link={{
        label: `#${issue._id.slice(-6)} ${issue.title}`,
        href: "#",
        icon: <IconList className="h-5 w-5" />,
      }}
      onClick={() => openIssue(issue._id)}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Skeleton loader
   ────────────────────────────────────────────────────────────────────────────── */

function SkeletonList({ count, indent = false }: { count: number; indent?: boolean }) {
  return (
    <ul role="none" className={indent ? "ml-1" : ""}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="my-1">
          <div className="h-7 w-full rounded-[calc(var(--rcp-radius)-0.5rem)] bg-[hsl(var(--rcp-muted))]/40 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

// Lightweight row with a chevron toggle using SidebarLink
function SidebarRow({
  label,
  icon,
  expanded,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center">
      <button
        aria-label={expanded ? "Collapse" : "Expand"}
        onClick={onToggle}
        className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-[hsl(var(--rcp-muted))]"
      >
        <IconChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : "rotate-0"}`} />
      </button>
      <SidebarLink link={{ label, href: "#", icon }} onClick={onToggle} />
    </div>
  );
}

function ProjectList({
  clientId,
  expandedProjects,
  setExpandedProjects,
  expandedEnvs,
  setExpandedEnvs,
  openIssue,
}: {
  clientId: Id<"clients">;
  expandedProjects: Set<Id<"projects">>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<Id<"projects">>>>;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (id: Id<"issues">) => void;
}) {
  const projects = useQuery(api.projects.listByClient, { clientId });
  if (projects === undefined) return <SkeletonList count={3} indent />;
  return (
    <div className="ml-3">
      {projects.map((p) => (
        <div key={p._id}>
          <SidebarRow
            label={p.name}
            icon={<IconFolder className="h-5 w-5" />}
            expanded={expandedProjects.has(p._id)}
            onToggle={() =>
              setExpandedProjects((s) => {
                const n = new Set(s);
                if (n.has(p._id)) {
                  n.delete(p._id);
                } else {
                  n.add(p._id);
                }
                return n;
              })
            }
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

function EnvironmentList({
  projectId,
  expandedEnvs,
  setExpandedEnvs,
  openIssue,
}: {
  projectId: Id<"projects">;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (id: Id<"issues">) => void;
}) {
  const envs = useQuery(api.environments.listByProject, { projectId });
  if (envs === undefined) return <SkeletonList count={4} indent />;
  return (
    <div className="ml-3">
      {envs.map((e) => (
        <div key={e._id}>
          <SidebarRow
            label={e.name}
            icon={<IconLayersSubtract className="h-5 w-5" />}
            expanded={expandedEnvs.has(e._id)}
            onToggle={() =>
              setExpandedEnvs((s) => {
                const n = new Set(s);
                if (n.has(e._id)) {
                  n.delete(e._id);
                } else {
                  n.add(e._id);
                }
                return n;
              })
            }
          />
          {expandedEnvs.has(e._id) && <IssueList environmentId={e._id} openIssue={openIssue} />}
        </div>
      ))}
    </div>
  );
}

function IssueList({ environmentId, openIssue }: { environmentId: Id<"environments">; openIssue: (id: Id<"issues">) => void }) {
  const issues = useQuery(api.issues.listByEnvironment, { environmentId });
  if (issues === undefined) return <SkeletonList count={5} indent />;
  return (
    <div className="ml-3">
      {issues.map((i) => (
        <IssueRow key={i._id} issue={i} openIssue={openIssue} />)
      )}
    </div>
  );
}
