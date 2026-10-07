// The member-invite token is a 256-bit credential. It travels in a POST body,
// never in a URL path or query (access logs, Referer).

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) },
}));

import { previewMemberInvite, acceptMemberInvite } from "./vendorNetwork";

const TOKEN = "f".repeat(64);

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ status: 1 });
  mockPost.mockReset().mockResolvedValue({ status: 1 });
});

test("the preview posts the token in the body; no URL carries it", async () => {
  await previewMemberInvite(TOKEN);
  expect(mockGet).not.toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith("/vendor-network/member-invites/preview", { token: TOKEN });
});

test("the accept posts the token in the body", async () => {
  await acceptMemberInvite({ token: TOKEN, password: "abcd1234" });
  expect(mockPost).toHaveBeenCalledWith("/vendor-network/member-invites/accept", { token: TOKEN, password: "abcd1234" });
  expect(mockPost.mock.calls.every(([url]) => !url.includes(TOKEN))).toBe(true);
});
