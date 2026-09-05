import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";
import brand from "@/data/ihg/brand";
import { people, properties, company } from "@/data/ihg/org";
import { COOKIE_NAME, readSessionToken } from "@/lib/session";
import { seedBrowserSession } from "@/lib/ihgSession";
import BrandLogo from "@/components/ihg/BrandLogo";
import styles from "@/styles/login.module.css";

export default function Login() {
  const router = useRouter();
  // Defaults to the sourcing desk — the persona the demo is usually driven from.
  const [personaId, setPersonaId] = useState(people[1]?.id || people[0]?.id);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const selected = people.find((p) => p.id === personaId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign you in.");
        setBusy(false);
        return;
      }
      // The forked portal decides "am I logged in" from localStorage and a
      // Redux profile, so seed both before navigating — otherwise the shell
      // renders its signed-out state on arrival.
      seedBrowserSession(selected);
      const next = typeof router.query.next === "string" ? router.query.next : "/dashboard/buyer";
      // Full navigation, so the gated page is fetched with the fresh cookie
      // and the app boots with storage already populated.
      window.location.href = next.startsWith("/") ? next : "/dashboard/buyer";
    } catch (_) {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`Sign in · ${brand.clientShortName} ${brand.productName}`}</title>
        <meta name="description" content={`${brand.clientName} procurement portal`} />
      </Head>

      <div className={styles.page}>
        {/* ── the arrival ── */}
        <aside className={styles.brandPanel}>
          <div>
            <div className={`${styles.brandTop} ${styles.reveal}`} style={{ animationDelay: "40ms" }}>
              <BrandLogo height={24} tone="light" />
              <span className={styles.rule} />
              <span className={styles.eyebrow}>{brand.login.eyebrow}</span>
            </div>

            <h1 className={`${styles.display} ${styles.reveal}`} style={{ animationDelay: "120ms" }}>
              {brand.login.headline}
            </h1>

            <p className={`${styles.tagline} ${styles.reveal}`} style={{ animationDelay: "170ms" }}>
              {brand.login.tagline}
            </p>

            <p className={`${styles.subhead} ${styles.reveal}`} style={{ animationDelay: "230ms" }}>
              {brand.login.subhead}
            </p>

            {/* The site's proof band. Also does layout work: without it the
                panel's middle is a large empty field of navy. */}
            <div className={`${styles.stats} ${styles.reveal}`} style={{ animationDelay: "300ms" }}>
              {brand.login.stats.map((s) => (
                <div key={s.label} className={styles.stat}>
                  <div className={styles.statValue}>{s.value}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.plaque} ${styles.reveal}`} style={{ animationDelay: "300ms" }}>
            <div className={styles.plaqueHead}>Properties in scope · {company.region}</div>
            {properties.map((p) => (
              <div key={p.id} className={styles.plaqueRow}>
                <span className={styles.plaqueName}>{p.name}</span>
                <span className={styles.plaqueDots} />
                <span className={styles.plaqueCity}>{p.city}</span>
              </div>
            ))}
            <div className={styles.brandFoot}>{brand.poweredBy}</div>
          </div>
        </aside>

        {/* ── the work ── */}
        <main className={styles.formPanel}>
          <div className={`${styles.card} ${styles.reveal}`} style={{ animationDelay: "180ms" }}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Sign in</h2>
              <p className={styles.cardSub}>
                Choose who you&apos;re signing in as — the portal changes with the role.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <span className={styles.fieldLabel}>Signing in as</span>
              <div className={styles.personas} role="radiogroup" aria-label="Choose a role">
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={p.id === personaId}
                    className={`${styles.persona} ${p.id === personaId ? styles.personaOn : ""}`}
                    onClick={() => setPersonaId(p.id)}
                  >
                    <span className={styles.avatar}>{p.initials}</span>
                    <span className={styles.personaText}>
                      <span className={styles.personaName}>{p.name}</span>
                      <span className={styles.personaTitle}>{p.title}</span>
                    </span>
                  </button>
                ))}
              </div>

              {selected && <p className={styles.personaBlurb}>{selected.blurb}</p>}

              <button type="submit" className={styles.submit} disabled={busy}>
                {busy ? (
                  "Signing in…"
                ) : (
                  <>
                    Enter the portal
                    <ArrowRight size={15} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginLeft: 6 }} />
                  </>
                )}
              </button>

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}
            </form>

            <p className={styles.footnote}>{brand.login.footnote}</p>
          </div>
        </main>
      </div>
    </>
  );
}

/** Already signed in? Skip the arrival and go straight through. */
export async function getServerSideProps(ctx) {
  const session = await readSessionToken(ctx.req.cookies?.[COOKIE_NAME]);
  if (session) {
    return { redirect: { destination: "/dashboard/buyer", permanent: false } };
  }
  return { props: {} };
}
