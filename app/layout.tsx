import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

export const metadata: Metadata = {
  title: "Gold & Silver ETF Tracker",
  description:
    "Premium/discount vs iNAV and NAV for Indian gold & silver ETFs, plus an ETF-vs-physical cost calculator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ConvexClientProvider>
          <div className="mx-auto max-w-6xl px-4 py-6">
            <Header />
            <main>{children}</main>
            <Footer />
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Gold &amp; Silver ETF Tracker</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Is your ETF trading at a premium or a discount to its real value?
        </p>
      </div>
      <nav className="flex items-center gap-4 text-sm">
        <a href="/" className="hover:underline">Dashboard</a>
        <a href="/calculator" className="hover:underline">ETF vs Physical</a>
        <ThemeToggle />
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <p>
        NAV: AMFI (end-of-day). Prices &amp; iNAV: delayed, for information only — not investment advice.
        Values carry their own source timestamps. No account needed; calculator inputs stay in your browser.
      </p>
    </footer>
  );
}

function ThemeToggle() {
  return (
    <button
      id="theme-toggle"
      aria-label="Toggle theme"
      className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
      // toggling handled in a tiny client island below
    >
      ◐ Theme
    </button>
  );
}
