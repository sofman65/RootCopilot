"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  IconX,
  IconPlus,
  IconTrash,
  IconLoader,
  IconCheck,
  IconAlertCircle,
  IconPlugConnected,
  IconExternalLink,
} from "@tabler/icons-react";

type Provider = "jira" | "linear" | "azure";

interface IntegrationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

const PROVIDER_INFO = {
  jira: {
    name: "Jira",
    icon: "🔷",
    description: "Connect to Atlassian Jira Cloud",
    fields: {
      baseUrl: {
        label: "Jira Cloud URL",
        placeholder: "https://your-domain.atlassian.net",
        hint: "Your Jira Cloud instance URL",
      },
      accessToken: {
        label: "API Token",
        placeholder: "Your Jira API token",
        hint: "Generate from Atlassian Account → Security → API Tokens",
        isSecret: true,
      },
    },
  },
  linear: {
    name: "Linear",
    icon: "🔶",
    description: "Connect to Linear.app",
    fields: {
      accessToken: {
        label: "API Key",
        placeholder: "lin_api_...",
        hint: "Generate from Linear → Settings → API",
        isSecret: true,
      },
    },
  },
  azure: {
    name: "Azure DevOps",
    icon: "🔵",
    description: "Connect to Azure DevOps Services",
    fields: {
      baseUrl: {
        label: "Organization URL",
        placeholder: "https://dev.azure.com/your-org",
        hint: "Your Azure DevOps organization URL",
      },
      accessToken: {
        label: "Personal Access Token",
        placeholder: "Your PAT",
        hint: "Generate from Azure DevOps → User Settings → PAT",
        isSecret: true,
      },
    },
  },
};

export default function IntegrationSettings({
  isOpen,
  onClose,
  orgId,
}: IntegrationSettingsProps) {
  const [view, setView] = React.useState<"list" | "add">("list");
  const [selectedProvider, setSelectedProvider] = React.useState<Provider | null>(null);
  const [formData, setFormData] = React.useState<{
    name: string;
    baseUrl: string;
    accessToken: string;
  }>({
    name: "",
    baseUrl: "",
    accessToken: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<Id<"integrations"> | null>(null);

  // Queries
  const integrations = useQuery(api.integrations.list, { orgId });

  // Mutations
  const createIntegration = useMutation(api.integrations.create);
  const deleteIntegration = useMutation(api.integrations.remove);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setView("list");
      setSelectedProvider(null);
      setFormData({ name: "", baseUrl: "", accessToken: "" });
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setFormData({
      name: PROVIDER_INFO[provider].name,
      baseUrl: "",
      accessToken: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createIntegration({
        provider: selectedProvider,
        name: formData.name,
        baseUrl: formData.baseUrl || undefined,
        accessToken: formData.accessToken,
        orgId,
      });

      setView("list");
      setSelectedProvider(null);
      setFormData({ name: "", baseUrl: "", accessToken: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create integration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"integrations">) => {
    if (!confirm("Delete this integration? This will also remove all associated mappings.")) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteIntegration({ id, orgId });
    } catch (err) {
      console.error("Failed to delete integration:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <IconPlugConnected className="h-5 w-5 text-purple-500" />
            {view === "list" ? "Integrations" : "Add Integration"}
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

          {view === "list" && (
            <div>
              {integrations && integrations.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {integrations.map((integration) => (
                    <div
                      key={integration._id}
                      className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700"
                    >
                      <span className="text-2xl">
                        {PROVIDER_INFO[integration.provider]?.icon || "🔗"}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{integration.name}</div>
                        <div className="text-sm text-neutral-500 flex items-center gap-2">
                          <span className="capitalize">{integration.provider}</span>
                          {integration.status === "active" ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <IconCheck className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-500">
                              <IconAlertCircle className="h-3 w-3" />
                              {integration.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(integration._id)}
                        disabled={deletingId === integration._id}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                      >
                        {deletingId === integration._id ? (
                          <IconLoader className="h-4 w-4 animate-spin" />
                        ) : (
                          <IconTrash className="h-4 w-4 text-red-500" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  No integrations configured yet.
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {(["jira", "linear", "azure"] as Provider[]).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => {
                      handleSelectProvider(provider);
                      setView("add");
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                  >
                    <span className="text-2xl">{PROVIDER_INFO[provider].icon}</span>
                    <span className="text-sm font-medium">
                      Add {PROVIDER_INFO[provider].name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "add" && selectedProvider && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{PROVIDER_INFO[selectedProvider].icon}</span>
                <div>
                  <div className="font-semibold">{PROVIDER_INFO[selectedProvider].name}</div>
                  <div className="text-sm text-neutral-500">
                    {PROVIDER_INFO[selectedProvider].description}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Integration Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                  placeholder="My Jira Integration"
                  required
                />
              </div>

              {PROVIDER_INFO[selectedProvider].fields.baseUrl && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {PROVIDER_INFO[selectedProvider].fields.baseUrl.label}
                  </label>
                  <input
                    type="url"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent"
                    placeholder={PROVIDER_INFO[selectedProvider].fields.baseUrl.placeholder}
                    required={selectedProvider !== "linear"}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    {PROVIDER_INFO[selectedProvider].fields.baseUrl.hint}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  {PROVIDER_INFO[selectedProvider].fields.accessToken.label}
                </label>
                <input
                  type="password"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent font-mono"
                  placeholder={PROVIDER_INFO[selectedProvider].fields.accessToken.placeholder}
                  required
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {PROVIDER_INFO[selectedProvider].fields.accessToken.hint}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <IconLoader className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconPlus className="h-4 w-4" />
                  )}
                  Add Integration
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

