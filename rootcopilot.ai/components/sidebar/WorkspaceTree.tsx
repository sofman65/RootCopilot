"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconFolders } from "@tabler/icons-react";
import type { Id } from "@/convex/_generated/dataModel";

import ProjectList from "./ProjectList";
import TreeRow from "./TreeRow";
import SkeletonList from "./SkeletonList";

type WorkspaceTreeProps = {
  clients: ReturnType<typeof useQuery<typeof api.clients.list>>;
  expandedClients: Set<Id<"clients">>;
  setExpandedClients: React.Dispatch<React.SetStateAction<Set<Id<"clients">>>>;
  expandedProjects: Set<Id<"projects">>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<Id<"projects">>>>;
  expandedEnvs: Set<Id<"environments">>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<"environments">>>>;
  openIssue: (x: Id<"issues">) => void;
};

export default function WorkspaceTree({
  clients,
  expandedClients,
  setExpandedClients,
  expandedProjects,
  setExpandedProjects,
  expandedEnvs,
  setExpandedEnvs,
  openIssue
}: WorkspaceTreeProps) {
  const { open } = useSidebar();

  if (clients === undefined) return <SkeletonList count={5} />;

  return (
    <div className="flex flex-col gap-1 pb-4">
      {clients.map((client) => (
        <div key={client._id}>
          <TreeRow
            label={client.name}
            icon={<IconFolders className="h-5 w-5" />}
            expanded={expandedClients.has(client._id)}
            onToggle={() => {
              const next = new Set(expandedClients);
              next.has(client._id) ? next.delete(client._id) : next.add(client._id);
              setExpandedClients(next);
            }}
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
