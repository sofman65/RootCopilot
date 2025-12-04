import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import ThemeProviders from "@/components/ThemeProviders";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

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
              <SidebarProvider>
                <AuthenticatedLayout>
                  {children}
                </AuthenticatedLayout>
              </SidebarProvider>
            </ConvexClientProvider>
          </ThemeProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}
