"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  Contact,
  Phone,
  Send,
  Calendar,
  Settings,
  LayoutDashboard,
  FolderOpen,
  Clapperboard,
  FileText,
  Building2,
  HelpCircle,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Call Sheet", href: "/calls", icon: Phone },
  { label: "Meetings", href: "/meetings", icon: Calendar },
  { label: "Submissions", href: "/submissions", icon: Send },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Client Material", href: "/materials", icon: FileText },
  { label: "Contacts", href: "/contacts", icon: Contact },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Projects", href: "/projects", icon: Clapperboard },
  { label: "Files", href: "/files", icon: FolderOpen },
];

interface SidebarNavProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarNav({ open, onClose }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-28 items-center justify-between border-b border-zinc-200 px-4">
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/images/shuman-logo.svg"
              alt="The Shuman Company"
              className="h-24 w-auto"
            />
          </Link>
          <button onClick={onClose} className="lg:hidden text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-200/70 text-black"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer: Help + Settings + Logout */}
        <div className="border-t border-zinc-200 px-3 py-3 space-y-0.5">
          <Link
            href="/help"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/help")
                ? "bg-zinc-200/70 text-black"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
            )}
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-zinc-200/70 text-black"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-black transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
