import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PlanEditor from "../PlanEditor";

const poLines = [
  { id: 11, productName: "Basmati rice", unit: "kg", orderedQty: 10 },
  { id: 12, productName: "Olive oil", unit: "litre", orderedQty: 6 },
];
const A1 = { id: 1, name: "Hotel A-1" };
const A2 = { id: 2, name: "Hotel A-2" };
const A3 = { id: 3, name: "Hotel A-3" };

const delivery = (over = {}) => ({
  id: 1, hotelId: 1, hotelName: "Hotel A-1", phaseNo: 1, dueDate: null, status: "open", remarks: null,
  overdue: false, hasReceipts: false,
  lines: [
    { id: 101, poLineId: 11, productName: "Basmati rice", unit: "kg", plannedQty: 10 },
    { id: 102, poLineId: 12, productName: "Olive oil", unit: "litre", plannedQty: 6 },
  ],
  ...over,
});

const qty = (product, label) => screen.getByRole("textbox", { name: `${product} for ${label}` });
const type = (el, value) => fireEvent.change(el, { target: { value } });
const save = () => screen.getByRole("button", { name: "Save plan" });

function mount({ hotels = [A1], deliveries = [delivery()], onSave = jest.fn(() => Promise.resolve()) } = {}) {
  render(<PlanEditor hotels={hotels} poLines={poLines} deliveries={deliveries} onSave={onSave} onCancel={jest.fn()} />);
  return { onSave };
}

test("plan editor blocks save until sums match ordered", async () => {
  const { onSave } = mount();
  expect(save()).toBeEnabled();

  type(qty("Basmati rice", "Hotel A-1 · Phase 1"), "6");
  expect(screen.getByText("4 kg left to allocate")).toBeInTheDocument();
  expect(save()).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Add phase at Hotel A-1" }));
  type(qty("Basmati rice", "Hotel A-1 · Phase 2"), "5");
  expect(screen.getByText("Over by 1 kg")).toBeInTheDocument();
  expect(save()).toBeDisabled();

  type(qty("Basmati rice", "Hotel A-1 · Phase 2"), "4");
  expect(screen.queryByText(/left to allocate|Over by/)).not.toBeInTheDocument();
  expect(save()).toBeEnabled();

  fireEvent.click(save());
  expect(onSave).toHaveBeenCalledWith([
    { hotelId: 1, phaseNo: 1, dueDate: null, remarks: null,
      lines: [{ poLineId: 11, plannedQty: "6" }, { poLineId: 12, plannedQty: "6" }] },
    { hotelId: 1, phaseNo: 2, dueDate: null, remarks: null, lines: [{ poLineId: 11, plannedQty: "4" }] },
  ]);
});

test("a phase with nothing planned blocks save", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Add phase at Hotel A-1" }));
  expect(save()).toBeDisabled();
  expect(screen.getByText(/Hotel A-1 · Phase 2 has nothing planned/)).toBeInTheDocument();
});

test("split equally distributes with remainder on first hotel", () => {
  const { onSave } = mount({
    hotels: [A1, A2, A3],
    deliveries: [delivery({ id: 5, hotelId: null, hotelName: null, dueDate: "2026-11-10" })],
  });

  fireEvent.click(screen.getByRole("button", { name: "Split equally across hotels" }));

  expect(qty("Basmati rice", "Hotel A-1 · Phase 1")).toHaveValue("4");
  expect(qty("Basmati rice", "Hotel A-2 · Phase 1")).toHaveValue("3");
  expect(qty("Basmati rice", "Hotel A-3 · Phase 1")).toHaveValue("3");
  expect(qty("Olive oil", "Hotel A-1 · Phase 1")).toHaveValue("2");
  expect(screen.queryByText(/To be allocated/)).not.toBeInTheDocument();

  fireEvent.click(save());
  expect(onSave).toHaveBeenCalledWith([1, 2, 3].map((hotelId, i) => ({
    hotelId, phaseNo: 1, dueDate: "2026-11-10", remarks: null,
    lines: [{ poLineId: 11, plannedQty: i === 0 ? "4" : "3" }, { poLineId: 12, plannedQty: "2" }],
  })));
});

test("repeat weekly spreads a phase over weekly deliveries", () => {
  const { onSave } = mount({ deliveries: [delivery({ dueDate: "2026-11-02" })] });

  fireEvent.click(screen.getByRole("button", { name: "Repeat Hotel A-1 · Phase 1 weekly" }));
  type(screen.getByRole("spinbutton", { name: "Weekly deliveries" }), "4");
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  fireEvent.click(save());
  const sent = onSave.mock.calls[0][0];
  expect(sent.map((d) => [d.phaseNo, d.dueDate])).toEqual([
    [1, "2026-11-02"], [2, "2026-11-09"], [3, "2026-11-16"], [4, "2026-11-23"],
  ]);
  expect(sent.map((d) => d.lines.map((l) => l.plannedQty))).toEqual([
    ["4", "3"], ["2", "1"], ["2", "1"], ["2", "1"],
  ]);
});

