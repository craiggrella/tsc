"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Call Log", href: "/calls", icon: Phone },
  { label: "Meetings", href: "/meetings", icon: Calendar },
  { label: "Submissions", href: "/submissions", icon: Send },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Contacts", href: "/contacts", icon: Contact },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Projects", href: "/projects", icon: Clapperboard },
  { label: "Client Material", href: "/materials", icon: FileText },
  { label: "Files", href: "/files", icon: FolderOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarNavProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarNav({ open, onClose }: SidebarNavProps) {
  const pathname = usePathname();

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
            <Image
              src="/images/The Shuman Company Logo.jpeg"
              alt="The Shuman Company"
              width={400}
              height={120}
              className="h-24 w-auto"
              priority
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
      </aside>
    </>
  );
}
