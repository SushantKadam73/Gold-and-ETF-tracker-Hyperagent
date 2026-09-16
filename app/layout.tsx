import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ErrorBoundary } from "./ErrorBoundary";

export const metadata: Metadata = {
  title: "Gold & Silver ETF Tracker",
  description:
    "Premium/discount vs iNAV and NAV for Indian gold & silver ETFs, plus an ETF-vs-physical cost calculator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-[#0b0b0d] dark:text-zinc-100">
        <ConvexClientProvider>
          <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
            <Header />
            <main className="pt-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <Footer />
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-zinc-200/80 bg-zinc-50/80 px-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#0b0b0d]/80 sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-4">
        <a href="/" className="group flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-yellow-600 text-sm font-bold text-zinc-950 shadow-sm">
            ◆
          </span>
          <span>
            <span className="block text-[15px] font-semibold tracking-tight leading-tight">
              Gold &amp; Silver ETF Tracker
            </span>
            <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
              Premium / discount vs real value · India
            </span>
          </span>
        </a>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/">ETFs</NavLink>
          <NavLink href="/sgb">SGB</NavLink>
          <NavLink href="/calculator">ETF vs Physical</NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
    >
      {children}
    </a>
  );
}

function Footer() {
  return (
    <footer className="mt-14 border-t border-zinc-200 pt-5 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
      <p>
        NAV: AMFI (end-of-day). Prices, iNAV &amp; MCX references: delayed, for information only — not
        investment advice. Values carry their own source timestamps. No account needed; calculator inputs
        stay in your browser.
      </p>
    </footer>
  );
}

function ThemeToggle() {
  return (
    <button
      id="theme-toggle"
      aria-label="Toggle theme"
      className="ml-1 rounded-md border border-zinc-300 px-2 py-1.5 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200/60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
    >
      ◐
    </button>
  );
}
