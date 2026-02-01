"use client";

import { SignIn } from "@clerk/nextjs";
import Brand from "@/components/shared/Brand";

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full flex bg-neutral-950">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-md px-8 text-center">
          <Brand size={64} className="mx-auto mb-8" />

          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            RootCopilot
          </h1>
          <p className="text-lg text-neutral-400 mb-8">
            AI-Powered Root Cause Analysis for Enterprise Teams
          </p>

          <div className="space-y-4 text-left">
            <FeatureItem
              title="Multi-tenant Knowledge Base"
              description="Each organization has isolated, secure data"
            />
            <FeatureItem
              title="RAG-Powered Debugging"
              description="Upload docs, logs, configs - get instant answers"
            />
            <FeatureItem
              title="Issue Management"
              description="Track, analyze, and resolve issues faster"
            />
          </div>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-neutral-950">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <Brand size={48} className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">
              RootCopilot
            </h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Welcome back
            </h2>
            <p className="text-neutral-400">
              Sign in to continue to your workspace
            </p>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent p-0 border-none",
                cardBox: "shadow-none bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white h-11 rounded-lg",
                socialButtonsBlockButtonText: "font-medium text-white",
                socialButtonsProviderIcon: "brightness-0 invert opacity-80",
                dividerLine: "bg-neutral-700",
                dividerText: "text-neutral-500",
                formFieldLabel: "text-neutral-300 font-medium text-sm",
                formFieldLabelRow: "mb-1",
                formFieldInput:
                  "border-neutral-700 bg-neutral-900 text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg h-11",
                formButtonPrimary:
                  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 h-11",
                footerActionLink: "text-blue-400 hover:text-blue-300",
                footerActionText: "text-neutral-400",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
                formFieldInputShowPasswordButton: "text-neutral-400 hover:text-white",
                formFieldAction: "text-blue-400 hover:text-blue-300",
                formFieldErrorText: "text-red-400",
                alertText: "text-neutral-300",
                alert: "bg-neutral-900 border-neutral-700",
                otpCodeFieldInput: "border-neutral-700 bg-neutral-900 text-white",
                formResendCodeLink: "text-blue-400 hover:text-blue-300",
                footerAction: "bg-transparent justify-center",
                footer: "bg-transparent",
                // Hide Clerk branding
                internal: "hidden",
                badge: "hidden",
                logoBox: "hidden",
              },
              layout: {
                socialButtonsPlacement: "top",
                showOptionalFields: false,
                logoPlacement: "none",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/onboarding"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
      <div>
        <h3 className="text-white font-medium">{title}</h3>
        <p className="text-neutral-500 text-sm">{description}</p>
      </div>
    </div>
  );
}
