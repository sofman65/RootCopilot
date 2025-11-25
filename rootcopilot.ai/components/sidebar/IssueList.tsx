"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconList } from "@tabler/icons-react";
import type { Id } from "@/convex/_generated/dataModel";

import { SidebarLink } from "@/components/ui/sidebar";
import SkeletonList from "./SkeletonList";

type IssueListProps = {
  environmentId: Id<"environments">;
  openIssue: (x: Id<"issues">) => void;
};

export default function IssueList({ environmentId, openIssue }: IssueListProps) {
  const issues = useQuery(api.issues.listByEnvironment, { environmentId });
  if (issues === undefined) return <SkeletonList count={5} indent />;

  return (
    <div className="ml-3">
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
