"use client";

import * as React from "react";
import { IconLayersSubtract } from "@tabler/icons-react";
import { type EntityId, type Environment, listEnvironments } from "@/lib/rootcopilot-api";

import TreeRow from "./TreeRow";
import IssueList from "./IssueList";
import SkeletonList from "./SkeletonList";
import { toggle } from "./toggle";
import { useSidebar } from "@/components/ui/sidebar";

type EnvironmentListProps = {
  projectId: EntityId;
  expandedEnvs: Set<EntityId>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  openIssue: (x: EntityId) => void;
};

export default function EnvironmentList({
  projectId,
  expandedEnvs,
  setExpandedEnvs,
  openIssue
}: EnvironmentListProps) {
  const { open } = useSidebar();
  const [envs, setEnvs] = React.useState<Environment[] | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;

    listEnvironments(projectId)
      .then((items) => {
        if (!cancelled) setEnvs(items);
      })
      .catch((error) => {
        console.error("Failed to load environments:", error);
        if (!cancelled) setEnvs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (envs === undefined) return <SkeletonList count={4} indent />;

  return (
    <div className={open ? "ml-3" : "ml-0"}>
      {envs.map((env) => (
        <div key={env._id}>
          <TreeRow
            label={env.name}
            icon={<IconLayersSubtract className="h-5 w-5" />}
            expanded={expandedEnvs.has(env._id)}
            onToggle={() => toggle(expandedEnvs, setExpandedEnvs, env._id)}
          />
          {expandedEnvs.has(env._id) && <IssueList environmentId={env._id} openIssue={openIssue} />}
        </div>
      ))}
    </div>
  );
}
