"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  IconX,
  IconLoader,
  IconCheck,
  IconAlertCircle,
  IconCloudDownload,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
} from "@tabler/icons-react";

type Provider = "jira" | "linear" | "azure";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: Id<"projects">;
  environmentId: Id<"environments">;
  orgId: string;
}

type Step = "select-integration" | "select-project" | "preview" | "importing" | "complete";

export default function ImportModal({
  isOpen,
  onClose,
  projectId,
  environmentId,
  orgId,
}: ImportModalProps) {
  const [step, setStep] = React.useState<Step>("select-integration");
  const [selectedIntegration, setSelectedIntegration] = React.useState<Id<"integrations"> | null>(null);
  const [externalProjects, setExternalProjects] = React.useState<Array<{ key: string; name: string; id: string }>>([]);
  const [selectedExternalProject, setSelectedExternalProject] = React.useState<string>("");
  const [previewIssues, setPreviewIssues] = React.useState<Array<{
    key: string;
    title: string;
    status?: string;
    priority?: string;
  }>>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [importResult, setImportResult] = React.useState<{
    importedCount: number;
    failedCount: number;
  } | null>(null);

  // Queries
  const integrations = useQuery(api.integrations.list, { orgId });

  // Actions
  const fetchJiraProjects = useAction(api.importPipeline.fetchJiraProjects);
  const fetchJiraIssues = useAction(api.importPipeline.fetchJiraIssues);
  const fetchLinearTeams = useAction(api.importPipeline.fetchLinearTeams);
  const fetchLinearIssues = useAction(api.importPipeline.fetchLinearIssues);
  const fetchAzureProjects = useAction(api.importPipeline.fetchAzureProjects);
  const fetchAzureWorkItems = useAction(api.importPipeline.fetchAzureWorkItems);
  const previewImport = useAction(api.importPipeline.previewImport);
  const importIssues = useAction(api.importPipeline.importIssues);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setStep("select-integration");
      setSelectedIntegration(null);
      setExternalProjects([]);
      setSelectedExternalProject("");
      setPreviewIssues([]);
      setError(null);
      setImportResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedIntegrationData = integrations?.find((i) => i._id === selectedIntegration);

  const handleSelectIntegration = async (id: Id<"integrations">) => {
    setSelectedIntegration(id);
    setIsLoading(true);
    setError(null);

    const integration = integrations?.find((i) => i._id === id);
    if (!integration) return;

    try {
      let projects: Array<{ key: string; name: string; id: string }> = [];

      switch (integration.provider) {
        case "jira":
          const jiraProjects = await fetchJiraProjects({ integrationId: id, orgId });
          projects = jiraProjects.map((p: { key: string; name: string; id: string }) => ({
            key: p.key,
            name: p.name,
            id: p.id,
          }));
          break;

        case "linear":
          const linearTeams = await fetchLinearTeams({ integrationId: id, orgId });
          projects = linearTeams.map((t: { key: string; name: string; id: string }) => ({
            key: t.key,
            name: t.name,
            id: t.id,
          }));
          break;

        case "azure":
          const azureProjects = await fetchAzureProjects({ integrationId: id, orgId });
          projects = azureProjects.map((p: { name: string; id: string }) => ({
            key: p.name,
            name: p.name,
            id: p.id,
          }));
          break;
      }

      setExternalProjects(projects);
      setStep("select-project");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchIssues = async () => {
    if (!selectedIntegration || !selectedExternalProject) return;

    setIsLoading(true);
    setError(null);

    try {
      const integration = integrations?.find((i) => i._id === selectedIntegration);
      if (!integration) throw new Error("Integration not found");

      let rawIssues: unknown[] = [];

      switch (integration.provider) {
        case "jira":
          const jiraResult = await fetchJiraIssues({
            integrationId: selectedIntegration,
            projectKey: selectedExternalProject,
            maxResults: 50,
            orgId,
          });
          rawIssues = jiraResult.issues;
          break;

        case "linear":
          const linearResult = await fetchLinearIssues({
            integrationId: selectedIntegration,
            teamId: selectedExternalProject,
            maxResults: 50,
            orgId,
          });
          rawIssues = linearResult.issues;
          break;

        case "azure":
          const azureResult = await fetchAzureWorkItems({
            integrationId: selectedIntegration,
            project: selectedExternalProject,
            maxResults: 50,
            orgId,
          });
          rawIssues = azureResult.issues;
          break;
      }

      // Get normalized preview
      const normalized = await previewImport({
        integrationId: selectedIntegration,
        externalIssues: rawIssues,
        orgId,
      });

      setPreviewIssues(normalized);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch issues");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedIntegration || previewIssues.length === 0) return;

    setStep("importing");
    setError(null);

    try {
      const result = await importIssues({
        integrationId: selectedIntegration,
        projectId,
        environmentId,
        externalIssues: previewIssues,
        orgId,
      });

      setImportResult({
        importedCount: result.importedCount,
        failedCount: result.failedCount,
      });
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    }
  };

  const getProviderIcon = (provider: Provider) => {
    switch (provider) {
      case "jira":
        return "🔷";
      case "linear":
        return "🔶";
      case "azure":
        return "🔵";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <IconCloudDownload className="h-5 w-5 text-blue-500" />
            Import Issues
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-center gap-2">
              <IconAlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {/* Step 1: Select Integration */}
          {step === "select-integration" && (
            <div>
              <p className="text-sm text-neutral-500 mb-4">
                Select an integration to import issues from:
              </p>

              {integrations && integrations.length > 0 ? (
                <div className="space-y-2">
                  {integrations.map((integration) => (
                    <button
                      key={integration._id}
                      onClick={() => handleSelectIntegration(integration._id)}
                      disabled={isLoading}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
                    >
                      <span className="text-2xl">
                        {getProviderIcon(integration.provider)}
                      </span>
                      <div>
                        <div className="font-medium">{integration.name}</div>
                        <div className="text-sm text-neutral-500 capitalize">
                          {integration.provider}
                        </div>
                      </div>
                      {isLoading && selectedIntegration === integration._id && (
                        <IconLoader className="h-5 w-5 animate-spin ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-500 mb-4">
                    No integrations configured yet.
                  </p>
                  <p className="text-sm text-neutral-400">
                    Go to Settings → Integrations to connect Jira, Linear, or Azure DevOps.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select External Project */}
          {step === "select-project" && (
            <div>
              <p className="text-sm text-neutral-500 mb-4">
                Select a {selectedIntegrationData?.provider} project to import from:
              </p>

              <div className="space-y-2 mb-4">
                {externalProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedExternalProject(project.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                      selectedExternalProject === project.key
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-neutral-500">{project.key}</div>
                    </div>
                    {selectedExternalProject === project.key && (
                      <IconCheck className="h-5 w-5 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview Issues */}
          {step === "preview" && (
            <div>
              <p className="text-sm text-neutral-500 mb-4">
                {previewIssues.length} issues ready to import:
              </p>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Key</th>
                      <th className="px-4 py-2 text-left font-medium">Title</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {previewIssues.slice(0, 10).map((issue, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <td className="px-4 py-2 font-mono text-xs text-blue-600 dark:text-blue-400">
                          {issue.key}
                        </td>
                        <td className="px-4 py-2 truncate max-w-[200px]">
                          {issue.title}
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-700">
                            {issue.status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {issue.priority || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewIssues.length > 10 && (
                  <div className="px-4 py-2 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-800 text-center">
                    ...and {previewIssues.length - 10} more issues
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="text-center py-12">
              <IconLoader className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Importing issues...</p>
              <p className="text-sm text-neutral-500 mt-2">
                This may take a moment.
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && importResult && (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <IconCheck className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium mb-2">Import Complete!</p>
              <p className="text-sm text-neutral-500">
                Successfully imported{" "}
                <span className="font-medium text-green-600">
                  {importResult.importedCount}
                </span>{" "}
                issues.
                {importResult.failedCount > 0 && (
                  <span className="text-red-500 ml-2">
                    ({importResult.failedCount} failed)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          {step !== "select-integration" && step !== "importing" && step !== "complete" ? (
            <button
              onClick={() => {
                if (step === "select-project") setStep("select-integration");
                if (step === "preview") setStep("select-project");
              }}
              className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              <IconArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step === "complete" ? (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
              >
                Done
              </button>
            ) : step === "select-project" ? (
              <button
                onClick={handleFetchIssues}
                disabled={!selectedExternalProject || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <IconLoader className="h-4 w-4 animate-spin" />
                ) : (
                  <IconRefresh className="h-4 w-4" />
                )}
                Fetch Issues
              </button>
            ) : step === "preview" ? (
              <button
                onClick={handleImport}
                disabled={previewIssues.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition disabled:opacity-50"
              >
                <IconCloudDownload className="h-4 w-4" />
                Import {previewIssues.length} Issues
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

