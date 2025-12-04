"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization, useOrganizationList, CreateOrganization } from "@clerk/nextjs";
import { IconSparkles, IconCheck, IconArrowRight } from "@tabler/icons-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userMemberships, isLoaded: listLoaded, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  // If user already has an org selected, redirect to copilot
  useEffect(() => {
    if (orgLoaded && organization) {
      router.push("/copilot");
    }
  }, [orgLoaded, organization, router]);

  // If user has memberships but no active org, they can select one
  const hasMemberships = listLoaded && userMemberships?.data && userMemberships.data.length > 0;

  const handleSelectOrg = async (orgId: string) => {
    if (setActive) {
      await setActive({ organization: orgId });
      router.push("/copilot");
    }
  };

  if (!orgLoaded || !listLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-800" />
          <div className="w-32 h-4 rounded bg-neutral-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <IconSparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">
            RootCopilot
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12 pb-24">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <Step number={1} label="Create Account" completed />
          <StepConnector />
          <Step number={2} label="Setup Organization" active />
          <StepConnector />
          <Step number={3} label="Start Using" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">
            {hasMemberships ? "Select or Create Organization" : "Create Your Organization"}
          </h1>
          <p className="text-neutral-400 max-w-md mx-auto">
            {hasMemberships
              ? "Join an existing organization or create a new one to get started."
              : "Organizations keep your data isolated and secure. You can invite team members later."}
          </p>
        </div>

        {/* Existing Organizations */}
        {hasMemberships && userMemberships.data && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-neutral-300 mb-3">
              Your Organizations
            </h2>
            <div className="space-y-2">
              {userMemberships.data.map((membership) => (
                <button
                  key={membership.organization.id}
                  onClick={() => handleSelectOrg(membership.organization.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-700 bg-neutral-900 hover:border-blue-500 hover:bg-blue-950/30 transition group"
                >
                  <div className="flex items-center gap-3">
                    {membership.organization.imageUrl ? (
                      <img
                        src={membership.organization.imageUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-600 flex items-center justify-center text-neutral-400 font-semibold">
                        {membership.organization.name?.charAt(0) || "O"}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="font-medium text-white">
                        {membership.organization.name}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {membership.role === "admin" ? "Admin" : "Member"}
                      </div>
                    </div>
                  </div>
                  <IconArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-blue-500 transition" />
                </button>
              ))}
            </div>
            
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-neutral-950 text-neutral-500">
                  or create a new organization
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Create Organization */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-2xl">
          <CreateOrganization
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent",
                cardBox: "shadow-none bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                footer: "hidden",
              },
              layout: {
                logoPlacement: "none",
              },
            }}
            afterCreateOrganizationUrl="/welcome"
          />
        </div>

        
      
      </main>
    </div>
  );
}

function Step({
  number,
  label,
  completed,
  active,
}: {
  number: number;
  label: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition ${
          completed
            ? "bg-green-500 text-white"
            : active
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
              : "bg-neutral-800 text-neutral-500"
        }`}
      >
        {completed ? <IconCheck className="w-4 h-4" /> : number}
      </div>
      <span
        className={`text-xs font-medium ${
          active ? "text-blue-400" : completed ? "text-green-400" : "text-neutral-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector() {
  return <div className="w-16 h-0.5 bg-neutral-800 mt-[-20px]" />;
}

