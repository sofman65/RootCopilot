import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import AppSidebar from "@/components/AppSidebar";
import RootContentWrapper from "@/components/RootContentWrapper"; // <-- NEW WRAPPER
import { SidebarProvider } from "@/components/ui/sidebar";
import ThemeProviders from "@/components/ThemeProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          <ThemeProviders>
            <ConvexClientProvider>
               {/* WRAP SIDEBAR + CONTENT */}
               <SidebarProvider>
                <div className="h-screen w-full flex bg-white dark:bg-neutral-900 overflow-hidden">
                  <AppSidebar />
                  <RootContentWrapper>
                    {children}
                  </RootContentWrapper>
                </div>
              </SidebarProvider>
            </ConvexClientProvider>
          </ThemeProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}
