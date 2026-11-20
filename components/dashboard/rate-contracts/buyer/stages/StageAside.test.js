// StageAside — "+N more" opens to the names behind it (REQ-2026-0095).
//
// The lifecycle API sends every evaluator and approver; the who's-involved card
// and the approval decision card capped the list and printed "+N more" as text,
// so nobody could see who the extra people were. These cases pin the new
// behaviour of both cards and of the contact line, and that nothing changes when
// the list fits.
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActorFlowCard, ApprovalDecisionCard, contactOthers } from "./StageAside";

const person = (id, name, extra = {}) => ({ user_id: id, name, email: `u${id}@example.com`, ...extra });

function stageWith({ evaluators = [], approver, contact = null, state = "active" } = {}) {
  return {
    key: "commercial",
    state,
    flow: { action_taker_role: "Commercial evaluator", next_stage: "awarding" },
    actors: {
      action_taker: { role: "Commercial evaluator", people: evaluators },
      approver: approver === undefined ? null : approver,
      next_stage: { key: "awarding", label: "Awarding" },
      contact,
    },
  };
}

const pendingApprover = (people) => ({
  role: "Commercial evaluators (round approval)",
  status: "PENDING",
  step_label: "Level 1 of 1 · all must approve",
  people,
  can_user_approve: false,
  unassigned: people.length === 0,
});

describe("ActorFlowCard — Acts here", () => {
  test("two evaluators: both shown, no '+ more' button", () => {
    render(<ActorFlowCard stage={stageWith({ evaluators: [person(1, "Geetanand Shetty"), person(2, "Hitesh K Uchila")] })} />);
    expect(screen.getByText("Geetanand Shetty")).toBeInTheDocument();
    expect(screen.getByText("Hitesh K Uchila")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more|fewer/i })).toBeNull();
  });

  test("three evaluators: '+1 more' opens to the third name and folds back", () => {
    render(<ActorFlowCard stage={stageWith({ evaluators: [person(1, "Geetanand Shetty"), person(2, "Hitesh K Uchila"), person(3, "Ravi Menon")] })} />);
    expect(screen.queryByText("Ravi Menon")).toBeNull();
    const btn = screen.getByRole("button", { name: "+1 more" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(screen.getByText("Ravi Menon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.queryByText("Ravi Menon")).toBeNull();
    expect(screen.getByRole("button", { name: "+1 more" })).toBeInTheDocument();
  });
});

describe("ActorFlowCard — Approves", () => {
  test("five pending approvers: '+3 more' opens to all five with designations", () => {
    const people = [
      person(11, "Prashant Joshi", { designation: "Director", status: "PENDING" }),
      person(12, "Hitesh K Uchila", { designation: "Manager", status: "PENDING" }),
      person(13, "Anita Rao", { designation: "GM Finance", status: "PENDING" }),
      person(14, "Kiran Shah", { designation: "Purchase Head", status: "PENDING" }),
      person(15, "Meera Iyer", { designation: "Controller", status: "PENDING" }),
    ];
    render(<ActorFlowCard stage={stageWith({ approver: pendingApprover(people) })} />);
    expect(screen.queryByText("Meera Iyer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+3 more" }));
    for (const p of people) expect(screen.getByText(p.name)).toBeInTheDocument();
    expect(screen.getByText("GM Finance")).toBeInTheDocument();
    expect(screen.getByText("Controller")).toBeInTheDocument();
  });

  test("approval already approved: no people list and no toggle", () => {
    const approver = { role: "Commercial evaluators (round approval)", status: "APPROVED", people: [], step_label: null };
    render(<ActorFlowCard stage={stageWith({ approver })} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more|fewer/i })).toBeNull();
  });

  test("the two lists open independently", () => {
    const evaluators = [person(1, "E One"), person(2, "E Two"), person(3, "E Three")];
    const people = [1, 2, 3].map((i) => person(20 + i, `A ${i}`, { status: "PENDING" }));
    render(<ActorFlowCard stage={stageWith({ evaluators, approver: pendingApprover(people) })} />);
    const [actorsBtn] = screen.getAllByRole("button", { name: "+1 more" });
    fireEvent.click(actorsBtn);
    expect(screen.getByText("E Three")).toBeInTheDocument();
    expect(screen.queryByText("A 3")).toBeNull();
  });
});

