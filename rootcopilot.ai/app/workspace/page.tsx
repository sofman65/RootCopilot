"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { DEMO_MODE, DEMO_ORG_ID, DEMO_ORG_NAME } from "@/lib/demo";
import { StatusBadge } from "@/components/shared";
import { IconAlertCircle, IconBolt, IconLoader } from "@tabler/icons-react";

export default function WorkspacePage() {
  const { organization } = useOrganization();
  const orgId = DEMO_MODE ? DEMO_ORG_ID : organization?.id;

  const clients = useQuery(api.clients.list, orgId ? { orgId } : "skip");
  const projects = useQuery(
    api.projects.listByClient,
    clients?.[0]?._id && orgId ? { clientId: clients[0]._id, orgId } : "skip"
  );
  const environments = useQuery(
    api.environments.listByProject,
    projects?.[0]?._id && orgId ? { projectId: projects[0]._id, orgId } : "skip"
  );
  const issues = useQuery(
    api.issues.listByEnvironment,
    environments?.[0]?._id && orgId ? { environmentId: environments[0]._id, orgId } : "skip"
  );

  const seedWorkspace = useMutation(api.seed.run);
  const [seeding, setSeeding] = React.useState(false);
  const [seededOnce, setSeededOnce] = React.useState(false);

  React.useEffect(() => {
    if (!DEMO_MODE || seededOnce || !orgId) return;
    if (clients && clients.length === 0) {
      setSeeding(true);
      seedWorkspace({ orgId })
        .catch(() => {})
        .finally(() => {
          setSeeding(false);
          setSeededOnce(true);
        });
    }
  }, [clients, orgId, seedWorkspace, seededOnce]);

  const loading =
    clients === undefined ||
    projects === undefined ||
    environments === undefined ||
    issues === undefined;

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-400/80">
              Guided Demo
            </p>
            <h1 className="text-3xl font-semibold">RootCopilot Workspace</h1>
            <p className="text-neutral-400 mt-1">
              1 tenant · 1 client · 1 project · DEV environment · 3-5 live issues
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
              {DEMO_MODE ? `${DEMO_ORG_NAME}` : "Your Org"}
            </span>
            <button
              onClick={() => {
                if (!orgId) return;
                setSeeding(true);
                seedWorkspace({ orgId })
                  .finally(() => setSeeding(false));
              }}
              disabled={!orgId || seeding}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 hover:border-neutral-500 text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {seeding ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconBolt className="w-4 h-4" />}
              Reset demo data
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard label="Client" value={clients?.[0]?.name ?? "Demo Client"} />
          <InfoCard label="Project" value={projects?.[0]?.name ?? "Payments"} />
          <InfoCard label="Environment" value={environments?.[0]?.name ?? "DEV"} />
        </section>

        <section className="bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Issues</p>
              <h2 className="text-lg font-semibold">Live incidents for the demo project</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <IconAlertCircle className="w-4 h-4" />
              AI thread available for every issue
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-neutral-500">Loading demo workspace…</div>
          ) : issues && issues.length > 0 ? (
            <ul className="divide-y divide-neutral-800">
              {issues.map((issue) => (
                <li key={issue._id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-xs text-neutral-500">
                      Created {new Date(issue.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={issue.status} />
                  <span className="text-xs px-2 py-1 rounded-full border border-neutral-700 text-neutral-300">
                    {issue.priority?.toUpperCase()}
                  </span>
                  <Link
                    href={`/issues/${issue._id}/thread`}
                    className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 transition"
                  >
                    Open with AI
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-neutral-400">No issues found. Reset demo data to populate examples.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
