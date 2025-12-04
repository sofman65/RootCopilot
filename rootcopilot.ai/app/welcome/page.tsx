"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import {
  IconSparkles,
  IconUpload,
  IconRobot,
  IconSettings,
  IconArrowRight,
  IconCheck,
  IconBook2,
  IconBrain,
  IconFolderPlus,
} from "@tabler/icons-react";

export default function WelcomePage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <IconSparkles className="w-8 h-8" />,
      title: "Welcome to RootCopilot!",
      subtitle: `Your organization "${organization?.name}" is ready`,
      description:
        "RootCopilot helps you debug faster with AI-powered root cause analysis. Let's take a quick tour of the key features.",
      action: "Get Started",
    },
    {
      icon: <IconFolderPlus className="w-8 h-8" />,
      title: "Set Up Your Workspace",
      subtitle: "Organize your clients, projects, and environments",
      description:
        "Create a hierarchy: Clients → Projects → Environments → Issues. This structure helps organize tickets and provides context for the AI.",
      features: [
        "Create demo data instantly with one click",
        "Import issues from Jira, Linear, or Azure DevOps",
        "Manually add clients, projects, and issues",
      ],
      action: "Next",
    },
    {
      icon: <IconUpload className="w-8 h-8" />,
      title: "Upload Your Knowledge Base",
      subtitle: "Feed the AI with your documentation",
      description:
        "Upload PDFs, DOCs, logs, configs, runbooks, and any text files. The AI will index everything and use it to answer your questions.",
      features: [
        "Supports PDF, DOCX, images, and text files",
        "Automatic OCR for scanned documents",
        "Namespace support for organizing docs",
      ],
      action: "Next",
    },
    {
      icon: <IconRobot className="w-8 h-8" />,
      title: "Ask the AI Copilot",
      subtitle: "Get instant answers from your indexed data",
      description:
        "Ask questions like 'Why are payments failing?' or 'What's the PSP config for UAT?' — the AI will search your knowledge base and provide contextual answers.",
      features: [
        "RAG-powered search across all documents",
        "Issue-specific threads for debugging",
        "Quick actions for common tasks",
      ],
      action: "Finish Setup",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Redirect to workspace to set up first
      router.push("/workspace");
    }
  };

  const handleSkip = () => {
    router.push("/copilot");
  };

  const step = steps[currentStep];

  return (
    <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentStep
                  ? "bg-blue-500 w-8"
                  : index < currentStep
                    ? "bg-green-500"
                    : "bg-neutral-700"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">{step.title}</h1>
            <p className="text-blue-400 font-medium mb-4">{step.subtitle}</p>
            <p className="text-neutral-400 leading-relaxed">{step.description}</p>
          </div>

          {/* Features list */}
          {step.features && (
            <div className="bg-neutral-800/50 rounded-xl p-4 mb-8">
              <ul className="space-y-3">
                {step.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <IconCheck className="w-3 h-3 text-blue-400" />
                    </div>
                    <span className="text-neutral-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-neutral-500 hover:text-neutral-300 text-sm transition"
            >
              Skip tutorial
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition"
            >
              {step.action}
              <IconArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <QuickLink
            icon={<IconSettings className="w-5 h-5" />}
            label="Workspace"
            href="/workspace"
          />
          <QuickLink
            icon={<IconBrain className="w-5 h-5" />}
            label="Copilot"
            href="/copilot"
          />
          <QuickLink
            icon={<IconBook2 className="w-5 h-5" />}
            label="Documentation"
            href="/docs"
          />
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-center justify-center gap-2 p-3 rounded-xl border border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/50 transition"
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

