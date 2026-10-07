/* A visible keyboard-focus ring for react-select controls. The library's
 * default ring is overridden by global styles in places, and a faint shadow
 * reads as "no focus" — QA could not find focus on the dashboard's product
 * selector or business-unit filter. Merge into a `control` style fn. */
export const FOCUS_RING = "0 0 0 2px rgba(37, 99, 235, 0.35)";
export const FOCUS_BORDER = "#2563eb";

export const withFocusRing = (base, state, rest = {}) => ({
  ...base,
  ...rest,
  borderColor: state?.isFocused ? FOCUS_BORDER : rest.borderColor ?? base?.borderColor,
  boxShadow: state?.isFocused ? FOCUS_RING : rest.boxShadow ?? base?.boxShadow,
});

export default withFocusRing;
