// VendorOverviewStage — a GROUP rate contract invitation.
//
// The vendor sees only the hotels it was invited for, each item's quantity at
// those hotels, and — as soon as it opens the invitation, not at submit —
// which of those hotels need a subscription renewal.

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import VendorOverviewStage from "./VendorOverviewStage";

const HOTELS = [
  { hotel_id: 3, name: "Goa Resort", city: "Goa", state: "Goa" },
  { hotel_id: 4, name: "Mumbai Suites", city: "Mumbai", state: "Maharashtra" },
];

const props = (over = {}) => ({
  arc: { is_group: true, hotels: HOTELS, hotel_name: "Goa Resort", category_title: "Housekeeping", terms_list: [] },
  items: [{
    id: 1, variant_name: "Bath towel", uom: "pcs", indicative_qty: 650,
    hotel_qtys: [{ hotel_id: 3, indicative_qty: 400 }, { hotel_id: 4, indicative_qty: 250 }],
  }],
  invitation: {},
  techEnvelope: { required: false },
  acceptedTerms: false,
  termsAcceptedAt: null,
  onAcceptTerms: jest.fn(),
  acceptingTerms: false,
  readOnly: false,
  submissionStart: "01 Sep 26",
  submissionEnd: "15 Sep 26",
  termStart: "01 Oct 26",
  termEnd: "30 Sep 27",
  renewalNeededHotelIds: [],
  ...over,
});

test("lists the invited hotels and each item's quantity per hotel", () => {
  render(<VendorOverviewStage {...props()} />);

  expect(screen.getByText("Goa Resort · Goa, Goa")).toBeInTheDocument();
  expect(screen.getByText("Mumbai Suites · Mumbai, Maharashtra")).toBeInTheDocument();
  expect(screen.getByText(/one rate per item.*every hotel below/i)).toBeInTheDocument();
  expect(screen.getByTitle("Goa Resort")).toHaveTextContent("400");
  expect(screen.getByTitle("Mumbai Suites")).toHaveTextContent("250");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("names the hotels whose subscription lapsed; the vendor can still submit for the others", () => {
  render(<VendorOverviewStage {...props({ renewalNeededHotelIds: [4] })} />);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("Your subscription for Mumbai Suites has lapsed");
  expect(alert).toHaveTextContent(/you can still submit/i);
  expect(screen.getByRole("link", { name: /renew subscription/i })).toHaveAttribute("href", "/dashboard/vendor/subscription");
});

test("when every invited hotel lapsed, the vendor is told to renew before submitting", () => {
  render(<VendorOverviewStage {...props({ renewalNeededHotelIds: [3, 4] })} />);

  expect(screen.getByRole("alert")).toHaveTextContent(/submit it only after you renew/i);
});
