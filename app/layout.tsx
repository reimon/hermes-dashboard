import type { Metadata } from "next";
import "./globals.css";
import { Terminal } from "lucide-react";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { SetupBanner } from "@/components/ui/setup-banner";

export const metadata: Metadata = {
  title: "Hermes Dashboard",
  description: "Local dashboard for Hermes Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="relative flex h-screen overflow-hidden bg-grain">
        {/* Aurora background */}
        <div className="aurora" aria-hidden />

        {/* Sidebar */}
        <aside className="relative z-10 w-60 border-r border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl flex flex-col shrink-0">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[var(--accent)] to-emerald-700 shadow-[0_0_20px_var(--accent-glow)]">
                <Terminal className="h-4 w-4 text-[var(--accent-foreground)]" strokeWidth={2.5} />
                <span className="absolute -bottom-px left-1/2 -translate-x-1/2 h-px w-6 bg-gradient-to-r from-transparent via-[var(--accent-soft)] to-transparent" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-wide">Hermes</span>
                <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.14em]">
                  Local Dashboard
                </span>
              </div>
            </div>
          </div>

          <SidebarNav />

          <div className="p-3 border-t border-[var(--border)]">
            <a
              href="https://hermes-agent.nousresearch.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors group cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              hermes-agent.nousresearch.com
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="relative z-10 flex-1 overflow-y-auto">
          <div className="px-8 py-7 max-w-[1400px]">
            <SetupBanner />
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
