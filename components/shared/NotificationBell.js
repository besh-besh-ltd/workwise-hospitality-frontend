import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaBell } from "react-icons/fa";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/services/Notifications";
import storageInstance from "@/utils/storageInstance";

const POLL_MS = 30 * 1000;

const formatRelative = (iso) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const NotificationBell = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);
  const prevCountRef = useRef(null);
  const audioCtxRef = useRef(null);

  const isLoggedIn = () => {
    if (typeof window === "undefined") return false;
    return !!storageInstance.getStorage("token");
  };

  const playChime = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const tone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.18, now + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration + 0.02);
      };
      tone(880, 0, 0.16);    // A5
      tone(1320, 0.09, 0.22); // E6
    } catch (_) {}
  }, []);

  const refreshCount = useCallback(async () => {
    if (!isLoggedIn()) return;
    try {
      const resp = await getUnreadCount();
      const c = resp && resp.data && resp.data.count;
      setCount(Number(c) || 0);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      playChime();
    }
    prevCountRef.current = count;
  }, [count, playChime]);

  const loadList = useCallback(async () => {
    if (!isLoggedIn()) return;
    setLoading(true);
    try {
      const resp = await listNotifications(1, 20);
      setItems(Array.isArray(resp?.data) ? resp.data : []);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshCount();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refreshCount);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const handleItemClick = async (n) => {
    if (!n.is_read) {
      setItems((curr) => curr.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)));
      setCount((c) => Math.max(0, c - 1));
      markNotificationRead(n.id).catch(() => {});
    }
    setOpen(false);
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

  const handleMarkAllRead = async () => {
    if (count === 0) return;
    setCount(0);
    setItems((curr) => curr.map((x) => ({ ...x, is_read: 1 })));
    try {
      await markAllNotificationsRead();
    } catch (_) {
      refreshCount();
    }
  };

  if (!isLoggedIn()) return null;

  return (
    <div ref={rootRef} style={{ position: "relative", marginRight: 8 }}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        title="Notifications"
        style={{
          background: "transparent",
          border: 0,
          padding: 8,
          cursor: "pointer",
          position: "relative",
          color: "#374151"
        }}
      >
        <FaBell size={18} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 0,
              background: "#EF4444",
              color: "white",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              lineHeight: "16px",
              textAlign: "center"
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 480,
            overflow: "auto",
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            zIndex: 1000
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: "1px solid #F3F4F6",
              position: "sticky",
              top: 0,
              background: "#fff"
            }}
          >
            <div style={{ fontWeight: 600, color: "#111827" }}>Notifications</div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={count === 0}
              style={{
                background: "transparent",
                border: 0,
                color: count === 0 ? "#9CA3AF" : "#3B82F6",
                cursor: count === 0 ? "default" : "pointer",
                fontSize: 12,
                fontWeight: 600
              }}
            >
              Mark all read
            </button>
          </div>

          {loading && (
            <div style={{ padding: 16, color: "#6B7280", fontSize: 14 }}>Loading…</div>
          )}

          {!loading && items.length === 0 && (
            <div style={{ padding: 24, color: "#6B7280", fontSize: 14, textAlign: "center" }}>
              No notifications yet.
            </div>
          )}

          {!loading &&
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
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
                    marginTop: 6,
                    background: n.is_read ? "transparent" : "#3B82F6",
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>
                    {n.title}
                  </div>
                  {n.message && (
                    <div
                      style={{
                        color: "#4B5563",
                        fontSize: 13,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical"
                      }}
                    >
                      {n.message}
                    </div>
                  )}
                  <div style={{ color: "#9CA3AF", fontSize: 11, marginTop: 4 }}>
                    {formatRelative(n.created_at)}
                  </div>
                </div>
              </button>
            ))}

          {items.length >= 4 && (
            <div
              style={{
                padding: 10,
                textAlign: "center",
                borderTop: "1px solid #F3F4F6",
                position: "sticky",
                bottom: 0,
                background: "#fff"
              }}
            >
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                style={{ color: "#3B82F6", fontSize: 13, fontWeight: 600 }}
              >
                View all
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
