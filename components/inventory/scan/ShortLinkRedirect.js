import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, SearchX, WifiOff } from "lucide-react";
import { resolveShortLink } from "@/services/inventory";
import storageInstance from "@/utils/storageInstance";
import styles from "./Scan.module.scss";

// /s/<t>/<id>: where a printed QR label (or a phone's camera app) lands.
// t: i stock item, p purchase order, g goods receipt, d dispatch.
//
// Signed out → sign in first, then back here (/?redirect=/s/<t>/<id>).
// Signed in  → GET /inventory/s/resolve, and replace this page with the
//              screen the server names. The server decides scope: anything
//              missing or outside the user's hotels is 404, shown as Not found.

const KINDS = new Set(["i", "p", "g", "d"]);

const isLocalPath = (path) => typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");

const ShortLinkRedirect = () => {
  const router = useRouter();
  const { t, id } = router.query;
  const [state, setState] = useState("opening");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!router.isReady) return undefined;
    const kind = typeof t === "string" ? t.toLowerCase() : "";
    const num = typeof id === "string" && /^\d{1,15}$/.test(id) ? Number(id) : 0;
    if (!KINDS.has(kind) || !(num > 0)) {
      setState("not_found");
      return undefined;
    }
    if (!storageInstance.getStorage("token")) {
      router.replace(`/?redirect=${encodeURIComponent(`/s/${kind}/${num}`)}`);
      return undefined;
    }

    let live = true;
    setState("opening");
    resolveShortLink(kind, num)
      .then((res) => {
        if (!live) return;
        if (isLocalPath(res?.path)) router.replace(res.path);
        else setState("not_found");
      })
      .catch((err) => {
        if (!live) return;
        const status = err?.response?.status ?? err?.message?.response?.status;
        setState(status === 403 || status === 404 || status === 400 ? "not_found" : "failed");
      });
    return () => {
      live = false;
    };
    // `router` is a new object on every render in Next; the inputs are the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, t, id, attempt]);

  return (
    <main className={styles.landing}>
      <div className={styles.landingCard}>
        {state === "opening" && (
          <>
            <Loader2 size={22} className={`${styles.spin} ${styles.landingIcon}`} aria-hidden="true" />
            <p className={styles.landingText} role="status">
              Opening…
            </p>
          </>
        )}
        {state === "not_found" && (
          <>
            <SearchX size={22} className={styles.landingIcon} aria-hidden="true" />
            <h1 className={styles.landingTitle}>Not found</h1>
            <p className={styles.landingText}>
              This label points to something that no longer exists, or that is not shared with your hotels.
            </p>
            <a className={`${styles.btn} ${styles.btnSecondary}`} href="/dashboard/buyer/inventory">
              Go to Inventory
            </a>
          </>
        )}
        {state === "failed" && (
          <>
            <WifiOff size={22} className={styles.landingIcon} aria-hidden="true" />
            <h1 className={styles.landingTitle}>Could not open this link</h1>
            <p className={styles.landingText}>Check the connection and try again.</p>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
};

export default ShortLinkRedirect;
