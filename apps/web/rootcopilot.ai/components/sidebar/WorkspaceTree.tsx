"use client";

import { IconFolders, IconFolder, IconLayersSubtract, IconList } from "@tabler/icons-react";
import { type WorkspaceTreeResponse, type EntityId } from "@/lib/rootcopilot-api";
import { SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import TreeRow from "./TreeRow";
import SkeletonList from "./SkeletonList";
import { toggle } from "./toggle";

type Props = {
  tree: WorkspaceTreeResponse | undefined;
  expandedClients: Set<EntityId>;
  setExpandedClients: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  expandedProjects: Set<EntityId>;
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  expandedEnvs: Set<EntityId>;
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<EntityId>>>;
  openTicket: (ticketId: EntityId) => void;
};

export default function WorkspaceTree({
  tree,
  expandedClients,
  setExpandedClients,
  expandedProjects,
  setExpandedProjects,
  expandedEnvs,
  setExpandedEnvs,
  openTicket,
}: Props) {
  const { open } = useSidebar();

  if (tree === undefined) return <SkeletonList count={5} />;

  return (
    <div className="flex flex-col gap-1 pb-4">
      {tree.clients.map((client) => (
        <div key={client.id}>
          <TreeRow
            label={client.name}
            icon={<IconFolders className="h-5 w-5" />}
            expanded={expandedClients.has(client.id)}
            onToggle={() => toggle(expandedClients, setExpandedClients, client.id)}
          />

          {expandedClients.has(client.id) && (
            <div className={cn(open ? "ml-3" : "ml-0")}>
              {client.projects.map((project) => (
                <div key={project.id}>
                  <TreeRow
                    label={project.name}
                    icon={<IconFolder className="h-5 w-5" />}
                    expanded={expandedProjects.has(project.id)}
                    onToggle={() => toggle(expandedProjects, setExpandedProjects, project.id)}
                  />

                  {expandedProjects.has(project.id) && (
                    <div className={cn(open ? "ml-3" : "ml-0")}>
                      {project.environments.map((env) => (
                        <div key={env.id}>
                          <TreeRow
                            label={env.name}
                            icon={<IconLayersSubtract className="h-5 w-5" />}
                            expanded={expandedEnvs.has(env.id)}
                            onToggle={() => toggle(expandedEnvs, setExpandedEnvs, env.id)}
                          />

                          {expandedEnvs.has(env.id) && (
                            <div className={cn(open ? "ml-3" : "ml-0")}>
                              {env.tickets.map((ticket) => (
                                <SidebarLink
                                  key={ticket.id}
                                  link={{
                                    label: ticket.title,
                                    href: "#",
                                    icon: <IconList className="h-5 w-5" />,
                                  }}
                                  onClick={() => openTicket(ticket.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
