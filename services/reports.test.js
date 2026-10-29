// Wire-level contract for services/reports: the workbook download gets a long
// timeout of its own (a 50,000-row export can outlast the shared 30 s), and a
// refusal that arrives as a blob body is read back so callers can show it.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("@/utils/download", () => ({ __esModule: true, saveBlob: jest.fn(), stamp: () => "2026-10-25" }));

import axiosInstance from "@/lib/axios";
import { saveBlob } from "@/utils/download";
import { getApiErrorMessage } from "@/utils/apiError";
import { downloadReport, previewReport } from "@/services/reports";

const refusedWithBlob = (status, body, type = "application/json") =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: new Blob([body], { type }) },
  });

beforeEach(() => {
  jest.clearAllMocks();
});

test("the download asks for a blob with a 120 s timeout and saves it", async () => {
  const file = new Blob(["xlsx"]);
  axiosInstance.post.mockResolvedValue(file);
  await downloadReport("stock_on_hand", { fy: "2026-27" });
  expect(axiosInstance.post).toHaveBeenCalledWith(
    "/reports/stock_on_hand/download",
    { fy: "2026-27" },
    { responseType: "blob", timeout: 120000 }
  );
  expect(saveBlob).toHaveBeenCalledWith(file, "stock-on-hand_2026-10-25.xlsx");
});

test("the preview keeps the shared default timeout", async () => {
  axiosInstance.post.mockResolvedValue({ data: {} });
  await previewReport("stock_on_hand", { fy: "2026-27" });
  expect(axiosInstance.post).toHaveBeenCalledWith("/reports/stock_on_hand/preview", { fy: "2026-27" });
});

test("a refused download's JSON body is read out of the blob, so the server's reason reaches the user", async () => {
  axiosInstance.post.mockRejectedValue(
    refusedWithBlob(403, JSON.stringify({ status: 0, message: "You can't export stock for Orchid Goa" }))
  );
  const err = await downloadReport("stock_on_hand", {}).catch((e) => e);
  expect(err.response.status).toBe(403);
  expect(getApiErrorMessage(err, "Could not download the report")).toBe("You can't export stock for Orchid Goa");
  expect(saveBlob).not.toHaveBeenCalled();
});

test("a refusal whose body isn't JSON falls back to the caller's message", async () => {
  axiosInstance.post.mockRejectedValue(refusedWithBlob(502, "<html>Bad gateway</html>", "text/html"));
  const err = await downloadReport("stock_on_hand", {}).catch((e) => e);
  expect(getApiErrorMessage(err, "Could not download the report")).toBe("Could not download the report");
});

test("a timeout (no response) is passed through untouched", async () => {
  const timeout = Object.assign(new Error("timeout of 120000ms exceeded"), { isAxiosError: true, code: "ECONNABORTED" });
  axiosInstance.post.mockRejectedValue(timeout);
  await expect(downloadReport("stock_on_hand", {})).rejects.toBe(timeout);
});
