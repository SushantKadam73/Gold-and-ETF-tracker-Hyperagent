"use client";

import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";

/**
 * Safe data hooks using explicit function-path references ("module:function").
 * This avoids any dependence on the shape of convex/_generated/api — the
 * reference is the literal path the backend registers, so a stale or wrong
 * generated api object can no longer cause 'function not found' errors.
 * useQuery throws when there's no ConvexProvider, so we gate on the backend URL.
 */
const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;

const dashboardRef = makeFunctionReference<"query", Record<string, never>, any[]>(
  "functions:dashboard"
) as any;
const etfDetailRef = makeFunctionReference<"query", { isin: string }, any>(
  "functions:etfDetail"
) as any;

export function useDashboard(): any[] | undefined | null {
  if (!hasBackend) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useQuery(dashboardRef, {});
}

export function useEtfDetail(isin: string): any | undefined | null {
  if (!hasBackend) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useQuery(etfDetailRef, { isin });
}
