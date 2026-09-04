// Real-time duplicate checking (UM-1).
//
// The property that matters beyond "it calls the endpoint" is that a slow
// answer for an earlier keystroke cannot land after a fast answer for a later
// one and mark a perfectly good address taken.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/Auth", () => ({ checkIdentity: jest.fn() }));

import { renderHook, act, waitFor } from "@testing-library/react";
import { checkIdentity } from "@/services/Auth";
import useIdentityAvailability from "./useIdentityAvailability";

const free = { data: { email: { taken: false }, mobile: { taken: false } } };
const taken = { data: { email: { taken: true }, mobile: { taken: true } } };

beforeEach(() => checkIdentity.mockReset());

describe("useIdentityAvailability", () => {
  it("reports an address that is already in use", async () => {
    checkIdentity.mockResolvedValue(taken);
    const { result } = renderHook(() => useIdentityAvailability({ delay: 0 }));

    act(() => result.current.check("email", "priya@example.com"));
    await waitFor(() => expect(result.current.status.email?.state).toBe("taken"));
  });

  it("reports a free one", async () => {
    checkIdentity.mockResolvedValue(free);
    const { result } = renderHook(() => useIdentityAvailability({ delay: 0 }));

    act(() => result.current.check("email", "nobody@example.com"));
    await waitFor(() => expect(result.current.status.email?.state).toBe("free"));
  });

  it("clears when the field is emptied, and asks nothing", async () => {
    const { result } = renderHook(() => useIdentityAvailability({ delay: 0 }));
    act(() => result.current.check("email", "   "));
    expect(result.current.status.email).toBeNull();
    expect(checkIdentity).not.toHaveBeenCalled();
  });

  it("ignores an answer that has been overtaken", async () => {
    // "priya@" is still in flight when "priya@example.com" resolves. If the
    // stale answer were allowed to land, a valid address would be shown as
    // taken and the admin would change something that was already correct.
    let resolveFirst;
    checkIdentity
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce(free);

    const { result } = renderHook(() => useIdentityAvailability({ delay: 0 }));

    act(() => result.current.check("email", "priya@"));
    await waitFor(() => expect(checkIdentity).toHaveBeenCalledTimes(1));
    act(() => result.current.check("email", "priya@example.com"));
    await waitFor(() => expect(result.current.status.email?.state).toBe("free"));

    await act(async () => {
      resolveFirst(taken);
    });
    expect(result.current.status.email?.state).toBe("free");
  });

  it("stays quiet when the check itself fails", async () => {
    // The server checks again on submit. A courtesy that cannot answer must
    // not block the form or claim an address is taken.
    checkIdentity.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useIdentityAvailability({ delay: 0 }));

    act(() => result.current.check("email", "priya@example.com"));
    await waitFor(() => expect(result.current.status.email).toBeNull());
  });

  it("does not flag a user against their own details", async () => {
    checkIdentity.mockResolvedValue(free);
    const { result } = renderHook(() =>
      useIdentityAvailability({ excludeUserId: 467, delay: 0 })
    );

    act(() => result.current.check("email", "priya@example.com"));
    await waitFor(() =>
      expect(checkIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ exclude_user_id: 467 })
      )
    );
  });
});
