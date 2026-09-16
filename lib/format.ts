/** Shared formatting + premium/suppression logic. Pure functions, usable on client and server. */

export const IST = "Asia/Kolkata";

export function formatINR(n: number | null | undefined, decimals = 2): string {
  if (n == null || !isFinite(n) || n <= 0) return "—"; // 0 / negative treated as missing
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Indian numbering for large quantities: lakhs / crores. */
export function formatIndianCount(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e7) return (n / 1e7).toFixed(2) + " Cr";
  if (abs >= 1e5) return (n / 1e5).toFixed(2) + " L";
  return n.toLocaleString("en-IN");
}

export function formatCrores(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return "₹" + (n / 1e7).toFixed(2) + " Cr";
}

export function istTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false }) + " IST";
}

export function istDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", { timeZone: IST, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) + " IST";
}

/* ------------------------- premium / suppression ------------------------- */

export interface PremiumResult {
  pct: number | null; // null = suppressed
  suppressed: boolean;
  reason?: string;
  label: string; // e.g. 'vs iNAV' or 'vs NAV (EOD)'
  asOf?: string;
}

const STALE_TRADE_MS = 15 * 60 * 1000; // 15 min default last-trade age threshold

function isMarketHours(ts: number): boolean {
  const ist = new Date(new Date(ts).toLocaleString("en-US", { timeZone: IST }));
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return day >= 1 && day <= 5 && mins >= 555 && mins <= 930; // 09:15–15:30
}

/** Premium vs iNAV: shown only intraday with same-day, fresh quote + iNAV. */
export function premiumVsInav(
  ltp: number | null | undefined,
  inav: number | null | undefined,
  quoteTs: number | null | undefined,
  inavTs: number | null | undefined,
  lastTradeTs: number | null | undefined,
  now = Date.now()
): PremiumResult {
  const label = "vs iNAV";
  if (ltp == null || ltp <= 0 || inav == null || inav <= 0) return { pct: null, suppressed: true, reason: "missing", label };
  if (!quoteTs || !inavTs) return { pct: null, suppressed: true, reason: "no_timestamp", label };
  const sameDay =
    new Date(quoteTs).toDateString() === new Date(now).toDateString() &&
    new Date(inavTs).toDateString() === new Date(now).toDateString();
  if (!isMarketHours(now) || !sameDay) {
    return { pct: null, suppressed: true, reason: "market_closed", label, asOf: istTime(inavTs) };
  }
  if (lastTradeTs && now - lastTradeTs > STALE_TRADE_MS) {
    return { pct: null, suppressed: true, reason: "stale_trade", label, asOf: istTime(lastTradeTs) };
  }
  return { pct: ((ltp - inav) / inav) * 100, suppressed: false, label };
}

/** Premium vs last NAV: shown when NAV is the previous trading day; labelled EOD. */
export function premiumVsNav(
  ltp: number | null | undefined,
  nav: number | null | undefined,
  now = Date.now()
): PremiumResult {
  const label = "vs NAV (EOD)";
  if (ltp == null || ltp <= 0 || nav == null || nav <= 0) return { pct: null, suppressed: true, reason: "missing", label };
  return { pct: ((ltp - nav) / nav) * 100, suppressed: false, label };
}

export function spreadPct(bid: number | null | undefined, ask: number | null | undefined): number | null {
  if (bid == null || ask == null || bid <= 0 || ask <= 0 || ask < bid) return null;
  const mid = (bid + ask) / 2;
  return ((ask - bid) / mid) * 100;
}

export function pctClass(pct: number | null): string {
  if (pct == null) return "text-zinc-400";
  if (pct > 0.15) return "text-amber-600 dark:text-amber-400"; // trading at premium
  if (pct < -0.15) return "text-blue-600 dark:text-blue-400"; // discount
  return "text-emerald-600 dark:text-emerald-400"; // near par
}
