"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconFolder } from "@tabler/icons-react";
import type { Id } from "@/convex/_generated/dataModel";

import TreeRow from "./TreeRow";
import EnvironmentList from "./EnvironmentList";
import SkeletonList from "./SkeletonList";
import { toggle } from "./toggle";

type ProjectListProps = {
  clientId: Id<"clients">;
  expandedProjects: Set<Id<"projects">>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<Id<"projects">>>>;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (x: Id<"issues">) => void;
};

export default function ProjectList({
  clientId,
  expandedProjects,
  setExpandedProjects,
  expandedEnvs,
  setExpandedEnvs,
  openIssue
}: ProjectListProps) {
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
