const router = { isReady: true, query: {}, asPath: "/", replace: jest.fn() };
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => router }));
jest.mock("@/services/inventory", () => ({ __esModule: true, resolveShortLink: jest.fn() }));
let token = "jwt";
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { getStorage: (key) => (key === "token" ? token : null) },
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { resolveShortLink } from "@/services/inventory";
import ShortLinkRedirect from "../ShortLinkRedirect";

const open = (t, id) => {
  router.query = { t, id };
  router.asPath = `/s/${t}/${id}`;
  return render(<ShortLinkRedirect />);
};

beforeEach(() => {
  jest.clearAllMocks();
  token = "jwt";
  router.isReady = true;
});

describe("ShortLinkRedirect (/s/<t>/<id>)", () => {
  it("a signed-in user is sent to the screen the server names", async () => {
    resolveShortLink.mockResolvedValueOnce({ path: "/dashboard/buyer/inventory/stock/46/12" });
    open("i", "12");
    expect(screen.getByText(/Opening/)).toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard/buyer/inventory/stock/46/12"));
    expect(resolveShortLink).toHaveBeenCalledWith("i", 12);
  });

  it("a signed-out visitor goes to sign-in and comes back here", async () => {
    token = null;
    open("i", "12");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/?redirect=%2Fs%2Fi%2F12"));
    expect(resolveShortLink).not.toHaveBeenCalled();
  });

  it("an id the server will not open, or a malformed link, reads Not found", async () => {
    resolveShortLink.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { status: 2, message: "Link not found" } },
    });
    const { unmount } = open("g", "999");
    expect(await screen.findByRole("heading", { name: "Not found" })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    unmount();

    for (const [t, id] of [["x", "1"], ["i", "abc"], ["i", "0"]]) {
      const view = open(t, id);
      expect(await screen.findByRole("heading", { name: "Not found" })).toBeInTheDocument();
      view.unmount();
    }
    // Only the well-formed link went to the server.
    expect(resolveShortLink.mock.calls).toEqual([["g", 999]]);
  });

  it("never follows a path that is not a dashboard route", async () => {
    for (const path of [
      "//evil.example/x",
      "/\t/evil.example", // browsers drop the tab: //evil.example
      "/\\evil.example",
      "https://evil.example/dashboard/buyer/x",
      "/dashboard/buyer/../../logout",
      "/dashboard/buyer/inventory/grn/1\n",
      "/admin/users",
      "",
      null,
    ]) {
      resolveShortLink.mockResolvedValueOnce({ path });
      const view = open("p", "7");
      expect(await screen.findByRole("heading", { name: "Not found" })).toBeInTheDocument();
      view.unmount();
    }
    expect(router.replace).not.toHaveBeenCalled();

    for (const path of ["/dashboard/buyer/purchase-orders/7?tab=deliveries", "/dashboard/buyer/inventory/receive/7?dispatch=3"]) {
      resolveShortLink.mockResolvedValueOnce({ path });
      const view = open("p", "7");
      await waitFor(() => expect(router.replace).toHaveBeenLastCalledWith(path));
      view.unmount();
    }
  });

  it("waits for the router before deciding", () => {
    router.isReady = false;
    open(undefined, undefined);
    expect(resolveShortLink).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Not found" })).not.toBeInTheDocument();
  });
});
