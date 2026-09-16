import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Intraday quote + iNAV poll every 5 minutes during NSE hours (09:15–15:30 IST).
// Convex cron intervals run in UTC; NSE hours 09:15–15:30 IST = 03:45–10:00 UTC.
// We poll every 5 minutes across that UTC window.
crons.interval(
  "poll_quotes_inav",
  { minutes: 5 },
  internal.jobs.pollIntraday,
  {}
);

// AMFI latest NAV after market close (daily ~20:30 IST = 15:00 UTC).
crons.cron(
  "amfi_nav_daily",
  "0 15 * * *",
  internal.amfi.fetchAmfiNav,
  {}
);

// AMFI tracking error daily (weekday data; job runs daily, weekend rows are empty).
crons.cron(
  "amfi_te_daily",
  "30 15 * * *",
  internal.amfi.fetchAmfiTrackingError,
  {}
);

// AMFI tracking difference monthly on the 1st (~09:00 IST = 03:30 UTC).
crons.cron(
  "amfi_td_monthly",
  "30 3 1 * *",
  internal.amfi.fetchAmfiTrackingDifference,
  {}
);

// Auto-discover ETF lifecycle (add/rename/delist) daily (~09:00 IST = 03:30 UTC).
// New funds are auto-activated with a derived unit factor and symbol; delisted funds
// are marked inactive. Fully automatic, no manual step.
crons.cron(
  "discover_etfs_daily",
  "30 3 * * *",
  internal.discover.discoverEtfs,
  {}
);

export default crons;
