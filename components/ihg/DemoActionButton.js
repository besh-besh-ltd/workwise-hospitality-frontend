import React, { useState } from "react";
import { Send, Loader2, Check, LockOpen, ClipboardCheck } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/lib/axios";

/**
 * The two controls that stand in for time passing.
 *
 * This build has no vendor side and no clock, so two things that would happen
 * over days never happen at all: suppliers never answer, and the bid deadline
 * never arrives. Both leave the buyer stuck on a screen with nothing to do.
 * These buttons collapse each wait into a press.
 *
 * The pause before the result is deliberate — an outcome landing on the same
 * tick as the click reads as a page refresh, not as something happening.
 */

const VARIANTS = {
  publish: {
    path: (id) => `/rfq/demo-publish/${id}`,
    icon: Send,
    labels: { idle: "Publish now", busy: "Inviting suppliers…", done: "Quotes received" },
    fallback: "Quotes received",
    error: "Could not publish this RFQ.",
  },
  completeTechnical: {
    path: (id) => `/rfq/demo-complete-technical/${id}`,
    icon: ClipboardCheck,
    labels: { idle: "Complete technical evaluation", busy: "Scoring\u2026", done: "Quotes unmasked" },
    fallback: "Technical evaluation complete — quotes are now visible",
    error: "Could not complete the technical evaluation.",
  },
  closeBidding: {
    path: (id) => `/rfq/demo-close-bidding/${id}`,
    icon: LockOpen,
    labels: { idle: "Close bidding now", busy: "Closing bidding…", done: "Quotes unlocked" },
    fallback: "Bidding closed — quotes are now visible",
    error: "Could not close bidding on this RFQ.",
  },
};

const DemoActionButton = ({ rfqId, variant = "publish", size = "sm", onDone, className = "" }) => {
  const [state, setState] = useState("idle"); // idle | busy | done
  const cfg = VARIANTS[variant] || VARIANTS.publish;

  const run = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (state !== "idle") return;
    setState("busy");
    try {
      const res = await axiosInstance.post(cfg.path(rfqId));
      await new Promise((r) => setTimeout(r, 1400));
      setState("done");
      toast.success(res?.message || cfg.fallback);
      // Let the tick register before the screen reloads under it.
      setTimeout(() => {
        if (onDone) onDone(res);
        else window.location.reload();
      }, 650);
    } catch (_) {
      setState("idle");
      toast.error(cfg.error);
    }
  };

  const Icon = { idle: cfg.icon, busy: Loader2, done: Check }[state];

  return (
    <button
      type="button"
      className={`btn btn-primary btn-${size} ${className}`}
      onClick={run}
      disabled={state !== "idle"}
      title={
        variant === "closeBidding"
          ? "Skip to the bid deadline so the quotes become visible"
          : variant === "completeTechnical"
            ? "Sign off the technical evaluation so the commercial quotes unmask"
            : "Publish to the approved suppliers and collect their quotes"
      }
    >
      <Icon
        size={13}
        strokeWidth={2}
        style={state === "busy" ? { animation: "ihgSpin 0.9s linear infinite" } : undefined}
      />{" "}
      {cfg.labels[state]}
      <style jsx global>{`
        @keyframes ihgSpin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
};

export default DemoActionButton;
