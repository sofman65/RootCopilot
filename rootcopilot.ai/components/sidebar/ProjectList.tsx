"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconFolder } from "@tabler/icons-react";
import type { Id } from "@/convex/_generated/dataModel";

import TreeRow from "./TreeRow";
import EnvironmentList from "./EnvironmentList";
import SkeletonList from "./SkeletonList";
import { toggle } from "./toggle";
import { useSidebar } from "@/components/ui/sidebar";

type ProjectListProps = {
  clientId: Id<"clients">;
  orgId?: string; // Pass from parent
  expandedProjects: Set<Id<"projects">>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<Id<"projects">>>>;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (x: Id<"issues">) => void;
};

export default function ProjectList({
  clientId,
  orgId,
  expandedProjects,
  setExpandedProjects,
  expandedEnvs,
  setExpandedEnvs,
  openIssue
}: ProjectListProps) {
  const { open } = useSidebar();
  const projects = useQuery(
    api.projects.listByClient, 
    orgId ? { clientId, orgId } : "skip"
  );
  if (projects === undefined) return <SkeletonList count={3} indent />;

  return (
    <div className={open ? "ml-3" : "ml-0"}>
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
              orgId={orgId}
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
