// Default to demo mode for the blog walkthrough branch; can be disabled via env.
export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "false" ? false : true;

export const DEMO_ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? "demo-org";

export const DEMO_ORG_NAME = "RootCopilot Demo";
