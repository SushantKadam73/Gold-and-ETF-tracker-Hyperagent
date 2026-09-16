/** SGB math: coupon calendar, maturity countdown, premium to gold, YTM (pre/post-tax). Pure functions. */

export interface SgbTranche {
  _id?: any;
  series: string;
  isin: string;
  nseSymbol?: string | null;
  issueDate: string;
  issueDateTs: number;
  issuePrice: number;       // ₹/gram at issue
  maturityDateTs: number;
  firstPrematureTs: number; // 5y mark
  couponRate: number;       // 0.025
  redemptionPrice?: number | null;
  status: string;           // 'trading' | 'matured'
}

const HALF_YEAR_MS = 0.5 * 365.25 * 24 * 3600 * 1000;

/** Next semi-annual coupon date after `now` (coupons paid on issue-date anniversary every 6 months). */
export function nextCouponDate(t: SgbTranche, now = Date.now()): number | null {
  if (t.status === "matured") return null;
  let d = t.issueDateTs;
  while (d <= now) d += HALF_YEAR_MS;
  return d > t.maturityDateTs ? t.maturityDateTs : d;
}

/** All remaining coupon dates from `now` to maturity. */
export function remainingCoupons(t: SgbTranche, now = Date.now()): number[] {
  if (t.status === "matured") return [];
  const out: number[] = [];
  let d = t.issueDateTs;
  while (d <= now) d += HALF_YEAR_MS;
  while (d <= t.maturityDateTs) { out.push(d); d += HALF_YEAR_MS; }
  return out;
}

/** Days until maturity (negative if past). */
export function daysToMaturity(t: SgbTranche, now = Date.now()): number {
  return Math.round((t.maturityDateTs - now) / (24 * 3600 * 1000));
}

/** Whether the tranche is currently inside a premature-redemption window (>=5y, not yet matured). */
export function inPrematureWindow(t: SgbTranche, now = Date.now()): boolean {
  return t.status !== "matured" && now >= t.firstPrematureTs && now < t.maturityDateTs;
}

/** Premium/discount of the traded price to the gold reference (₹/gram), in %. null if unavailable. */
export function premiumToGold(ltp: number | null | undefined, goldRefPerGram: number | null | undefined): number | null {
  if (ltp == null || ltp <= 0 || goldRefPerGram == null || goldRefPerGram <= 0) return null;
  return ((ltp - goldRefPerGram) / goldRefPerGram) * 100;
}

/** Absolute price return since issue, in %. */
export function returnSinceIssue(ltp: number | null | undefined, issuePrice: number): number | null {
  if (ltp == null || ltp <= 0 || !issuePrice) return null;
  return ((ltp - issuePrice) / issuePrice) * 100;
}

/**
 * Yield to maturity (annualised %), gold-flat assumption: redemption at the gold reference
 * price plus all remaining coupons, discounted from the current price. null if not computable.
 * postTax: applies coupon tax at slab + 12.5% LTCG on redemption gain for secondary buyers.
 */
export function ytm(
  t: SgbTranche,
  ltp: number,
  goldRefPerGram: number,
  opts: { slabPct?: number; secondaryBuyer?: boolean } = {},
  now = Date.now()
): number | null {
  if (t.status === "matured" || ltp <= 0 || goldRefPerGram <= 0) return null;
  const slab = (opts.slabPct ?? 30) / 100;
  const coupons = remainingCoupons(t, now);
  const couponAmt = (t.issuePrice * t.couponRate) / 2; // semi-annual
  const afterTaxCoupon = couponAmt * (1 - slab);
  let redemptionGain = goldRefPerGram - ltp;
  const redemptionTax = opts.secondaryBuyer && redemptionGain > 0 ? redemptionGain * 0.125 : 0;
  const redemptionNet = goldRefPerGram - redemptionTax;

  // cash flows: buy at -ltp now, then coupons, then redemption at maturity
  const flows: Array<{ ts: number; amt: number }> = [{ ts: now, amt: -ltp }];
  for (const c of coupons) flows.push({ ts: c, amt: afterTaxCoupon });
  flows.push({ ts: t.maturityDateTs, amt: redemptionNet });

  // solve XIRR by bisection
  const years = (ts: number) => (ts - now) / (365.25 * 24 * 3600 * 1000);
  const npv = (rate: number) => flows.reduce((s, f) => s + f.amt / Math.pow(1 + rate, years(f.ts)), 0);
  let lo = -0.99, hi = 5;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  const r = (lo + hi) / 2;
  return isFinite(r) ? r * 100 : null;
}
