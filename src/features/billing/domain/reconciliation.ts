const DAY_MS = 24 * 60 * 60 * 1000;
// The golden ratio: the starts of consecutive days spread evenly over the rows,
// however many there are and however few a run gets through.
const DAILY_STEP = (Math.sqrt(5) - 1) / 2;

// The rows of the daily reconciliation, starting at another place every day and
// going round to the end. A run cut short always stops at the same distance
// from its start, so a fixed start would leave the same rows unseen for good. A
// run that reaches one row in n has seen them all after about n runs (five
// runs for a quarter), with nothing kept between two runs. The order of the
// rows themselves must not change from day to day.
export function rotateForDay<T>(rows: readonly T[], now: Date): T[] {
  const day = Math.floor(now.getTime() / DAY_MS);
  const start = Math.floor(rows.length * ((day * DAILY_STEP) % 1));
  return [...rows.slice(start), ...rows.slice(0, start)];
}

// Of the time left to the job: the rest is the second pass's, which runs
// whether or not the first one got to the end. Half, so a last row that takes
// the whole timeout of its Stripe request still leaves time for it.
const ROWS_SHARE = 0.5;

export function rowsDeadline(now: number, deadline: number): number {
  if (now >= deadline) return deadline;
  return now + (deadline - now) * ROWS_SHARE;
}
