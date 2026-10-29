// The outbox's sends ask lib/axios to reject on a 401 (settleOn401) so a queued
// event is held as "signed out", not "may have been recorded". Other calls keep
// the shared default (the session-expired dialog, and no settle).

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: null })),
    post: jest.fn(() => Promise.resolve({ data: null })),
    put: jest.fn(() => Promise.resolve({ data: null })),
    patch: jest.fn(() => Promise.resolve({ data: null })),
    delete: jest.fn(() => Promise.resolve({ data: null })),
  },
}));

import axiosInstance from "@/lib/axios";
import { createGrn, postOut, saveCountLines, submitCount } from "@/services/inventory";

const configOf = (call) => call[2];

beforeEach(() => jest.clearAllMocks());

test("a receipt post, a mark-out and a count save settle on a 401", async () => {
  await createGrn({ poId: 52, post: true });
  await postOut({ hotelId: 46, lines: [] });
  await saveCountLines(5, []);
  expect(configOf(axiosInstance.post.mock.calls[0])).toEqual(expect.objectContaining({ settleOn401: true }));
  expect(configOf(axiosInstance.post.mock.calls[1])).toEqual(expect.objectContaining({ settleOn401: true }));
  expect(configOf(axiosInstance.put.mock.calls[0])).toEqual(expect.objectContaining({ settleOn401: true }));
});

test("a receipt draft save and other calls keep the default", async () => {
  await createGrn({ poId: 52 });
  await submitCount(5);
  expect(configOf(axiosInstance.post.mock.calls[0])?.settleOn401).toBeUndefined();
  expect(configOf(axiosInstance.post.mock.calls[1])?.settleOn401).toBeUndefined();
});
