"use client";

import { use } from "react";
import {
  formatINR, istDateTime, istTime, premiumVsInav, premiumVsNav, spreadPct, pctClass,
} from "../../../lib/format";
import { useEtfDetail } from "../../../lib/useData";

export default function EtfDetailPage({ params }: { params: Promise<{ isin: string }> }) {
  const { isin } = use(params);
  const data = useEtfDetail(isin);

  if (data === undefined) return <p className="py-20 text-center text-sm text-zinc-500">Loading…</p>;
  if (data === null) return <p className="py-20 text-center text-sm text-zinc-500">Backend not connected yet.</p>;

  const { etf, quote, inav, nav, metrics } = data as any;
  const now = Date.now();
  const ltp = quote?.ltp ?? null;
  const pInav = premiumVsInav(ltp, inav?.inav ?? null, quote?.sourceTs, inav?.sourceTs, quote?.lastTradeTime, now);
  const pNav = premiumVsNav(ltp, nav?.nav ?? null, now);
  const spread = spreadPct(quote?.bidPrice, quote?.askPrice);
  const te = (metrics ?? []).filter((m: any) => m.type === "tracking_error").slice(-1)[0];
  const tds = (metrics ?? []).filter((m: any) => m.type === "tracking_difference");

  return (
    <div className="space-y-6">
      <div>
        <a href="/" className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">← All ETFs</a>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{etf.schemeName}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {etf.amcName} · {etf.nseSymbol} · ISIN {etf.isin} · {etf.metal === "gold" ? "Gold" : "Silver"}
          {etf.bseSymbol ? ` · BSE: ${etf.bseSymbol}` : " · NSE only"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Last traded price"
          value={formatINR(ltp)}
          sub={quote?.sourceTs ? `NSE · ${istTime(quote.sourceTs)}` : "—"}
        />
        <StatCard
          title="iNAV (indicative)"
          value={formatINR(inav?.inav)}
          sub={inav?.sourceTs ? `NSE · ${istTime(inav.sourceTs)}` : "—"}
        />
        <StatCard
          title="NAV (end-of-day)"
          value={formatINR(nav?.nav)}
          sub={nav?.navDate ? `AMFI · EOD ${nav.navDate}` : "—"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <PremiumCard title="Price vs iNAV" result={pInav} />
        <PremiumCard title="Price vs NAV" result={pNav} />
        <StatCard
          title="Bid / Ask spread"
          value={spread == null ? "—" : `${spread.toFixed(2)}%`}
          sub={
            quote?.bidPrice != null && quote?.askPrice != null
              ? `${formatINR(quote.bidPrice)} / ${formatINR(quote.askPrice)}`
              : "depth unavailable"
          }
        />
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Tracking
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                Tracking error
                <InfoTip text="How faithfully the fund follows its benchmark day to day — the volatility of the daily fund-vs-benchmark return gap, annualized. Lower is closer; SEBI caps it at 2%." />
              </span>
              <span className="tabular-nums font-medium">
                {te?.value != null ? `${te.value.toFixed(2)}%` : "not published"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{te?.asOfDate ? `as of ${te.asOfDate} · ${te.benchmark ?? ""}` : "AMFI, weekdays"}</p>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                Tracking difference
                <InfoTip text="How much the fund actually gained or lagged versus its benchmark over 1/3/5/10 years and since launch — roughly the fund's costs. Closer to zero is better." />
              </span>
            </div>
            <ul className="mt-1 space-y-0.5 text-sm">
              {["1y", "3y", "5y", "10y", "since_launch"].map((p) => {
                const m = tds.find((x: any) => x.period === p);
                return (
                  <li key={p} className="flex justify-between tabular-nums">
                    <span className="text-zinc-500 dark:text-zinc-400">{p === "since_launch" ? "Since launch" : p.toUpperCase()}</span>
                    <span className="font-medium">{m?.value != null ? `${m.value.toFixed(2)}%` : "—"}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-xs text-zinc-400">{tds[0]?.asOfDate ? `as of ${tds[0].asOfDate} · AMFI, monthly` : "AMFI, monthly"}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        Unit convention: ~{etf.gramsPerUnit} g per unit{etf.faceValueNote ? ` (${etf.faceValueNote})` : ""}.
        Values normalized internally to ₹/gram for comparison.
      </p>
    </div>
  );
}

function StatCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-400">{sub}</div> : null}
    </div>
  );
}

function PremiumCard({ title, result }: { title: string; result: ReturnType<typeof premiumVsInav> }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</div>
      {result.suppressed ? (
        <>
          <div className="mt-1 text-2xl font-semibold text-zinc-400">—</div>
          <div className="mt-1 text-xs text-zinc-400">
            {result.asOf ? `as of ${result.asOf}` : "suppressed — data not aligned"}
          </div>
        </>
      ) : (
        <>
          <div className={`mt-1 text-2xl font-semibold tabular-nums ${pctClass(result.pct)}`}>
            {result.pct! >= 0 ? "+" : ""}{result.pct!.toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-zinc-400">{result.pct! >= 0 ? "trading at a premium" : "trading at a discount"}</div>
        </>
      )}
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-block cursor-help align-middle text-zinc-400">
      ⓘ
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 w-64 -translate-x-1/2 rounded-md border border-zinc-200 bg-white p-2 text-xs font-normal normal-case text-zinc-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {text}
      </span>
    </span>
  );
}
