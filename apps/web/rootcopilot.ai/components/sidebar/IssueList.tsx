"use client";

import * as React from "react";
import { IconList } from "@tabler/icons-react";
import { type EntityId, type Issue, listIssues } from "@/lib/rootcopilot-api";

import { SidebarLink } from "@/components/ui/sidebar";
import SkeletonList from "./SkeletonList";
import { useSidebar } from "@/components/ui/sidebar";

type IssueListProps = {
  environmentId: EntityId;
  openIssue: (x: EntityId) => void;
};

export default function IssueList({ environmentId, openIssue }: IssueListProps) {
  const { open } = useSidebar();
  const [issues, setIssues] = React.useState<Issue[] | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;

    listIssues(environmentId)
      .then((items) => {
        if (!cancelled) setIssues(items);
      })
      .catch((error) => {
        console.error("Failed to load issues:", error);
        if (!cancelled) setIssues([]);
      });

    return () => {
      cancelled = true;
    };
  }, [environmentId]);

  if (issues === undefined) return <SkeletonList count={5} indent />;

  return (
    <div className={open ? "ml-3" : "ml-0"}>
      {issues.map((issue) => (
        <SidebarLink
          key={issue._id}
          link={{
            label: `#${issue._id.slice(-6)} ${issue.title}`,
            href: "#",
            icon: <IconList className="h-5 w-5" />
          }}
          onClick={() => openIssue(issue._id)}
        />
      ))}
    </div>
  );
}