describe("ActorFlowCard — Contact to clear this stage", () => {
  test("names the other pending approvers instead of '+N more'", () => {
    const people = [
      person(11, "Prashant Joshi", { status: "PENDING" }),
      person(12, "Hitesh K Uchila", { status: "APPROVED" }),
      person(13, "Anita Rao", { status: "PENDING" }),
      person(14, "Kiran Shah", { status: "PENDING" }),
    ];
    const contact = { name: "Prashant Joshi", role: "Commercial evaluators (round approval)", email: "u11@example.com", plus: 2 };
    const { container } = render(<ActorFlowCard stage={stageWith({ approver: pendingApprover(people), contact })} />);
    expect(screen.getByText("Also: Anita Rao, Kiran Shah")).toBeInTheDocument();
    // The contact line names them instead of a count (the Approves list keeps its own toggle).
    expect(container.querySelector(".afc-contact-name").textContent).toBe("Prashant Joshi");
    // An approver who already approved is not someone to chase.
    expect(screen.queryByText(/Also:.*Hitesh/)).toBeNull();
  });

  test("an evaluator contact (no count) shows just the one name", () => {
    const contact = { name: "Geetanand Shetty", role: "Commercial evaluator", email: "u1@example.com" };
    render(<ActorFlowCard stage={stageWith({ evaluators: [person(1, "Geetanand Shetty")], contact })} />);
    expect(screen.queryByText(/Also:/)).toBeNull();
  });
});

describe("contactOthers", () => {
  test("pending first, then every live approver; never a removed one", () => {
    const appr = (people) => ({ status: "PENDING", people });
    expect(contactOthers(appr([
      person(1, "A", { status: "PENDING" }), person(2, "B", { status: "REMOVED" }), person(3, "C", { status: "PENDING" }),
    ])).map((p) => p.name)).toEqual(["C"]);
    // Nobody pending (an ALL step mid-way would still list the live ones).
    expect(contactOthers(appr([
      person(1, "A", { status: "APPROVED" }), person(2, "B", { status: "APPROVED" }), person(3, "C", { status: "REMOVED" }),
    ])).map((p) => p.name)).toEqual(["B"]);
    expect(contactOthers({ status: "APPROVED", people: [person(1, "A")] })).toEqual([]);
    expect(contactOthers(null)).toEqual([]);
  });
});

describe("ApprovalDecisionCard — approvers list", () => {
  const baseProps = { comment: "", setComment: () => {}, onApprove: () => {}, onReject: () => {} };

  test("five approvers: three shown, '+2 more' opens to all five", () => {
    const approvers = [1, 2, 3, 4, 5].map((i) => person(i, `Approver ${i}`, { designation: `Role ${i}` }));
    render(<ApprovalDecisionCard {...baseProps} approvers={approvers} />);
    expect(screen.queryByText("Approver 5")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+2 more" }));
    for (const a of approvers) expect(screen.getByText(a.name)).toBeInTheDocument();
    expect(screen.getByText("Role 5")).toBeInTheDocument();
  });

  test("three approvers: no toggle", () => {
    const approvers = [1, 2, 3].map((i) => person(i, `Approver ${i}`));
    render(<ApprovalDecisionCard {...baseProps} approvers={approvers} />);
    expect(screen.queryByRole("button", { name: /more|fewer/i })).toBeNull();
  });

  test("the toggle is a real button (keyboard-reachable) and does not submit the decision", () => {
    const onApprove = jest.fn();
    const onReject = jest.fn();
    const approvers = [1, 2, 3, 4].map((i) => person(i, `Approver ${i}`));
    render(<ApprovalDecisionCard {...baseProps} onApprove={onApprove} onReject={onReject} approvers={approvers} />);
    const btn = screen.getByRole("button", { name: "+1 more" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveAttribute("type", "button");
    btn.focus();
    expect(btn).toHaveFocus();
    fireEvent.click(btn);
    expect(onApprove).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByText("Approver 4")).toBeInTheDocument();
  });
});