test("copy phase adds the next phase with the same quantities", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Copy Hotel A-1 · Phase 1" }));
  expect(qty("Basmati rice", "Hotel A-1 · Phase 2")).toHaveValue("10");
  expect(screen.getByText("Over by 10 kg")).toBeInTheDocument();
  expect(save()).toBeDisabled();
});

test("repeat weekly keeps the hotel's other phases and renumbers them by date", () => {
  const { onSave } = mount({
    deliveries: [
      delivery({ id: 1, phaseNo: 1, dueDate: "2026-11-02", lines: [
        { id: 101, poLineId: 11, productName: "Basmati rice", unit: "kg", plannedQty: 6 },
        { id: 102, poLineId: 12, productName: "Olive oil", unit: "litre", plannedQty: 6 },
      ] }),
      delivery({ id: 2, phaseNo: 2, dueDate: "2026-12-01", lines: [
        { id: 103, poLineId: 11, productName: "Basmati rice", unit: "kg", plannedQty: 4 },
      ] }),
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: "Repeat Hotel A-1 · Phase 1 weekly" }));
  type(screen.getByRole("spinbutton", { name: "Weekly deliveries" }), "3");
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  // The December phase is now phase 4: numbers follow the calendar.
  expect(screen.getByLabelText("Due date for Hotel A-1 · Phase 4")).toHaveValue("2026-12-01");
  expect(qty("Basmati rice", "Hotel A-1 · Phase 4")).toHaveValue("4");

  fireEvent.click(save());
  expect(onSave.mock.calls[0][0].map((d) => [d.phaseNo, d.dueDate, d.lines.map((l) => l.plannedQty)])).toEqual([
    [1, "2026-11-02", ["2", "2"]],
    [2, "2026-11-09", ["2", "2"]],
    [3, "2026-11-16", ["2", "2"]],
    [4, "2026-12-01", ["4"]],
  ]);
});

test("decimal quantities add up exactly: 0.1 + 0.2 plans 0.3", () => {
  const lines = [{ id: 11, productName: "Saffron", unit: "kg", orderedQty: 0.3 }];
  const onSave = jest.fn(() => Promise.resolve());
  render(
    <PlanEditor
      hotels={[A1]}
      poLines={lines}
      deliveries={[delivery({ lines: [{ id: 101, poLineId: 11, productName: "Saffron", unit: "kg", plannedQty: 0.3 }] })]}
      onSave={onSave}
      onCancel={jest.fn()}
    />
  );
  type(qty("Saffron", "Hotel A-1 · Phase 1"), "0.1");
  expect(screen.getByText("0.2 kg left to allocate")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add phase at Hotel A-1" }));
  type(qty("Saffron", "Hotel A-1 · Phase 2"), "0.2");
  expect(screen.getByText("Planned in full")).toBeInTheDocument();
  fireEvent.click(save());
  expect(onSave.mock.calls[0][0].map((d) => d.lines[0].plannedQty)).toEqual(["0.1", "0.2"]);
});

test("10.5 split across 3 hotels gives 3.5 each", () => {
  const lines = [{ id: 11, productName: "Ghee", unit: "kg", orderedQty: 10.5 }];
  render(
    <PlanEditor
      hotels={[A1, A2, A3]}
      poLines={lines}
      deliveries={[delivery({ hotelId: null, hotelName: null, lines: [{ id: 101, poLineId: 11, productName: "Ghee", unit: "kg", plannedQty: 10.5 }] })]}
      initialAction="split"
      onSave={jest.fn()}
      onCancel={jest.fn()}
    />
  );
  for (const h of ["Hotel A-1", "Hotel A-2", "Hotel A-3"]) {
    expect(qty("Ghee", `${h} · Phase 1`)).toHaveValue("3.5");
  }
  expect(screen.getByText("Planned in full")).toBeInTheDocument();
});

test("a refusal about one delivery names its phase", async () => {
  const onSave = jest.fn(() => Promise.reject({
    response: { status: 422, data: { status: 0, code: "VALIDATION", message: "A delivery cannot be due before the purchase order was raised", details: { field: "dueDate", index: 1 } } },
  }));
  mount({
    hotels: [A1, A2],
    deliveries: [
      delivery({ id: 1, hotelId: 1, lines: [{ id: 101, poLineId: 11, productName: "Basmati rice", unit: "kg", plannedQty: 10 }] }),
      delivery({ id: 2, hotelId: 2, hotelName: "Hotel A-2", dueDate: "2020-01-01", lines: [{ id: 102, poLineId: 12, productName: "Olive oil", unit: "litre", plannedQty: 6 }] }),
    ],
    onSave,
  });
  fireEvent.click(save());
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Hotel A-2 · Phase 1: A delivery cannot be due before the purchase order was raised"
  );
});
