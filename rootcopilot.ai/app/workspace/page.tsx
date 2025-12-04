"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@clerk/nextjs";
import { Id, Doc } from "@/convex/_generated/dataModel";
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
  IconCloudDownload,
  IconPlugConnected,
  IconExternalLink,
  IconX,
  IconEdit,
} from "@tabler/icons-react";
import ImportModal from "@/components/workspace/ImportModal";
import IntegrationSettings from "@/components/workspace/IntegrationSettings";
import { StatusBadge } from "@/components/shared";

import type { EnvName, IssueStatus, IssuePriority } from "@/convex/lib/types";

// Dynamically import RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="h-32 bg-neutral-100 dark:bg-neutral-700 rounded-lg animate-pulse" />,
});

export default function WorkspacePage() {
  const { organization } = useOrganization();
  
  // Queries - pass orgId to filter by tenant
  const clients = useQuery(
    api.clients.list, 
    organization ? { orgId: organization.id } : "skip"
  );
  
  const integrations = useQuery(
    api.integrations.list,
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
  
  // Modal states
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [showIntegrationSettings, setShowIntegrationSettings] = React.useState(false);
  const [showCreateIssueModal, setShowCreateIssueModal] = React.useState(false);
  
  // Issue creation form state
  const [issueDescription, setIssueDescription] = React.useState("");
  const [issueDescriptionHtml, setIssueDescriptionHtml] = React.useState("");
  const [issueStatus, setIssueStatus] = React.useState<IssueStatus>("open");
  const [issuePriority, setIssuePriority] = React.useState<IssuePriority>("medium");
  const [isCreatingIssue, setIsCreatingIssue] = React.useState(false);

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
    setIsCreatingIssue(true);
    try {
      await createIssue({ 
        environmentId: selectedEnv, 
        title: newIssueTitle.trim(),
        description: issueDescription || undefined,
        descriptionHtml: issueDescriptionHtml || undefined,
        status: issueStatus,
        priority: issuePriority,
        orgId: organization.id,
      });
      // Reset form
      setNewIssueTitle("");
      setIssueDescription("");
      setIssueDescriptionHtml("");
      setIssueStatus("open");
      setIssuePriority("medium");
      setShowCreateIssueModal(false);
    } finally {
      setIsCreatingIssue(false);
    }
  };
  
  const handleQuickCreateIssue = async () => {
    if (!newIssueTitle.trim() || !selectedEnv || !organization) return;
    await createIssue({ 
      environmentId: selectedEnv, 
      title: newIssueTitle.trim(),
      status: "open",
      priority: "medium",
      orgId: organization.id,
    });
    setNewIssueTitle("");
  };

  // Handlers - Delete with shared pattern
  const handleDelete = async <T extends Id<"clients"> | Id<"projects"> | Id<"environments"> | Id<"issues">>(
    id: T,
    deleteFn: (args: { id: T; orgId: string }) => Promise<void>,
    confirmMessage: string,
    onSuccess?: () => void
  ) => {
    if (!organization || !confirm(confirmMessage)) return;
    setDeletingId(id);
    try {
      await deleteFn({ id, orgId: organization.id });
      onSuccess?.();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteClient = (id: Id<"clients">, e: React.MouseEvent) => {
    e.stopPropagation();
    handleDelete(id, deleteClient, "Delete this client and all its projects, environments, and issues?", () => {
      if (selectedClient === id) {
        setSelectedClient(null);
        setSelectedProject(null);
        setSelectedEnv(null);
      }
    });
  };

  const handleDeleteProject = (id: Id<"projects">, e: React.MouseEvent) => {
    e.stopPropagation();
    handleDelete(id, deleteProject, "Delete this project and all its environments and issues?", () => {
      if (selectedProject === id) {
        setSelectedProject(null);
        setSelectedEnv(null);
      }
    });
  };

  const handleDeleteEnvironment = (id: Id<"environments">, e: React.MouseEvent) => {
    e.stopPropagation();
    handleDelete(id, deleteEnvironment, "Delete this environment and all its issues?", () => {
      if (selectedEnv === id) {
        setSelectedEnv(null);
      }
    });
  };

  const handleDeleteIssue = (id: Id<"issues">) => {
    handleDelete(id, deleteIssue, "Delete this issue?");
  };

  const handleSeed = async () => {
    if (!organization) return;
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedWorkspace({ orgId: organization.id });
      setSeedResult(`Created ${result.seededIssues} sample issues`);
    } catch {
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

  // Shared delete button component
  const DeleteButton = ({ onClick, isDeleting }: { onClick: (e: React.MouseEvent) => void; isDeleting: boolean }) => (
    <button
      onClick={onClick}
      disabled={isDeleting}
      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
    >
      {isDeleting ? (
        <IconLoader className="h-3.5 w-3.5 animate-spin text-red-500" />
      ) : (
        <IconTrash className="h-3.5 w-3.5 text-red-500" />
      )}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Workspace Management</h1>
            <p className="text-neutral-500">
              Create and manage clients, projects, environments, and issues for{" "}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {organization.name}
              </span>
            </p>
          </div>
          
          {/* Integration Button */}
          <button
            onClick={() => setShowIntegrationSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
          >
            <IconPlugConnected className="h-4 w-4" />
            Integrations
            {integrations && integrations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 rounded-full">
                {integrations.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Quick Seed */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <IconSeeding className="h-5 w-5 text-blue-600" />
                  Quick Start
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Create demo data instantly
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
                Seed
              </button>
            </div>
            {seedResult && (
              <div className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <IconCheck className="h-4 w-4" />
                {seedResult}
              </div>
            )}
          </div>

          {/* Import from External */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <IconCloudDownload className="h-5 w-5 text-green-600" />
                  Import Issues
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  From Jira, Linear, or Azure
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(true)}
                disabled={!selectedProject || !selectedEnv}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition disabled:opacity-50 flex items-center gap-2"
              >
                <IconCloudDownload className="h-4 w-4" />
                Import
              </button>
            </div>
            {!selectedProject && (
              <p className="mt-3 text-xs text-neutral-500">
                Select a project and environment first
              </p>
            )}
          </div>
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
              {clients?.map((client: Doc<"clients">) => (
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
                  <DeleteButton onClick={(e) => handleDeleteClient(client._id, e)} isDeleting={deletingId === client._id} />
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
                  for {clients?.find((c: Doc<"clients">) => c._id === selectedClient)?.name}
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
                  {projects?.map((project: Doc<"projects">) => (
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
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{project.name}</span>
                        {project.externalSource && (
                          <span className="text-xs px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                            {project.externalSource}
                          </span>
                        )}
                      </div>
                      <DeleteButton onClick={(e) => handleDeleteProject(project._id, e)} isDeleting={deletingId === project._id} />
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
                  for {projects?.find((p: Doc<"projects">) => p._id === selectedProject)?.name}
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
                  {environments?.map((env: Doc<"environments">) => (
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
                      <DeleteButton onClick={(e) => handleDeleteEnvironment(env._id, e)} isDeleting={deletingId === env._id} />
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <IconAlertCircle className="h-5 w-5 text-red-500" />
                Issues
                {selectedEnv && (
                  <span className="text-xs text-neutral-400 ml-2">
                    for {environments?.find((e: Doc<"environments">) => e._id === selectedEnv)?.name}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {selectedEnv && (
                  <button
                    onClick={() => setShowCreateIssueModal(true)}
                    className="text-xs flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition"
                  >
                    <IconEdit className="h-3 w-3" />
                    Detailed
                  </button>
                )}
                {selectedEnv && integrations && integrations.length > 0 && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="text-xs flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition"
                  >
                    <IconCloudDownload className="h-3 w-3" />
                    Import
                  </button>
                )}
              </div>
            </div>
            
            {selectedEnv ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newIssueTitle}
                    onChange={(e) => setNewIssueTitle(e.target.value)}
                    placeholder="Quick issue title..."
                    onKeyDown={(e) => e.key === "Enter" && handleQuickCreateIssue()}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                  />
                  <button
                    onClick={handleQuickCreateIssue}
                    disabled={!newIssueTitle.trim()}
                    title="Quick add (without description)"
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition disabled:opacity-50"
                  >
                    <IconPlus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {issues?.map((issue: Doc<"issues">) => (
                    <div
                      key={issue._id}
                      className="group flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-neutral-50 dark:bg-neutral-700/50"
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        {issue.externalKey && (
                          <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                            {issue.externalKey}
                          </span>
                        )}
                        <span className="truncate">{issue.title}</span>
                        {issue.status && issue.status !== "unknown" && (
                          <StatusBadge status={issue.status} />
                        )}
                        {issue.externalUrl && (
                          <a
                            href={issue.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-blue-500"
                          >
                            <IconExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <DeleteButton onClick={() => handleDeleteIssue(issue._id)} isDeleting={deletingId === issue._id} />
                    </div>
                  ))}
                  {(!issues || issues.length === 0) && (
                    <div className="text-center py-4">
                      <p className="text-sm text-neutral-400 mb-2">No issues yet</p>
                      {integrations && integrations.length > 0 && (
                        <button
                          onClick={() => setShowImportModal(true)}
                          className="text-xs text-blue-600 hover:text-blue-500"
                        >
                          Import from Jira, Linear, or Azure →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-400 py-4">Select an environment first</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedProject && selectedEnv && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          projectId={selectedProject}
          environmentId={selectedEnv}
          orgId={organization.id}
        />
      )}

      <IntegrationSettings
        isOpen={showIntegrationSettings}
        onClose={() => setShowIntegrationSettings(false)}
        orgId={organization.id}
      />

      {/* Create Issue Modal with Rich Text Editor */}
      {showCreateIssueModal && selectedEnv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <IconAlertCircle className="h-5 w-5 text-red-500" />
                Create New Issue
              </h2>
              <button
                onClick={() => setShowCreateIssueModal(false)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="Brief description of the issue..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={issueStatus}
                    onChange={(e) => setIssueStatus(e.target.value as IssueStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value as IssuePriority)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                  >
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>

              {/* Description with Rich Text Editor */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <p className="text-xs text-neutral-500 mb-2">
                  Include logs, error messages, steps to reproduce, and any relevant context.
                </p>
                <RichTextEditor
                  content={issueDescription}
                  onChange={(json, html) => {
                    setIssueDescription(json);
                    setIssueDescriptionHtml(html);
                  }}
                  placeholder="Describe the issue in detail..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <button
                onClick={() => setShowCreateIssueModal(false)}
                className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIssue}
                disabled={!newIssueTitle.trim() || isCreatingIssue}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition disabled:opacity-50"
              >
                {isCreatingIssue ? (
                  <IconLoader className="h-4 w-4 animate-spin" />
                ) : (
                  <IconPlus className="h-4 w-4" />
                )}
                Create Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
