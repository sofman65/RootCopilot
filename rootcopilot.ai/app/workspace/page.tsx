"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import {
  IconPlus,
  IconBuilding,
  IconFolder,
  IconServer,
  IconAlertCircle,
  IconLoader,
  IconCheck,
  IconTrash,
  IconSeeding,
} from "@tabler/icons-react";

type EnvName = "PROD" | "UAT" | "SIT" | "PRE-SIT" | "DEV";

export default function WorkspacePage() {
  const { organization } = useOrganization();
  
  // Queries - pass orgId to filter by tenant
  const clients = useQuery(
    api.clients.list, 
    organization ? { orgId: organization.id } : "skip"
  );
  
  // Mutations - Create
  const createClient = useMutation(api.clients.create);
  const createProject = useMutation(api.projects.create);
  const createEnvironment = useMutation(api.environments.create);
  const createIssue = useMutation(api.issues.create);
  const seedWorkspace = useMutation(api.seed.run);
  
  // Mutations - Delete
  const deleteClient = useMutation(api.clients.remove);
  const deleteProject = useMutation(api.projects.remove);
  const deleteEnvironment = useMutation(api.environments.remove);
  const deleteIssue = useMutation(api.issues.remove);
  
  // State
  const [newClientName, setNewClientName] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<Id<"clients"> | null>(null);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [selectedProject, setSelectedProject] = React.useState<Id<"projects"> | null>(null);
  const [newEnvName, setNewEnvName] = React.useState<EnvName>("DEV");
  const [selectedEnv, setSelectedEnv] = React.useState<Id<"environments"> | null>(null);
  const [newIssueTitle, setNewIssueTitle] = React.useState("");
  
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [seedResult, setSeedResult] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Get projects for selected client
  const projects = useQuery(
    api.projects.listByClient,
    selectedClient && organization ? { clientId: selectedClient, orgId: organization.id } : "skip"
  );

  // Get environments for selected project
  const environments = useQuery(
    api.environments.listByProject,
    selectedProject && organization ? { projectId: selectedProject, orgId: organization.id } : "skip"
  );

  // Get issues for selected environment
  const issues = useQuery(
    api.issues.listByEnvironment,
    selectedEnv && organization ? { environmentId: selectedEnv, orgId: organization.id } : "skip"
  );

  // Handlers - Create
  const handleCreateClient = async () => {
    if (!newClientName.trim() || !organization) return;
    await createClient({ name: newClientName.trim(), orgId: organization.id });
    setNewClientName("");
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !selectedClient || !organization) return;
    await createProject({ clientId: selectedClient, name: newProjectName.trim(), orgId: organization.id });
    setNewProjectName("");
  };

  const handleCreateEnvironment = async () => {
    if (!selectedProject || !organization) return;
    await createEnvironment({ projectId: selectedProject, name: newEnvName, orgId: organization.id });
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !selectedEnv || !organization) return;
    await createIssue({ environmentId: selectedEnv, title: newIssueTitle.trim(), orgId: organization.id });
    setNewIssueTitle("");
  };

  // Handlers - Delete
  const handleDeleteClient = async (id: Id<"clients">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organization || !confirm("Delete this client and all its projects, environments, and issues?")) return;
    setDeletingId(id);
    try {
      await deleteClient({ id, orgId: organization.id });
      if (selectedClient === id) {
        setSelectedClient(null);
        setSelectedProject(null);
        setSelectedEnv(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteProject = async (id: Id<"projects">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organization || !confirm("Delete this project and all its environments and issues?")) return;
    setDeletingId(id);
    try {
      await deleteProject({ id, orgId: organization.id });
      if (selectedProject === id) {
        setSelectedProject(null);
        setSelectedEnv(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteEnvironment = async (id: Id<"environments">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organization || !confirm("Delete this environment and all its issues?")) return;
    setDeletingId(id);
    try {
      await deleteEnvironment({ id, orgId: organization.id });
      if (selectedEnv === id) {
        setSelectedEnv(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteIssue = async (id: Id<"issues">) => {
    if (!organization || !confirm("Delete this issue?")) return;
    setDeletingId(id);
    try {
      await deleteIssue({ id, orgId: organization.id });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeed = async () => {
    if (!organization) return;
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedWorkspace({ orgId: organization.id });
      setSeedResult(`Created ${result.seededIssues} sample issues`);
    } catch (err) {
      setSeedResult("Seed completed (or data already exists)");
    } finally {
      setIsSeeding(false);
    }
  };

  if (!organization) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <IconBuilding className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Select an Organization</h2>
          <p className="text-sm text-neutral-500">
            Please select an organization to manage workspaces.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Workspace Management</h1>
          <p className="text-neutral-500">
            Create and manage clients, projects, environments, and issues for{" "}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {organization.name}
            </span>
          </p>
        </div>

        {/* Quick Seed */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-8 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <IconSeeding className="h-5 w-5 text-blue-600" />
                Quick Start with Demo Data
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Create a demo client with projects, environments, and sample issues
              </p>
            </div>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSeeding ? (
                <IconLoader className="h-4 w-4 animate-spin" />
              ) : (
                <IconSeeding className="h-4 w-4" />
              )}
              Seed Demo Data
            </button>
          </div>
          {seedResult && (
            <div className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <IconCheck className="h-4 w-4" />
              {seedResult}
            </div>
          )}
        </div>

        {/* Manual Creation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Clients */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <IconBuilding className="h-5 w-5 text-orange-500" />
              Clients
            </h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client name..."
                onKeyDown={(e) => e.key === "Enter" && handleCreateClient()}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
              />
              <button
                onClick={handleCreateClient}
                disabled={!newClientName.trim()}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition disabled:opacity-50"
              >
                <IconPlus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {clients?.map((client) => (
                <div
                  key={client._id}
                  onClick={() => {
                    setSelectedClient(client._id);
                    setSelectedProject(null);
                    setSelectedEnv(null);
                  }}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                    selectedClient === client._id
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span className="truncate">{client.name}</span>
                  <button
                    onClick={(e) => handleDeleteClient(client._id, e)}
                    disabled={deletingId === client._id}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                  >
                    {deletingId === client._id ? (
                      <IconLoader className="h-3.5 w-3.5 animate-spin text-red-500" />
                    ) : (
                      <IconTrash className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </button>
                </div>
              ))}
              {(!clients || clients.length === 0) && (
                <p className="text-sm text-neutral-400 py-2">No clients yet</p>
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <IconFolder className="h-5 w-5 text-blue-500" />
              Projects
              {selectedClient && (
                <span className="text-xs text-neutral-400 ml-auto">
                  for {clients?.find(c => c._id === selectedClient)?.name}
                </span>
              )}
            </h3>
            
            {selectedClient ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name..."
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                  />
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition disabled:opacity-50"
                  >
                    <IconPlus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {projects?.map((project) => (
                    <div
                      key={project._id}
                      onClick={() => {
                        setSelectedProject(project._id);
                        setSelectedEnv(null);
                      }}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                        selectedProject === project._id
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      }`}
                    >
                      <span className="truncate">{project.name}</span>
                      <button
                        onClick={(e) => handleDeleteProject(project._id, e)}
                        disabled={deletingId === project._id}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                      >
                        {deletingId === project._id ? (
                          <IconLoader className="h-3.5 w-3.5 animate-spin text-red-500" />
                        ) : (
                          <IconTrash className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </button>
                    </div>
                  ))}
                  {(!projects || projects.length === 0) && (
                    <p className="text-sm text-neutral-400 py-2">No projects yet</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-400 py-4">Select a client first</p>
            )}
          </div>

          {/* Environments */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <IconServer className="h-5 w-5 text-green-500" />
              Environments
              {selectedProject && (
                <span className="text-xs text-neutral-400 ml-auto">
                  for {projects?.find(p => p._id === selectedProject)?.name}
                </span>
              )}
            </h3>
            
            {selectedProject ? (
              <>
                <div className="flex gap-2 mb-4">
                  <select
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value as EnvName)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                  >
                    <option value="DEV">DEV</option>
                    <option value="SIT">SIT</option>
                    <option value="PRE-SIT">PRE-SIT</option>
                    <option value="UAT">UAT</option>
                    <option value="PROD">PROD</option>
                  </select>
                  <button
                    onClick={handleCreateEnvironment}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-400 transition"
                  >
                    <IconPlus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {environments?.map((env) => (
                    <div
                      key={env._id}
                      onClick={() => setSelectedEnv(env._id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                        selectedEnv === env._id
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      }`}
                    >
                      <span className="truncate">{env.name}</span>
                      <button
                        onClick={(e) => handleDeleteEnvironment(env._id, e)}
                        disabled={deletingId === env._id}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                      >
                        {deletingId === env._id ? (
                          <IconLoader className="h-3.5 w-3.5 animate-spin text-red-500" />
                        ) : (
                          <IconTrash className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </button>
                    </div>
                  ))}
                  {(!environments || environments.length === 0) && (
                    <p className="text-sm text-neutral-400 py-2">No environments yet</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-400 py-4">Select a project first</p>
            )}
          </div>

          {/* Issues */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <IconAlertCircle className="h-5 w-5 text-red-500" />
              Issues
              {selectedEnv && (
                <span className="text-xs text-neutral-400 ml-auto">
                  for {environments?.find(e => e._id === selectedEnv)?.name}
                </span>
              )}
            </h3>
            
            {selectedEnv ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newIssueTitle}
                    onChange={(e) => setNewIssueTitle(e.target.value)}
                    placeholder="Issue title..."
                    onKeyDown={(e) => e.key === "Enter" && handleCreateIssue()}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                  />
                  <button
                    onClick={handleCreateIssue}
                    disabled={!newIssueTitle.trim()}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition disabled:opacity-50"
                  >
                    <IconPlus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {issues?.map((issue) => (
                    <div
                      key={issue._id}
                      className="group flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-neutral-50 dark:bg-neutral-700/50"
                    >
                      <span className="truncate">{issue.title}</span>
                      <button
                        onClick={() => handleDeleteIssue(issue._id)}
                        disabled={deletingId === issue._id}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                      >
                        {deletingId === issue._id ? (
                          <IconLoader className="h-3.5 w-3.5 animate-spin text-red-500" />
                        ) : (
                          <IconTrash className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </button>
                    </div>
                  ))}
                  {(!issues || issues.length === 0) && (
                    <p className="text-sm text-neutral-400 py-2">No issues yet</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-400 py-4">Select an environment first</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
