// Editing a company silently discarded any replacement document.
//
// The form renders four file inputs in edit mode and the backend route accepts
// them — but the caller passed three arguments to a two-argument service, and
// that service sent JSON. An administrator picked a new GST certificate, saved,
// saw "Company updated", and nothing left the browser.

const mockPut = jest.fn();
jest.mock("@/lib/axios", () => ({ __esModule: true, default: { put: (...a) => mockPut(...a) } }));

import { updateHospitalityCompany } from "./hospitality";

beforeEach(() => {
  mockPut.mockReset().mockResolvedValue({ status: 1 });
});

describe("updating a company", () => {
  it("sends the fields as before when there are no documents", async () => {
    await updateHospitalityCompany(6, { name: "Phileein" });

    const [url, body] = mockPut.mock.calls[0];
    expect(url).toBe("/hospitality/company/6");
    expect(body).toEqual({ name: "Phileein" });
  });

  it("sends a replacement document as multipart, not as JSON", async () => {
    const gst = new File(["x"], "gst.pdf", { type: "application/pdf" });

    await updateHospitalityCompany(6, { name: "Phileein" }, { gst });

    const [, body, config] = mockPut.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("gst")).toBe(gst);
    expect(body.get("name")).toBe("Phileein");
    expect(config.headers["Content-Type"]).toBe("multipart/form-data");
  });

  it("carries every document kind the form offers", async () => {
    const files = {
      gst: new File(["a"], "gst.pdf"),
      pan: new File(["b"], "pan.pdf"),
      cancelled_cheque: new File(["c"], "chq.pdf"),
      msme: new File(["d"], "msme.pdf"),
    };

    await updateHospitalityCompany(6, { name: "Phileein" }, files);

    const body = mockPut.mock.calls[0][1];
    Object.keys(files).forEach((k) => expect(body.get(k)).toBe(files[k]));
  });

  it("ignores a documents object with nothing in it", async () => {
    await updateHospitalityCompany(6, { name: "Phileein" }, { gst: null, pan: null });

    expect(mockPut.mock.calls[0][1]).toEqual({ name: "Phileein" });
  });
});
