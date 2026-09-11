import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BsBuilding, BsPeople, BsShieldExclamation, BsArrowLeftRight,
  BsExclamationTriangle, BsDiagram3,
} from "react-icons/bs";
import { getHospitalityCompanies } from "@/services/hospitality";
import { getCompanyUsersDetailed } from "@/services/Auth";
import { getStuckApprovals, getApprovalDelegations } from "@/services/approval";
import { getActivityFacets } from "@/services/activity";
import styles from "./AdminOverview.module.css";

/**
 * What an administrator needs to know on opening the module.
 *
 * `/dashboard/admin` used to render the buyer's procurement dashboard
 * verbatim — the wrong audience, and blank besides: every widget on it ANDs a
 * role-scope predicate requiring `rfq.read`, and an administrator holds
 * `company.admin` and nothing else. Seven cards of zeros, no error, no
 * explanation. The company that prompted the report has no RFQs at all, so
 * even a correctly-scoped procurement dashboard would have been empty for it.
 *
 * These are administrator questions instead — the estate, the people, and the
 * things that need somebody today — and they come from endpoints that are
 * already scoped server-side from the caller's own company.
 *
 * Each panel is fetched independently and degrades on its own. They answer
 * different questions from different endpoints; one 403 must not blank the
 * page, which is the failure mode this screen exists to replace.
 */

const EM_DASH = "—";

/** A number that has not arrived, or could not be fetched, is not a zero. */
const show = (value) => (value === null || value === undefined ? EM_DASH : value.toLocaleString());

const Tile = ({ id, icon: Icon, label, value, hint, href, tone }) => {
  const body = (
    <>
      <span className={`${styles.tileIcon} ${tone ? styles[`tone_${tone}`] : ""}`}>
        <Icon size={16} />
      </span>
      <span className={styles.tileBody}>
        <span className={styles.tileValue} data-testid={`tile-${id}`}>{show(value)}</span>
        <span className={styles.tileLabel}>{label}</span>
        {hint && <span className={styles.tileHint}>{hint}</span>}
      </span>
    </>
  );

  return href ? (
    <Link href={href} className={styles.tile}>{body}</Link>
  ) : (
    <div className={styles.tile}>{body}</div>
  );
};

const AdminOverview = () => {
  const [company, setCompany] = useState(null);
  const [units, setUnits] = useState(null);
  const [people, setPeople] = useState(null);
  const [stuck, setStuck] = useState(null);
  const [cover, setCover] = useState(null);
  const [critical, setCritical] = useState(null);

  const load = useCallback(async () => {
    // Settled, not all — see the class comment. Each of these is allowed to
    // fail without taking the others with it.
    const [companies, staff, stuckRes, coverRes, facets] = await Promise.allSettled([
      getHospitalityCompanies({ include: "hotels" }),
      getCompanyUsersDetailed({ limit: 1 }),
      getStuckApprovals(),
      getApprovalDelegations(),
      getActivityFacets(),
    ]);

    if (companies.status === "fulfilled") {
      const list = companies.value?.data?.data || companies.value?.data || [];
      const first = Array.isArray(list) ? list[0] : null;
      setCompany(first || null);
      setUnits(Array.isArray(list) ? list.reduce((n, c) => n + (c.hotels?.length || 0), 0) : null);
    }

    if (staff.status === "fulfilled") {
      const stats = staff.value?.data?.stats;
      setPeople(stats ? stats.total_count : null);
    }

    if (stuckRes.status === "fulfilled") {
      setStuck(stuckRes.value?.data?.counts || null);
    }

    if (coverRes.status === "fulfilled") {
      const rows = coverRes.value?.data?.data || coverRes.value?.data || [];
      // Cover that is running now. "Ever arranged" is a different question and
      // not one anybody opens this page to ask.
      setCover(Array.isArray(rows) ? rows.filter((r) => r.is_active).length : null);
    }

    if (facets.status === "fulfilled") {
      const severities = facets.value?.data?.severities || [];
      const row = severities.find((s) => s.severity === "critical");
      setCritical(row ? Number(row.count) : 0);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Only true once the numbers that could demand action have arrived and are
  // all zero. Unknowns are not quiet — they are unknown.
  const quiet = useMemo(
    () => stuck !== null && critical !== null && stuck.blocked === 0 && stuck.waiting === 0 && critical === 0,
    [stuck, critical]
  );

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>{company?.name || "Your company"}</h1>
        <p className={styles.subtitle}>
          Everything you administer, and anything waiting on you.
        </p>
      </header>

      {quiet && (
        <div className={styles.quiet}>
          Nothing needs your attention right now — no blocked approvals, nobody
          waiting, and no critical activity in the last 30 days.
        </div>
      )}

      <div className={styles.tiles}>
        <Tile
          id="blocked" icon={BsShieldExclamation} tone="danger"
          label="Approvals nobody can act on"
          hint="Every approver removed or deactivated"
          value={stuck ? stuck.blocked : null}
          href="/dashboard/admin/approvals?view=stuck&class=blocked"
        />
        <Tile
          id="waiting" icon={BsDiagram3} tone="warn"
          label="Approvals waiting on a person"
          value={stuck ? stuck.waiting : null}
          href="/dashboard/admin/approvals?view=stuck&class=waiting"
        />
        <Tile
          id="critical" icon={BsExclamationTriangle} tone="warn"
          label="Critical activity"
          hint="Last 30 days"
          value={critical}
          href="/dashboard/admin/activity?severity=critical"
        />
        <Tile
          id="units" icon={BsBuilding}
          label="Business units"
          value={units}
          href="/dashboard/admin/hospitality-manager"
        />
        <Tile
          id="people" icon={BsPeople}
          label="People"
          value={people}
          href="/dashboard/admin/account-management/manage-accounts"
        />
        <Tile
          id="cover" icon={BsArrowLeftRight}
          label="Cover running now"
          hint="Someone approving on another's behalf"
          value={cover}
          href="/dashboard/admin/approvals?view=cover"
        />
      </div>
    </section>
  );
};

export default AdminOverview;
