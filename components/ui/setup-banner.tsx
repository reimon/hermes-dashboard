"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

/**
 * Global banner shown when no valid Hermes home is resolved (no state.db /
 * config.yaml). Nudges the user to the Setup page. Hidden on /setup itself.
 */
export function SetupBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.currentInspection) return;
        setShow(!d.currentInspection.valid);
        setPath(typeof d.current === "string" ? d.current : "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!show || dismissed || pathname === "/setup") return null;

  return (
    <div className="mb-6 flex items-center gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0 text-sm text-[var(--foreground-soft)]">
        Hermes data not found{path ? ` at ${path}` : ""}. Point the dashboard at your Hermes folder
        to load sessions and usage.
      </div>
      <Link
        href="/setup"
        className="shrink-0 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors"
      >
        Open Setup
        <ArrowRight className="h-3 w-3" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
