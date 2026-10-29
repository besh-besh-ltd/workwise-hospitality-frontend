// services/poSendBack — what each call resolves to.
//
// Both axios instances (lib/axios, lib/axiosFormData) return `response.data`
// from their response interceptors, so a service receives the server's body
// { status, message, data }. The mocks below are that body.

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockFormPost = jest.fn();
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) },
}));
jest.mock("@/lib/axiosFormData", () => ({
  __esModule: true,
  default: { post: (...a) => mockFormPost(...a) },
}));

import {
  getSendBackTargets,
  getSendBacks,
  createSendBack,
  respondToSendBack,
  withdrawSendBack,
} from "./poSendBack";

const TARGETS = [{ target_role: "RFQ_CREATOR", user: { id: 11, name: "Rhea Rao" }, available: true }];
const ROWS = [{ id: 7, status: "OPEN" }];

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockFormPost.mockReset();
});

test("targets resolve to the payload, not the body", async () => {
  mockGet.mockResolvedValue({ status: 1, message: "People you can ask.", data: { targets: TARGETS } });
  await expect(getSendBackTargets(605)).resolves.toEqual({ targets: TARGETS });
  expect(mockGet).toHaveBeenCalledWith("/po/605/send-back/targets");
});

test("the thread resolves to the rows", async () => {
  mockGet.mockResolvedValue({ status: 1, message: "Send-backs.", data: ROWS });
  await expect(getSendBacks(605)).resolves.toEqual(ROWS);
  expect(mockGet).toHaveBeenCalledWith("/po/605/send-backs");
});

// The page shows the server's own sentence ("On hold. Rhea Rao will be asked
// to answer."), so asking resolves to the whole body, message included.
test("asking resolves to the body, so the server's message reaches the page", async () => {
  const body = {
    status: 1,
    message: "On hold. Rhea Rao will be asked to answer.",
    data: { send_back: { id: 9 }, po_id: 605 },
  };
  mockFormPost.mockResolvedValue(body);
  const res = await createSendBack(605, { target_role: "RFQ_CREATOR", reason_category: "INFO_MISSING", comment: "Why?", files: [] });
  expect(res.message).toBe("On hold. Rhea Rao will be asked to answer.");
  expect(res.data.send_back).toEqual({ id: 9 });
  const [url, fd] = mockFormPost.mock.calls[0];
  expect(url).toBe("/po/605/send-back");
  expect(fd.get("target_role")).toBe("RFQ_CREATOR");
  expect(fd.get("reason_category")).toBe("INFO_MISSING");
  expect(fd.get("comment")).toBe("Why?");
});

test("answering and withdrawing resolve to the payload", async () => {
  mockFormPost.mockResolvedValue({ status: 1, message: "Answer sent.", data: { send_back: { id: 9 }, po_id: 605 } });
  await expect(respondToSendBack(9, { response_text: "Here", files: [] })).resolves.toEqual({ send_back: { id: 9 }, po_id: 605 });
  expect(mockFormPost.mock.calls[0][0]).toBe("/po/send-back/9/respond");

  mockPost.mockResolvedValue({ status: 1, message: "Request withdrawn.", data: { send_back: { id: 9 }, po_id: 605 } });
  await expect(withdrawSendBack(9)).resolves.toEqual({ send_back: { id: 9 }, po_id: 605 });
  expect(mockPost).toHaveBeenCalledWith("/po/send-back/9/withdraw", {});
});
