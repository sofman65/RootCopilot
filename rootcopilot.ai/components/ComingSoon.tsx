export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-gray-500 dark:text-gray-400">
        This feature is under active development.  
        Join the early access list to be notified.
      </p>
    </div>
  );
}

