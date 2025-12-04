"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser, useOrganization } from "@clerk/nextjs";
import {
  IconSparkles,
  IconBrain,
  IconShieldCheck,
  IconUsers,
  IconArrowRight,
  IconChevronRight,
  IconBolt,
  IconRocket,
  IconCloud,
} from "@tabler/icons-react";

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  // Redirect authenticated users with org to copilot
  useEffect(() => {
    if (userLoaded && isSignedIn) {
      if (orgLoaded && organization) {
        router.push("/copilot");
      } else if (orgLoaded && !organization) {
        router.push("/onboarding");
      }
    }
  }, [userLoaded, isSignedIn, orgLoaded, organization, router]);

  // Show loading while checking auth
  if (!userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-800" />
          <div className="w-32 h-4 rounded bg-neutral-800" />
        </div>
      </div>
    );
  }

  // If signed in, show loading while redirecting
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <IconSparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <p className="text-neutral-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <IconSparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">RootCopilot</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-neutral-400 hover:text-white transition">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-neutral-400 hover:text-white transition">
              How it Works
            </a>
            <a href="#security" className="text-sm text-neutral-400 hover:text-white transition">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-neutral-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 text-sm font-medium bg-white text-neutral-900 rounded-lg hover:bg-neutral-100 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm mb-8">
            <IconBolt className="w-4 h-4" />
            <span>AI-Powered Root Cause Analysis</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Debug Faster with
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI-Powered Insights
            </span>
          </h1>

          <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            RootCopilot helps enterprise teams analyze logs, configs, and documentation 
            to find root causes in minutes, not hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-4 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2"
            >
              Start Free Trial
              <IconArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-8 py-4 text-lg font-medium border border-neutral-700 hover:border-neutral-600 rounded-xl transition"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-6 text-sm text-neutral-500">
            No credit card required • Setup in 2 minutes
          </p>
        </div>

        {/* Hero Visual */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800 bg-neutral-900">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-4 text-xs text-neutral-500">RootCopilot — DemoOrg</span>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                {/* Chat Preview */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                      <span className="text-xs">👤</span>
                    </div>
                    <div className="bg-neutral-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-neutral-300">
                      Why are payments failing in production?
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                      <IconSparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-neutral-300 max-w-md">
                      Based on the logs from <span className="text-blue-400">payment-gateway.log</span> and config in <span className="text-blue-400">psp-config.yaml</span>, the issue is a timeout in the PSP connection pool...
                    </div>
                  </div>
                </div>
                {/* Sidebar Preview */}
                <div className="hidden md:block w-48 border-l border-neutral-800 pl-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500">Sources</p>
                  <div className="text-xs bg-neutral-800/50 rounded px-2 py-1 text-neutral-400">
                    payment-gateway.log
                  </div>
                  <div className="text-xs bg-neutral-800/50 rounded px-2 py-1 text-neutral-400">
                    psp-config.yaml
                  </div>
                  <div className="text-xs bg-neutral-800/50 rounded px-2 py-1 text-neutral-400">
                    runbook-payments.md
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need for faster debugging
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Built for enterprise teams who need to resolve issues quickly and efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<IconBrain className="w-6 h-6" />}
              title="RAG-Powered Search"
              description="Upload docs, logs, configs, runbooks - search across everything with AI understanding"
            />
            <FeatureCard
              icon={<IconUsers className="w-6 h-6" />}
              title="Multi-Tenant"
              description="Each organization has isolated, secure data. Perfect for consulting firms and SaaS teams"
            />
            <FeatureCard
              icon={<IconShieldCheck className="w-6 h-6" />}
              title="Enterprise Security"
              description="SOC2 compliant, data encryption at rest and in transit, SSO support"
            />
            <FeatureCard
              icon={<IconCloud className="w-6 h-6" />}
              title="Jira/Linear Integration"
              description="Import issues from your existing tools, keep everything in sync"
            />
            <FeatureCard
              icon={<IconRocket className="w-6 h-6" />}
              title="Instant Setup"
              description="No complex configuration. Create your org and start uploading docs in minutes"
            />
            <FeatureCard
              icon={<IconBolt className="w-6 h-6" />}
              title="Real-time Collaboration"
              description="Share threads, tag teammates, build a knowledge base together"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 border-t border-white/5 py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to debug smarter?
          </h2>
          <p className="text-neutral-400 mb-8">
            Join teams who have cut their mean time to resolution in half.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl shadow-lg shadow-blue-500/25 transition"
          >
            Get Started for Free
            <IconChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <IconSparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">RootCopilot</span>
          </div>
          <p className="text-sm text-neutral-500">
            © 2025 RootCopilot. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900/80 transition group">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
    </div>
  );
}
