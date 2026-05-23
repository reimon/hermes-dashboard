import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { BarChart3, Key, MessageSquare, Terminal, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Hermes Dashboard",
  description: "Local dashboard for Hermes Agent",
};

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/providers", label: "Providers", icon: Zap },
  { href: "/config", label: "API Keys", icon: Key },
  { href: "/sessions", label: "Sessions", icon: MessageSquare },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-[var(--border)] bg-[var(--card)] flex flex-col shrink-0">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-[var(--accent)]" />
              <span className="font-semibold text-sm tracking-wide">Hermes</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
              Local Dashboard
            </p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)] transition-colors"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t border-[var(--border)]">
            <a
              href="https://hermes-agent.nousresearch.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              hermes-agent.nousresearch.com
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </body>
    </html>
  );
}
