'use client'

import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import type { Doc, Id } from '@/convex/_generated/dataModel'

type Persisted = {
  clients: Id<'clients'>[]
  projects: Id<'projects'>[]
  envs: Id<'environments'>[]
}

const STORAGE_KEY = 'sidebarExpandedV1'

type ClientDoc = Doc<'clients'>
type ProjectDoc = Doc<'projects'>
type EnvironmentDoc = Doc<'environments'>
type IssueDoc = Doc<'issues'>

export default function SidebarTree() {
  const router = useRouter()

  const [expandedClients, setExpandedClients] = useState<Set<Id<'clients'>>>(
    new Set<Id<'clients'>>()
  )
  const [expandedProjects, setExpandedProjects] = useState<
    Set<Id<'projects'>>
  >(new Set<Id<'projects'>>())
  const [expandedEnvs, setExpandedEnvs] = useState<Set<Id<'environments'>>>(
    new Set<Id<'environments'>>()
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p: Persisted = JSON.parse(raw)
        setExpandedClients(new Set(p.clients))
        setExpandedProjects(new Set(p.projects))
        setExpandedEnvs(new Set(p.envs))
      }
    } catch {}
  }, [])

  useEffect(() => {
    const data: Persisted = {
      clients: Array.from(expandedClients),
      projects: Array.from(expandedProjects),
      envs: Array.from(expandedEnvs),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [expandedClients, expandedProjects, expandedEnvs])

  const clients = useQuery(api.clients.list)

  if (clients === undefined) return <div className="p-2 text-sm">Loading…</div>

  return (
    <div className="w-72 border-r h-screen overflow-auto p-2">
      <div className="text-xs font-semibold mb-2">Navigation</div>
      <ul className="space-y-1">
        {clients.map((c) => (
          <ClientNode
            key={c._id}
            client={c}
            expanded={expandedClients.has(c._id)}
            toggle={() => {
              setExpandedClients((s) => {
                const next = new Set(s)
                if (next.has(c._id)) {
                  next.delete(c._id)
                } else {
                  next.add(c._id)
                }
                return next
              })
            }}
            expandedProjects={expandedProjects}
            setExpandedProjects={setExpandedProjects}
            expandedEnvs={expandedEnvs}
            setExpandedEnvs={setExpandedEnvs}
            onOpenIssue={(issueId) => router.push(`/issues/${issueId}/thread`)}
          />
        ))}
      </ul>
    </div>
  )
}

function ClientNode({
  client,
  expanded,
  toggle,
  expandedProjects,
  setExpandedProjects,
  expandedEnvs,
  setExpandedEnvs,
  onOpenIssue,
}: {
  client: ClientDoc
  expanded: boolean
  toggle: () => void
  expandedProjects: Set<Id<'projects'>>
  setExpandedProjects: React.Dispatch<React.SetStateAction<Set<Id<'projects'>>>>
  expandedEnvs: Set<Id<'environments'>>
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<'environments'>>>>
  onOpenIssue: (issueId: Id<'issues'>) => void
}) {
  const projects = useQuery(
    api.projects.listByClient,
    expanded ? { clientId: client._id } : 'skip'
  )

  return (
    <li>
      <button className="w-full text-left" onClick={toggle}>
        {expanded ? '▾' : '▸'} {client.name}
      </button>
      {expanded && projects && (
        <ul className="ml-4 mt-1 space-y-1">
          {projects.map((p: ProjectDoc) => (
            <ProjectNode
              key={p._id}
              project={p}
              expanded={expandedProjects.has(p._id)}
              toggle={() => {
                setExpandedProjects((s: Set<Id<'projects'>>) => {
                  const next = new Set(s)
                  if (next.has(p._id)) {
                    next.delete(p._id)
                  } else {
                    next.add(p._id)
                  }
                  return next
                })
              }}
              expandedEnvs={expandedEnvs}
              setExpandedEnvs={setExpandedEnvs}
              onOpenIssue={onOpenIssue}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function ProjectNode({
  project,
  expanded,
  toggle,
  expandedEnvs,
  setExpandedEnvs,
  onOpenIssue,
}: {
  project: ProjectDoc
  expanded: boolean
  toggle: () => void
  expandedEnvs: Set<Id<'environments'>>
  setExpandedEnvs: React.Dispatch<React.SetStateAction<Set<Id<'environments'>>>>
  onOpenIssue: (issueId: Id<'issues'>) => void
}) {
  const envs = useQuery(
    api.environments.listByProject,
    expanded ? { projectId: project._id } : 'skip'
  )

  return (
    <li>
      <button className="w-full text-left" onClick={toggle}>
        {expanded ? '▾' : '▸'} {project.name}
      </button>
      {expanded && envs && (
        <ul className="ml-4 mt-1 space-y-1">
          {envs.map((e: EnvironmentDoc) => (
            <EnvNode
              key={e._id}
              env={e}
              expanded={expandedEnvs.has(e._id)}
              toggle={() => {
                setExpandedEnvs((s: Set<Id<'environments'>>) => {
                  const next = new Set(s)
                  if (next.has(e._id)) {
                    next.delete(e._id)
                  } else {
                    next.add(e._id)
                  }
                  return next
                })
              }}
              onOpenIssue={onOpenIssue}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function EnvNode({
  env,
  expanded,
  toggle,
  onOpenIssue,
}: {
  env: EnvironmentDoc
  expanded: boolean
  toggle: () => void
  onOpenIssue: (issueId: Id<'issues'>) => void
}) {
  const issues = useQuery(
    api.issues.listByEnvironment,
    expanded ? { environmentId: env._id } : 'skip'
  )

  return (
    <li>
      <button className="w-full text-left" onClick={toggle}>
        {expanded ? '▾' : '▸'} {env.name}
      </button>
      {expanded && issues && (
        <ul className="ml-4 mt-1 space-y-1">
          {issues.map((i: IssueDoc) => (
            <li key={i._id}>
              <button
                className="w-full text-left hover:underline"
                onClick={() => onOpenIssue(i._id)}
              >
                #{i._id.slice(-6)} {i.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
