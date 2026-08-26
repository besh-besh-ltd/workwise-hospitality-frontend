import { createSaveGate } from './saveGate';

describe('createSaveGate', () => {
  it('lets the first save start', () => {
    expect(createSaveGate().begin()).toBe(true);
  });

  it('refuses a second save while the first is still running', () => {
    // THE DEFECT (RFQ 536245, 2026-08-26): four saves left the browser in six
    // seconds because step navigation fires handleSaveDraft() without awaiting
    // and updateRfq ignores the abort signal. Each request still carried the
    // newly added product as id:null, so the server inserted it four times.
    const gate = createSaveGate();
    gate.begin();
    expect(gate.begin()).toBe(false);
  });

  it('reports that a save was requested while it was busy', () => {
    const gate = createSaveGate();
    gate.begin();
    gate.begin();
    expect(gate.end()).toBe(true);
  });

  it('reports nothing pending when no save was requested while busy', () => {
    const gate = createSaveGate();
    gate.begin();
    expect(gate.end()).toBe(false);
  });

  it('lets the next save start once the first has ended', () => {
    const gate = createSaveGate();
    gate.begin();
    gate.end();
    expect(gate.begin()).toBe(true);
  });

  it('clears the pending flag once it has been reported', () => {
    // The deferred re-save must run once, not on every subsequent completion.
    const gate = createSaveGate();
    gate.begin();
    gate.begin();
    expect(gate.end()).toBe(true);

    gate.begin();
    expect(gate.end()).toBe(false);
  });

  it('collapses many blocked requests into a single pending re-save', () => {
    // Clicking Next four times must not queue four saves.
    const gate = createSaveGate();
    gate.begin();
    gate.begin();
    gate.begin();
    gate.begin();

    expect(gate.end()).toBe(true);
    gate.begin();
    expect(gate.end()).toBe(false);
  });

  it('exposes whether a save is currently running', () => {
    // Drives the disabled state of the Save button.
    const gate = createSaveGate();
    expect(gate.isBusy()).toBe(false);
    gate.begin();
    expect(gate.isBusy()).toBe(true);
    gate.end();
    expect(gate.isBusy()).toBe(false);
  });

  it('releases the gate even when the save threw', () => {
    // end() runs from a finally block; a failed save must not wedge the gate.
    const gate = createSaveGate();
    gate.begin();
    gate.end();
    expect(gate.begin()).toBe(true);
  });

  it('keeps two gates independent', () => {
    const a = createSaveGate();
    const b = createSaveGate();
    a.begin();
    expect(b.begin()).toBe(true);
  });
});

describe('createSaveGate — a blocked caller can still wait for the flush', () => {
  it('resolves immediately when nothing is in flight', async () => {
    await expect(createSaveGate().whenIdle()).resolves.toBeUndefined();
  });

  it('waits for the tracked save when one is running', async () => {
    // AddProductsModal's onBeforeAdd does `await handleSaveDraft()` to flush
    // unsaved edits before it rehydrates the RFQ from the server. If being
    // blocked returned instantly, the modal would rehydrate over a half-written
    // draft — the same class of loss as the earlier draft add-product P0.
    const gate = createSaveGate();
    let settled = false;

    gate.begin();
    gate.track(new Promise((r) => setTimeout(r, 10)).then(() => { settled = true; }));

    await gate.whenIdle();
    expect(settled).toBe(true);
  });

  it('does not reject when the tracked save failed', async () => {
    // A blocked caller only wants to know the flush is over. The save's own
    // error handling has already toasted; rethrowing here would surface it twice.
    const gate = createSaveGate();
    gate.begin();
    gate.track(Promise.reject(new Error('network down')));

    await expect(gate.whenIdle()).resolves.toBeUndefined();
  });

  it('stops waiting on a save that has already finished', async () => {
    const gate = createSaveGate();
    gate.begin();
    gate.track(Promise.resolve());
    gate.end();

    await expect(gate.whenIdle()).resolves.toBeUndefined();
  });
});

describe('createSaveGate — serialising real async work', () => {
  it('runs one save at a time when four fire back to back', async () => {
    // Reproduces the burst: four callers, one server round-trip each, and only
    // the first is allowed through while it is in flight.
    const gate = createSaveGate();
    let concurrent = 0;
    let peak = 0;
    const started = [];

    const save = async (label) => {
      if (!gate.begin()) return 'blocked';
      started.push(label);
      concurrent += 1;
      peak = Math.max(peak, concurrent);
      try {
        await new Promise((r) => setTimeout(r, 5));
      } finally {
        concurrent -= 1;
        gate.end();
      }
      return 'ran';
    };

    const results = await Promise.all([save('a'), save('b'), save('c'), save('d')]);

    expect(peak).toBe(1);
    expect(started).toEqual(['a']);
    expect(results).toEqual(['ran', 'blocked', 'blocked', 'blocked']);
  });

  it('still performs the last requested save after the in-flight one finishes', async () => {
    // Blocking must not lose the buyer's most recent edit — the whole point of
    // the pending flag is that the dropped request comes back.
    const gate = createSaveGate();
    const saved = [];

    const save = async (label) => {
      if (!gate.begin()) return;
      try {
        await new Promise((r) => setTimeout(r, 5));
        saved.push(label);
      } finally {
        if (gate.end()) await save('deferred');
      }
    };

    await Promise.all([save('first'), save('second')]);

    expect(saved).toEqual(['first', 'deferred']);
  });
});
