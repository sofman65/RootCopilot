export function ChatBubbleSkeleton() {
    return (
      <div className="flex w-full gap-3 p-4">
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="max-w-[80%] space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }