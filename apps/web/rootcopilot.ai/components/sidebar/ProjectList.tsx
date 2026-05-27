"use client";

import * as React from "react";
import { IconFolder } from "@tabler/icons-react";
import { type EntityId, type Project, listProjects } from "@/lib/rootcopilot-api";

import TreeRow from "./TreeRow";
import EnvironmentList from "./EnvironmentList";
import SkeletonList from "./SkeletonList";
import { toggle } from "./toggle";
import { useSidebar } from "@/components/ui/sidebar";

type ProjectListProps = {
  clientId: EntityId;
  expandedProjects: Set<EntityId>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  expandedEnvs: Set<EntityId>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  openIssue: (x: EntityId) => void;
};

export default function ProjectList({
  clientId,
  expandedProjects,
  setExpandedProjects,
  expandedEnvs,
  setExpandedEnvs,
  openIssue
}: ProjectListProps) {
  const { open } = useSidebar();
  const [projects, setProjects] = React.useState<Project[] | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;

    listProjects(clientId)
      .then((items) => {
        if (!cancelled) setProjects(items);
      })
      .catch((error) => {
        console.error("Failed to load projects:", error);
        if (!cancelled) setProjects([]);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

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
