"use client";

import { IconFolders } from "@tabler/icons-react";
import { type Client, type EntityId } from "@/lib/rootcopilot-api";

import ProjectList from "./ProjectList";
import TreeRow from "./TreeRow";
import SkeletonList from "./SkeletonList";

type WorkspaceTreeProps = {
  clients: Client[] | undefined;
  expandedClients: Set<EntityId>;
  setExpandedClients: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  expandedProjects: Set<EntityId>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  expandedEnvs: Set<EntityId>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  openIssue: (x: EntityId) => void;
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
