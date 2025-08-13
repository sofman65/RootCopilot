'use client';

import Link from 'next/link';
import { Authenticated, Unauthenticated } from 'convex/react';
import { SignInButton } from '@clerk/nextjs';

export default function Page() {
  return (
    <>
      <Authenticated>
        <main className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Welcome to RootCopilot</h1>
          <p className="text-sm text-[hsl(var(--rcp-muted-fg))] mb-6">
            Use the left sidebar to pick a Client → Project → Environment → Issue.
          </p>
          <Link href="/dashboard" className="rcp-btn rcp-btn-primary">Go to Dashboard</Link>
        </main>
      </Authenticated>

      <Unauthenticated>
        <div className="p-6">
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
