"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useEffect } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // theme init + toggle (no flash)
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", dark);
    const btn = document.getElementById("theme-toggle");
    const onClick = () => {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    };
    btn?.addEventListener("click", onClick);
    return () => btn?.removeEventListener("click", onClick);
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
