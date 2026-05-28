import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/services/Notifications";
import storageInstance from "@/utils/storageInstance";

const PAGE_SIZE = 20;

const formatTime = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch (_) {
    return iso;
  }
};

const NotificationsPage = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const fetchPage = useCallback(async (p) => {
    setLoading(true);
    try {
      const resp = await listNotifications(p, PAGE_SIZE);
      const next = Array.isArray(resp?.data) ? resp.data : [];
      setItems((curr) => (p === 1 ? next : [...curr, ...next]));
      if (next.length < PAGE_SIZE) setDone(true);
    } catch (_) {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = storageInstance.getStorage("token");
    if (!token) {
      router.replace("/");
      return;
    }
    fetchPage(1);
  }, [fetchPage, router]);

  const handleItemClick = async (n) => {
    if (!n.is_read) {
      setItems((curr) => curr.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.action_url) {
      try {
        const url = new URL(n.action_url, window.location.origin);
        if (url.origin === window.location.origin) {
          router.push(url.pathname + url.search + url.hash);
        } else {
          window.location.href = n.action_url;
        }
      } catch (_) {
        router.push(n.action_url);
      }
    }
  };

  const handleMarkAll = async () => {
    setItems((curr) => curr.map((x) => ({ ...x, is_read: 1 })));
    try {
      await markAllNotificationsRead();
    } catch (_) {}
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  };

  return (
    <>
      <Head>
        <title>Notifications — Workwise</title>
      </Head>
      <div style={{ maxWidth: 720, margin: "32px auto", padding: "0 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
            Notifications
          </h1>
          <button
            type="button"
            onClick={handleMarkAll}
            style={{
              background: "transparent",
              border: "1px solid #D1D5DB",
              color: "#374151",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600
            }}
          >
            Mark all read
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            overflow: "hidden"
          }}
        >
          {items.length === 0 && !loading && (
            <div style={{ padding: 32, textAlign: "center", color: "#6B7280" }}>
              You have no notifications yet.
            </div>
          )}

          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleItemClick(n)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                width: "100%",
                textAlign: "left",
                padding: "14px 16px",
                background: n.is_read ? "#fff" : "#EFF6FF",
                border: 0,
                borderBottom: "1px solid #F3F4F6",
                cursor: "pointer"
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  marginTop: 8,
                  background: n.is_read ? "transparent" : "#3B82F6",
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#111827" }}>{n.title}</div>
                {n.message && (
                  <div style={{ color: "#4B5563", fontSize: 14, marginTop: 4 }}>
                    {n.message}
                  </div>
                )}
                <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 6 }}>
                  {formatTime(n.created_at)}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          {!done && items.length > 0 && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              style={{
                background: "#3B82F6",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "8px 18px",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
                fontWeight: 600
              }}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
          {done && items.length > 0 && (
            <div style={{ color: "#9CA3AF", fontSize: 12 }}>You're all caught up.</div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;
