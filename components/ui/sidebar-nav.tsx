"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Key, MessageSquare, Zap, Box } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/providers", label: "Providers", icon: Zap },
  { href: "/instances", label: "Instances", icon: Box },
  { href: "/config", label: "API Keys", icon: Key },
  { href: "/sessions", label: "Sessions", icon: MessageSquare },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-2 space-y-0.5">
      {navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm group cursor-pointer"
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/25"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon
              className={`relative h-4 w-4 transition-colors ${
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
              }`}
            />
            <span
              className={`relative transition-colors ${
                active
                  ? "text-[var(--foreground)] font-medium"
                  : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </span>
            {active && (
              <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
