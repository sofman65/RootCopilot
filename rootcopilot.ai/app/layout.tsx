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
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "RootCopilot",
    description: "AI Debugging Assistant for Enterprises",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 1200,
        alt: "RootCopilot logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RootCopilot",
    description: "AI Debugging Assistant for Enterprises",
    images: ["/twitter-image.jpg"],
  },
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
