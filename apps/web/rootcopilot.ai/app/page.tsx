import Link from 'next/link';

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Welcome to RootCopilot</h1>
      <p className="text-sm text-[hsl(var(--rcp-muted-fg))] mb-6">
        Use the left sidebar to pick a Client → Project → Environment → Issue.
      </p>
      <Link href="/search" className="rcp-btn rcp-btn-primary">Search Issues</Link>
    </main>
  );
}
