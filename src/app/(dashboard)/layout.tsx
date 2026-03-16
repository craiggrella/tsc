"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, Phone } from "lucide-react";
import { SidebarNav } from "@/components/shared/sidebar-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNewCall = useCallback(() => {
    if (pathname === "/calls") {
      // Already on calls page — dispatch custom event so the client component opens the panel
      window.dispatchEvent(new CustomEvent("new-call"));
    } else {
      router.push("/calls?new=1");
    }
  }, [pathname, router]);

  // Global keyboard shortcut: Cmd+J / Ctrl+J
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        handleNewCall();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewCall]);

  return (
    <div className="flex h-screen bg-white">
      <SidebarNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar - mobile */}
        <header className="flex h-28 items-center border-b border-zinc-200 px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-500 hover:text-black"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Image
            src="/images/The Shuman Company Logo.jpeg"
            alt="The Shuman Company"
            width={400}
            height={120}
            className="ml-3 h-24 w-auto"
          />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Floating New Call button - bottom right, hidden on calls page */}
        {pathname !== "/calls" && (
          <button
            onClick={handleNewCall}
            className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-zinc-800 transition-colors"
            title="New Call (⌘J)"
          >
            <Phone className="h-4 w-4" />
            New Call
            <kbd className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-normal">
              ⌘J
            </kbd>
          </button>
        )}
      </div>
    </div>
  );
}
