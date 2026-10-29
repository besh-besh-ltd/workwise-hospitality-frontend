// Keyboard support for the tab strips (setup tabs, adjustment status tabs):
// one tab stop for the strip (roving tabindex), arrows move and select,
// Home / End jump to the ends (WAI-ARIA tabs pattern, automatic activation).

/** tabIndex for a tab: only the selected one is in the tab order. */
export const tabIndexFor = (selected) => (selected ? 0 : -1);

/**
 * onKeyDown for a tab. `values` are the tabs' values in order, `current` the
 * selected one, `select(value)` makes a tab current.
 */
export const onTabKeyDown = (e, values, current, select) => {
  const i = Math.max(0, values.indexOf(current));
  let next = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % values.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + values.length) % values.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = values.length - 1;
  if (next === null) return;
  e.preventDefault();
  select(values[next]);
  const tabs = e.currentTarget.closest('[role="tablist"]')?.querySelectorAll('[role="tab"]');
  tabs?.[next]?.focus();
};
