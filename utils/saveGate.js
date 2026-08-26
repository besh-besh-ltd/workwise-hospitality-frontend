/**
 * A one-slot gate around an async save.
 *
 * The Edit RFQ wizard fires `handleSaveDraft()` from several places that do not
 * await it — most importantly step navigation, which saves in the background on
 * every Next/step-jump while `hasUnsavedChanges` is set. `updateRfq` also has no
 * cancellation: the abort controller in `handleSaveDraft` supersedes the
 * *client's* wait, but every request it started still reaches the server and
 * still commits.
 *
 * On 2026-08-26 a buyer added one product to RFQ 536245 and clicked through the
 * wizard. Four saves left the browser in six seconds. None of them had seen the
 * post-save refetch yet, so all four still described the new product as
 * `id: null` and the server inserted it four times. Worse, `getFullRfqForEdit`
 * takes no row lock, so the last of those transactions read a snapshot that
 * predated the others and deleted the two products they had just created —
 * along with 226 vendor mappings.
 *
 * The gate makes that impossible: at most one save is in flight, and a request
 * that arrives while one is running is remembered rather than dropped, so the
 * buyer's latest edit is still written once the first save lands.
 *
 * Deliberately not a promise queue. A deferred save must re-enter through the
 * *current* render's closure — `rfqProductsFromStore` is a `useSelector` value,
 * not a ref, so replaying a captured callback would resend the stale product
 * list this gate exists to stop.
 */
export const createSaveGate = () => {
  let busy = false;
  let pending = false;
  let inFlight = null;

  return {
    /** True while a save is in flight — drives the Save button's disabled state. */
    isBusy: () => busy,

    /**
     * Record the promise of the save that just claimed the slot, so a caller
     * that gets blocked can still wait for the flush to finish.
     */
    track(promise) {
      inFlight = promise;
    },

    /**
     * Resolves once the in-flight save has settled — or immediately if none is
     * running. Never rejects: a blocked caller only needs to know the flush is
     * over, and the save's own catch has already reported the failure.
     *
     * `AddProductsModal`'s `onBeforeAdd` is the caller that needs this. It
     * awaits the save specifically so the buyer's unsaved edits are persisted
     * before the modal rehydrates the RFQ from the server; returning early on a
     * blocked call would let it rehydrate over a half-written draft.
     */
    whenIdle() {
      return busy && inFlight ? inFlight.then(() => {}, () => {}) : Promise.resolve();
    },

    /**
     * Claim the slot. Returns false when a save is already running, in which
     * case the request is recorded and `end()` will report it.
     */
    begin() {
      if (busy) {
        pending = true;
        return false;
      }
      busy = true;
      return true;
    },

    /**
     * Release the slot. Returns true when at least one save was requested while
     * this one was running, meaning the caller should save once more. Call from
     * a `finally` so a failed save never wedges the gate.
     */
    end() {
      busy = false;
      inFlight = null;
      const hadPending = pending;
      pending = false;
      return hadPending;
    },
  };
};
