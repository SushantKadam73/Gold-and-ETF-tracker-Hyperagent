"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatINR, istTime, premiumVsInav, premiumVsNav, spreadPct, pctClass,
} from "../lib/format";
import { useDashboard } from "../lib/useData";

export default function DashboardPage() {
  const rows = useDashboard();

  if (rows === undefined) {
    return <p className="py-20 text-center text-sm text-zinc-500">Loading ETFs…</p>;
  }
  if (rows === null) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        <p>Backend not connected yet.</p>
        <p className="mt-2 text-xs">Set NEXT_PUBLIC_CONVEX_URL and seed the universe to load live data.</p>
      </div>
    );
  }

  const gold = rows.filter((r: any) => r.etf.metal === "gold");
  const silver = rows.filter((r: any) => r.etf.metal === "silver");

  return (
    <div className="space-y-8">
      <MarketNote />
      <Section title="Gold ETFs" rows={gold} />
      <Section title="Silver ETFs" rows={silver} />
    </div>
  );
}

function MarketNote() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      Prices and iNAV are delayed. Premium vs iNAV shows only during market hours with fresh data;
      otherwise you see the value’s own “as of” time and no percentage.
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: any[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title} <span className="ml-1 font-normal text-zinc-400">({rows.length})</span>
      </h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">ETF</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">iNAV</th>
              <th className="px-3 py-2 text-right font-medium">NAV (EOD)</th>
              <th className="px-3 py-2 text-right font-medium">vs iNAV</th>
              <th className="px-3 py-2 text-right font-medium">vs NAV</th>
              <th className="px-3 py-2 text-right font-medium">Spread</th>
              <th className="px-3 py-2 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <Row key={r.etf._id} r={r} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ r }: { r: any }) {
  const now = Date.now();
  const ltp = r.quote?.ltp ?? null;
  const inav = r.inav?.inav ?? null;
  const nav = r.nav?.nav ?? null;
  const pInav = premiumVsInav(ltp, inav, r.quote?.sourceTs, r.inav?.sourceTs, r.quote?.lastTradeTime, now);
  const pNav = premiumVsNav(ltp, nav, now);
  const spread = spreadPct(r.quote?.bidPrice, r.quote?.askPrice);
  const updated = r.quote?.sourceTs ?? r.nav?.navDateTs ?? null;

  return (
    <tr className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/60">
      <td className="px-3 py-2">
        <Link href={`/etf/${r.etf.isin}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
          {r.etf.nseSymbol}
        </Link>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{r.etf.schemeName}</div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatINR(ltp)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatINR(inav)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatINR(nav)}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${pctClass(pInav.pct)}`}>
        {pInav.suppressed ? <span className="text-xs text-zinc-400">{pInav.asOf ? `as of ${pInav.asOf}` : "—"}</span> : `${pInav.pct!.toFixed(2)}%`}
      </td>
      <td className={`px-3 py-2 text-right tabular-nums ${pctClass(pNav.pct)}`}>
        {pNav.pct == null ? "—" : `${pNav.pct.toFixed(2)}%`}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
        {spread == null ? "—" : `${spread.toFixed(2)}%`}
      </td>
      <td className="px-3 py-2 text-right text-xs text-zinc-400">{updated ? istTime(updated) : "—"}</td>
    </tr>
  );
}
