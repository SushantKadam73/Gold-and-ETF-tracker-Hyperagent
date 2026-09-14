"use client";

import { useQuery, ConvexProvider, ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Safe data hooks. useQuery throws when there's no ConvexProvider, so we detect
 * whether a backend URL is configured and return null (render a placeholder) instead.
 * Once NEXT_PUBLIC_CONVEX_URL is set, the provider mounts and these return live data.
 */
const hasBackend = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export function useDashboard(): any[] | undefined | null {
  if (!hasBackend) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useQuery(api.functions.dashboard);
}

export function useEtfDetail(isin: string): any | undefined | null {
  if (!hasBackend) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useQuery(api.functions.etfDetail, { isin });
}
