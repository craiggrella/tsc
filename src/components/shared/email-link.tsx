"use client";

import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small mail-icon button that opens the user's email client.
 * Place next to wherever an email address is rendered.
 */
export function MailIconButton({
  email,
  className,
}: {
  email: string | null | undefined;
  className?: string;
}) {
  if (!email) return null;
  return (
    <a
      href={`mailto:${email}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center text-zinc-400 hover:text-black transition-colors",
        className
      )}
      title={`Send email to ${email}`}
      aria-label={`Send email to ${email}`}
    >
      <Mail className="h-3.5 w-3.5" />
    </a>
  );
}
