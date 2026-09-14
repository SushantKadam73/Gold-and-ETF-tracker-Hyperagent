"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Intraday poll orchestrator: only runs during NSE market hours (09:15–15:30 IST, Mon–Fri).
 * Convex crons fire in UTC; we gate here so off-hours invocations are no-ops.
 */
export const pollIntraday = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = ist.getDay(); // 0 Sun .. 6 Sat
    const mins = ist.getHours() * 60 + ist.getMinutes();
    const marketOpen = 9 * 60 + 15; // 09:15
    const marketClose = 15 * 60 + 35; // 15:35 buffer past close
    const isWeekday = day >= 1 && day <= 5;
    const inHours = mins >= marketOpen && mins <= marketClose;
    if (!isWeekday || !inHours) {
      return { ok: true, skipped: "market_closed" };
    }
    const quotes = await ctx.runAction(internal.ingest.fetchUpstoxQuotes, {});
    const inav = await ctx.runAction(internal.ingest.fetchNseInav, {});
    return { ok: true, quotes, inav };
  },
});
