'use client';

import Footer from "@/components/landing-page/ui/Footer"
import { NavBar } from "@/components/landing-page/ui/Navbar"
import { useEffect } from "react";
import { useTheme } from "next-themes";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { setTheme } = useTheme();

  useEffect(() => {
    // Force light theme for the landing page to match Solar template
    setTheme('light');
  }, [setTheme]);

  return (
    <div className="light bg-gray-50 text-gray-900 antialiased selection:bg-violet-100 selection:text-violet-600 min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: `
        .light {
          --background: 0 0% 100%;
          --foreground: 222.2 84% 4.9%;
          background-color: #f9fafb !important;
        }
      ` }} />
      <NavBar />
      <main className="isolate">
        {children}
      </main>
      <Footer />
    </div>
  )
}
