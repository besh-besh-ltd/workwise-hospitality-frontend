// Reference data (country codes, units, charge names, departments) used to be
// fetched once per COMPONENT — CommonFormInput fetched /general/country-codes
// once per phone field, so a form with three phone inputs made three identical
// calls. These tests drive the real service layer against a mocked axios and
// count what actually leaves the browser.

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: (...a) => mockGet(...a),
    post: (...a) => mockPost(...a),
    put: (...a) => mockPut(...a),
    delete: (...a) => mockDelete(...a),
  },
}));
jest.mock("@/lib/axiosFormData", () => ({ __esModule: true, default: {} }));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Formik, Form } from "formik";

import CommonFormInput from "@/components/shared/CommonFormInput";
import { getCountryCodes } from "@/services/cms";
import { getUnits, addCustomUnit } from "@/services/units";
import { getChargeNames, createChargeName } from "@/services/rfq";
import { getDepartments } from "@/services/rbac";
import { clearRequestCache } from "@/utils/requestCache";
import { setStoredHospitalityContext } from "@/utils/hospitalityContext";

const COUNTRIES = [
  { id: 1, country_code: "IN", phone_code: "+91" },
  { id: 2, country_code: "AE", phone_code: "+971" },
];

const callsTo = (fn, url) => fn.mock.calls.filter(([u]) => String(u).includes(url)).length;

beforeEach(() => {
  clearRequestCache();
  window.localStorage.clear();
  [mockGet, mockPost, mockPut, mockDelete].forEach((m) => m.mockReset());
  mockGet.mockImplementation((url) => {
    if (String(url).includes("country-codes")) return Promise.resolve({ status: 1, data: COUNTRIES });
    if (String(url).includes("/units")) return Promise.resolve({ status: 1, data: [{ id: 1, name: "nos" }] });
    if (String(url).includes("charge-names")) return Promise.resolve({ status: 1, data: [{ id: 3, name: "Freight" }] });
    if (String(url).includes("departments")) return Promise.resolve({ status: true, data: [{ id: 9, title: "Engineering" }] });
    return Promise.resolve({});
  });
  mockPost.mockResolvedValue({ status: 1 });
});

describe("country codes", () => {
  it("are fetched once for three phone inputs on one form", async () => {
    render(
      <Formik initialValues={{ a: "", b: "", c: "", countryCode: "+91" }} onSubmit={() => {}}>
        <Form>
          <CommonFormInput name="a" label="Mobile A" type="mobile" />
          <CommonFormInput name="b" label="Mobile B" type="mobile" />
          <CommonFormInput name="c" label="Mobile C" type="mobile" />
        </Form>
      </Formik>
    );

    // Every one of the three selects is populated…
    await waitFor(() => expect(screen.getAllByText("AE (+971)")).toHaveLength(3));
    // …from a single request.
    expect(callsTo(mockGet, "country-codes")).toBe(1);
  });

  it("a failed request is not cached — the next caller retries", async () => {
    mockGet.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    await expect(getCountryCodes()).rejects.toBeTruthy();
    const res = await getCountryCodes();
    expect(res.data).toEqual(COUNTRIES);
    expect(callsTo(mockGet, "country-codes")).toBe(2);
  });

  it("each caller gets its own copy — one caller mutating it cannot corrupt the next", async () => {
    const first = await getCountryCodes();
    first.data.push({ id: 99, country_code: "XX", phone_code: "+0" });
    const second = await getCountryCodes();
    expect(second.data).toEqual(COUNTRIES);
    expect(callsTo(mockGet, "country-codes")).toBe(1);
  });
});

describe("units", () => {
  it("concurrent and repeat callers share one request", async () => {
    await Promise.all([getUnits(), getUnits(), getUnits()]);
    await getUnits();
    expect(callsTo(mockGet, "/units")).toBe(1);
  });

  it("adding a custom unit invalidates the cache", async () => {
    await getUnits();
    await addCustomUnit({ name: "crate" });
    await getUnits();
    expect(callsTo(mockGet, "/units")).toBe(2);
  });

  it("a different company context never reuses another tenant's entry", async () => {
    setStoredHospitalityContext({ companyId: 6, hotelId: 30 });
    await getUnits();
    setStoredHospitalityContext({ companyId: 13, hotelId: 41 });
    await getUnits();
    expect(callsTo(mockGet, "/units")).toBe(2);
  });

  it("logging in as someone else never reuses the previous session's entry", async () => {
    window.localStorage.setItem("token", "token-of-user-A-aaaaaaaaaaaaaaaaaaaaaaaa");
    await getUnits();
    window.localStorage.setItem("token", "token-of-user-B-bbbbbbbbbbbbbbbbbbbbbbbb");
    await getUnits();
    expect(callsTo(mockGet, "/units")).toBe(2);
  });
});

describe("charge names", () => {
  it("are fetched once across components, and refetched after a create", async () => {
    await Promise.all([getChargeNames(), getChargeNames()]);
    expect(callsTo(mockGet, "charge-names")).toBe(1);
    await createChargeName({ name: "Insurance" });
    await getChargeNames();
    expect(callsTo(mockGet, "charge-names")).toBe(2);
  });
});

describe("departments", () => {
  it("the master list is fetched once", async () => {
    await Promise.all([getDepartments(), getDepartments()]);
    await getDepartments();
    expect(callsTo(mockGet, "departments")).toBe(1);
  });

  it("the role-scoped list is only de-duplicated while in flight, never kept", async () => {
    const params = { hotel_id: 30, resource: "rfq" };
    await Promise.all([getDepartments(params), getDepartments(params)]);
    expect(callsTo(mockGet, "departments")).toBe(1);
    await getDepartments(params);
    expect(callsTo(mockGet, "departments")).toBe(2);
  });
});
