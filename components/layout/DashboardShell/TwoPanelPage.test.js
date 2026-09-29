import React, { useLayoutEffect, useState } from "react";
import "@testing-library/jest-dom";
import { render, screen, act, fireEvent } from "@testing-library/react";
import TwoPanelPage from "./TwoPanelPage";
import { TwoPanelContext, useTwoPanelHost } from "./TwoPanelContext";

// A host with the real shell-side hook, counting its own renders. The
// technical-evaluation page crashed with "Maximum update depth exceeded"
// because every page render pushed a new sidebar element into shell state.
let hostRenders = 0;
const Host = ({ children }) => {
  hostRenders += 1;
  const { ctx, hasSubSidebar, subSidebarRef, mobileRfqToggle } = useTwoPanelHost();
  return (
    <TwoPanelContext.Provider value={ctx}>
      {mobileRfqToggle && (
        <button type="button" onClick={mobileRfqToggle.callback}>
          {mobileRfqToggle.isOpen ? "Close Sidebar" : mobileRfqToggle.label}
        </button>
      )}
      {hasSubSidebar && <div data-testid="slot" ref={subSidebarRef} />}
      {children}
    </TwoPanelContext.Provider>
  );
};

// A page that re-renders itself many times from layout effects (as the tech
// evaluation page does while it loads) with a fresh sidebar element and a
// fresh inline toggle every time.
const BusyPage = ({ bursts = 30 }) => {
  const [n, setN] = useState(0);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    if (n < bursts) setN(n + 1);
  }, [n, bursts]);
  return (
    <TwoPanelPage
      title="Technical Evaluation"
      sidebar={<div data-testid="sidebar">renders {n}</div>}
      onMobileSidebarToggle={() => setOpen((v) => !v)}
      mobileSidebarOpen={open}
      mobileToggleLabel="Select RFQ"
    >
      body
    </TwoPanelPage>
  );
};

beforeEach(() => {
  hostRenders = 0;
});

describe("TwoPanelPage", () => {
  it("page re-renders do not re-render the shell (no update-depth loop)", () => {
    render(
      <Host>
        <BusyPage bursts={30} />
      </Host>
    );
    // Slot registration + node + toggle publish: a handful, never one per page render.
    expect(hostRenders).toBeLessThanOrEqual(5);
    expect(screen.getByTestId("sidebar")).toHaveTextContent("renders 30");
  });

  it("renders the sidebar inside the shell's slot and keeps it current", () => {
    render(
      <Host>
        <BusyPage bursts={3} />
      </Host>
    );
    const slot = screen.getByTestId("slot");
    expect(slot).toContainElement(screen.getByTestId("sidebar"));
    expect(screen.getByTestId("sidebar")).toHaveTextContent("renders 3");
  });

  it("the mobile toggle calls the latest handler and reflects open state", () => {
    render(
      <Host>
        <BusyPage bursts={1} />
      </Host>
    );
    const btn = screen.getByRole("button", { name: "Select RFQ" });
    act(() => {
      fireEvent.click(btn);
    });
    expect(screen.getByRole("button", { name: "Close Sidebar" })).toBeInTheDocument();
  });

  it("unmounting the page removes the slot", () => {
    const { rerender } = render(
      <Host>
        <BusyPage bursts={1} />
      </Host>
    );
    expect(screen.getByTestId("slot")).toBeInTheDocument();
    rerender(<Host>{null}</Host>);
    expect(screen.queryByTestId("slot")).toBeNull();
    expect(screen.queryByRole("button", { name: "Select RFQ" })).toBeNull();
  });

  it("a page without a sidebar never opens a slot", () => {
    render(
      <Host>
        <TwoPanelPage title="Plain">body</TwoPanelPage>
      </Host>
    );
    expect(screen.queryByTestId("slot")).toBeNull();
  });
});
