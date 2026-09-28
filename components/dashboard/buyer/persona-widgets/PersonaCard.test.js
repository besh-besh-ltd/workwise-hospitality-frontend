jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/components/shared/InfoTip", () => {
  const InfoTip = () => null;
  InfoTip.displayName = "InfoTip";
  return InfoTip;
});

import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PersonaCard from "./PersonaCard";

const flush = () => act(async () => {});

const renderCard = (fetcher, props = {}) =>
  render(
    <PersonaCard title="My drafts" filters={{ _refresh: 0 }} fetcher={fetcher} {...props}>
      {(d) => <div data-testid="body">{d.count}</div>}
    </PersonaCard>
  );

describe("PersonaCard", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("renders the payload through the render prop", async () => {
    const fetcher = jest.fn().mockResolvedValue({ status: 1, data: { count: 4 } });
    renderCard(fetcher);
    await flush();
    expect(screen.getByTestId("body")).toHaveTextContent("4");
  });

  it("analytics cards (no `poll`) never refetch on a timer", async () => {
    const fetcher = jest.fn().mockResolvedValue({ status: 1, data: { count: 1 } });
    renderCard(fetcher);
    await flush();
    await act(async () => jest.advanceTimersByTime(5 * 60 * 1000));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("queue cards (`poll`) refetch every 60s", async () => {
    const fetcher = jest.fn().mockResolvedValue({ status: 1, data: { count: 1 } });
    renderCard(fetcher, { poll: true });
    await flush();
    await act(async () => jest.advanceTimersByTime(60000));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("a failed first load shows an error with Retry", async () => {
    const fetcher = jest.fn().mockRejectedValue({ message: "Nope" });
    renderCard(fetcher);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("Nope");
    fetcher.mockResolvedValue({ status: 1, data: { count: 2 } });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await flush();
    expect(screen.getByTestId("body")).toHaveTextContent("2");
  });

  it("a failed refresh keeps the figures and shows a stale notice", async () => {
    const fetcher = jest.fn().mockResolvedValue({ status: 1, data: { count: 7 } });
    const { rerender } = renderCard(fetcher);
    await flush();
    fetcher.mockRejectedValue({ message: "Nope" });
    rerender(
      <PersonaCard title="My drafts" filters={{ _refresh: 1 }} fetcher={fetcher}>
        {(d) => <div data-testid="body">{d.count}</div>}
      </PersonaCard>
    );
    await flush();
    expect(screen.getByTestId("body")).toHaveTextContent("7");
    expect(screen.getByRole("status")).toHaveTextContent(/couldn't refresh/i);
  });
});
