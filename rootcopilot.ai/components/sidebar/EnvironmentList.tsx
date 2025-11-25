"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconLayersSubtract } from "@tabler/icons-react";
import type { Id } from "@/convex/_generated/dataModel";

import TreeRow from "./TreeRow";
import IssueList from "./IssueList";
import SkeletonList from "./SkeletonList";
import { toggle } from "./toggle";
import { useSidebar } from "@/components/ui/sidebar";

type EnvironmentListProps = {
  projectId: Id<"projects">;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (x: Id<"issues">) => void;
};

export default function EnvironmentList({
  projectId,
  expandedEnvs,
  setExpandedEnvs,
  openIssue
}: EnvironmentListProps) {
  const { open } = useSidebar();
  const envs = useQuery(api.environments.listByProject, { projectId });
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
