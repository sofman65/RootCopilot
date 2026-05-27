import type { Metadata } from "next";
import "./globals.css";

import AppSidebar from "@/components/AppSidebar";
import RootContentWrapper from "@/components/RootContentWrapper";
import { SidebarProvider } from "@/components/ui/sidebar";
import ThemeProviders from "@/components/ThemeProviders";

export const metadata: Metadata = {
  title: "RootCopilot",
  description: "AI Debugging Assistant for Enterprises",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProviders>
          <SidebarProvider>
            <div className="h-full w-full flex bg-white dark:bg-neutral-900 overflow-hidden">
              <AppSidebar />
              <RootContentWrapper>{children}</RootContentWrapper>
            </div>
          </SidebarProvider>
        </ThemeProviders>
      </body>
    </html>
  );
}
