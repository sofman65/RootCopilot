'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ChatBubble, ChatBubbleSkeleton } from '@/components/ChatBubble';
import { IconMessageCircle } from '@tabler/icons-react';

export default function ThreadPage({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = React.use(params);
  
  // Get the thread for this issue
  const thread = useQuery(api.threads.getByIssue, { 
    issueId: issueId as Id<"issues"> 
  });
  
  // Get messages for this thread
  const messages = useQuery(
    api.messages.getByThread,
    thread ? { threadId: thread._id } : "skip"
  );

  const issue = useQuery(api.issues.get, { 
    id: issueId as Id<"issues"> 
  });

  if (thread === undefined || issue === undefined) {
    return (
      <div className="flex h-full w-full flex-1 flex-col">
        <div className="border-b border-neutral-200 dark:border-neutral-700 p-6">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {[...Array(3)].map((_, i) => (
            <ChatBubbleSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center">
        <IconMessageCircle className="h-12 w-12 text-gray-400 dark:text-gray-600" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          No thread found
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This issue doesn&apos;t have a conversation thread yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 p-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {issue?.title || 'Loading...'}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Issue #{issueId.slice(-6)} • Created {issue ? new Date(issue.created_at).toLocaleDateString() : '...'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages === undefined ? (
          <div className="space-y-4 p-4">
            {[...Array(3)].map((_, i) => (
              <ChatBubbleSkeleton key={i} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <IconMessageCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                Start the conversation
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                No messages in this thread yet. Be the first to ask a question!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <ChatBubble
                key={message._id}
                role={message.role}
                content={message.content}
                timestamp={message.created_at}
              />
            ))}
          </div>
        )}
      </div>

      {/* Message Input Placeholder */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            Ask a question about this issue...
          </div>
          <button 
            disabled
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Message input coming soon...
        </p>
      </div>
    </div>
  );
}