import scanFeedback, { MUTE_KEY } from "../scanFeedback";

// jsdom has neither Web Audio nor vibration; stand-ins record what was played.
function installFakes() {
  const tones = [];
  class FakeOscillator {
    constructor() {
      this.frequency = { setValueAtTime: (hz) => tones.push(hz) };
      this.type = "sine";
    }
    connect() {}
    start() {}
    stop() {}
  }
  class FakeGain {
    constructor() {
      this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
    }
    connect() {}
  }
  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
      this.destination = {};
    }
    createOscillator() { return new FakeOscillator(); }
    createGain() { return new FakeGain(); }
    resume() { return Promise.resolve(); }
  }
  window.AudioContext = FakeAudioContext;
  const vibrate = jest.fn();
  Object.defineProperty(window.navigator, "vibrate", { value: vibrate, configurable: true });
  return { tones, vibrate };
}

describe("scanFeedback", () => {
  afterEach(() => {
    window.localStorage.clear();
    delete window.AudioContext;
  });

  it("beeps and buzzes; mute silences the beep but keeps the buzz, and is remembered", () => {
    const { tones, vibrate } = installFakes();
    scanFeedback.unlock();

    scanFeedback.success();
    expect(tones.length).toBe(1);
    expect(vibrate).toHaveBeenLastCalledWith(35);

    scanFeedback.error();
    expect(tones.length).toBe(3); // two low tones
    expect(tones[1]).toBeLessThan(tones[0]);

    scanFeedback.setMuted(true);
    expect(window.localStorage.getItem(MUTE_KEY)).toBe("1");
    expect(scanFeedback.isMuted()).toBe(true);
    scanFeedback.success();
    expect(tones.length).toBe(3);
    expect(vibrate).toHaveBeenCalledTimes(3);

    scanFeedback.setMuted(false);
    expect(scanFeedback.isMuted()).toBe(false);
  });

  it("is a no-op where the browser has no audio or vibration", () => {
    Object.defineProperty(window.navigator, "vibrate", { value: undefined, configurable: true });
    expect(() => {
      scanFeedback.unlock();
      scanFeedback.success();
      scanFeedback.error();
    }).not.toThrow();
  });
});
