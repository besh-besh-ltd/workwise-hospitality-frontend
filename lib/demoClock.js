/**
 * The demo's clock.
 *
 * Every fixture in data/ihg tells one story set in August 2026: POs raised
 * 7–13 Aug, an ISO certificate that lapsed on 28 Jun ("47 days ago"), a vendor
 * subscription that lapses on 23 Aug, RFQs closing in September. Screens work
 * out "waiting 3 days", "ending soon" and "overdue" from the browser's clock,
 * so on any real date the numbers drift away from the story.
 *
 * In demo mode the browser's Date is shifted by whole days so that today is
 * DEMO_TODAY. The time of day is kept, so greetings and "2h ago" still read
 * naturally. Everything that reads the clock — screens, the mock API, moment —
 * then agrees with the fixtures.
 *
 * Mock fixtures that need "today" should import DEMO_TODAY rather than
 * hard-coding a date.
 */
export const DEMO_TODAY = "2026-08-14";

const DAY = 24 * 60 * 60 * 1000;

export const installDemoClock = () => {
  if (typeof window === "undefined" || window.__demoClock) return;
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return;

  const RealDate = window.Date;
  const realNow = RealDate.now();
  // Local midnight today vs local midnight on DEMO_TODAY: a whole-day offset.
  const today = new RealDate(realNow);
  const realMidnight = new RealDate(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y, m, d] = DEMO_TODAY.split("-").map(Number);
  const demoMidnight = new RealDate(y, m - 1, d).getTime();
  const offset = Math.round((demoMidnight - realMidnight) / DAY) * DAY;

  class DemoDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...args);
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  DemoDate.parse = RealDate.parse;
  DemoDate.UTC = RealDate.UTC;

  window.Date = DemoDate;
  window.__demoClock = { today: DEMO_TODAY, offsetDays: offset / DAY };
};

installDemoClock();

export default installDemoClock;
