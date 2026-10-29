import { useEffect } from "react";

// Ref-counted per flag, so two components asking for the same flag (a route
// transition, say) only drop it when the last one unmounts.
const counts = {};

/**
 * Adds `flag` as a class on <body> while the calling component is mounted.
 * Used to let globally mounted floating layers (the assistant button) react
 * to what the current page has pinned to the bottom of the screen.
 */
export default function useBodyFlag(flag, active = true) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return undefined;
    counts[flag] = (counts[flag] || 0) + 1;
    document.body.classList.add(flag);
    return () => {
      counts[flag] = Math.max(0, (counts[flag] || 1) - 1);
      if (counts[flag] === 0) document.body.classList.remove(flag);
    };
  }, [flag, active]);
}
