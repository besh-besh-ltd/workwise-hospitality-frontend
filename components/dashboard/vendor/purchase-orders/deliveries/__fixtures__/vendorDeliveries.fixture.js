// GET /inventory/vendor/po/626/deliveries as the vendor sees it (api-contract
// "Vendor"): PO #138898, two hotels, Konark in two phases, Puri in one, and
// 2.5 side tables not yet assigned to a hotel. One dispatch was received
// (invoiced), one is on the road. No prices anywhere in the payload, by
// contract; `unitPrice` below is planted to prove the view would not print one.

const line = (over) => ({
  id: 0,
  poLineId: 0,
  productName: "",
  unit: "Nos",
  plannedQty: 0,
  acceptedQty: 0,
  rejectedQty: 0,
  returnedReplaceQty: 0,
  returnedCreditQty: 0,
  shortClosedQty: 0,
  openQty: 0,
  status: "open",
  ...over,
});

export const vendorDeliveries = (over = {}) => ({
  poId: 626,
  poNumber: "138898",
  poStatus: "dispatched",
  receiptStatus: "partial",
  planLocked: true,
  hotels: [
    { id: 46, name: "Lotus Konark" },
    { id: 47, name: "Lotus Puri" },
  ],
  deliveries: [
    {
      id: 901, hotelId: 46, hotelName: "Lotus Konark", phaseNo: 1, dueDate: "2026-11-02",
      status: "partial", remarks: null, overdue: false, hasReceipts: true,
      lines: [
        line({ id: 1, poLineId: 501, productName: "POUFFE", plannedQty: 20, acceptedQty: 12, rejectedQty: 2,
          returnedReplaceQty: 1, openQty: 9, status: "partial", unitPrice: 4700 }),
        line({ id: 2, poLineId: 502, productName: "SIDE TABLE", plannedQty: 10, openQty: 10 }),
      ],
    },
    {
      id: 902, hotelId: 46, hotelName: "Lotus Konark", phaseNo: 2, dueDate: "2026-12-01",
      status: "open", remarks: "After the wing opens", overdue: false, hasReceipts: false,
      lines: [
        line({ id: 3, poLineId: 501, productName: "POUFFE", plannedQty: 8, openQty: 8 }),
        line({ id: 4, poLineId: 502, productName: "SIDE TABLE", plannedQty: 5, openQty: 5 }),
      ],
    },
    {
      id: 903, hotelId: 47, hotelName: "Lotus Puri", phaseNo: 1, dueDate: "2026-10-20",
      status: "open", remarks: null, overdue: true, hasReceipts: false,
      lines: [
        line({ id: 5, poLineId: 501, productName: "POUFFE", plannedQty: 10, openQty: 10 }),
        line({ id: 6, poLineId: 502, productName: "SIDE TABLE", plannedQty: 3, shortClosedQty: 3, openQty: 0, status: "short_closed" }),
      ],
    },
    {
      id: 904, hotelId: null, hotelName: null, phaseNo: 1, dueDate: null,
      status: "open", remarks: null, overdue: false, hasReceipts: false,
      lines: [line({ id: 7, poLineId: 502, productName: "SIDE TABLE", plannedQty: 2.5, openQty: 2.5 })],
    },
  ],
  poLines: [
    { id: 501, productName: "POUFFE", unit: "Nos", orderedQty: 38, receivedQty: 14, acceptedQty: 12, rejectedQty: 2,
      returnedReplaceQty: 1, returnedCreditQty: 0, shortClosedQty: 0, openQty: 27, receiptStatus: "partial" },
    { id: 502, productName: "SIDE TABLE", unit: "Nos", orderedQty: 20.5, receivedQty: 0, acceptedQty: 0, rejectedQty: 0,
      returnedReplaceQty: 0, returnedCreditQty: 0, shortClosedQty: 3, openQty: 17.5, receiptStatus: "open" },
  ],
  dispatches: [
    {
      id: 71, dispatchNumber: "DSP/46/2026-27/00003", hotelId: 46, hotelName: "Lotus Konark", deliveryId: 901, phaseNo: 1,
      status: "received", challanNo: "CH-118", challanDate: "2026-10-20", expectedDeliveryDate: "2026-10-22",
      ewayBillNo: "EWB-77001", vehicleNo: "OD02AB1234", transporter: "VRL Logistics", remarks: null,
      createdAt: "2026-10-20T06:00:00.000Z",
      lines: [{ poLineId: 501, productName: "POUFFE", qty: 14 }],
    },
    {
      id: 72, dispatchNumber: "DSP/47/2026-27/00004", hotelId: 47, hotelName: "Lotus Puri", deliveryId: 903, phaseNo: 1,
      status: "in_transit", challanNo: "CH-131", challanDate: "2026-10-24", expectedDeliveryDate: "2026-10-27",
      ewayBillNo: null, vehicleNo: "OD05CD5678", transporter: null, remarks: null,
      createdAt: "2026-10-24T06:00:00.000Z",
      lines: [{ poLineId: 501, productName: "POUFFE", qty: 10 }],
    },
  ],
  grns: [
    {
      grnNumber: "GRN/46/2026-27/00012", hotelName: "Lotus Konark", receivedAt: "2026-10-22", docType: "RECEIPT", status: "posted",
      lines: [{ productName: "POUFFE", acceptedQty: 12, rejectedQty: 2, rejectionReason: "damaged" }],
    },
  ],
  rtvs: [
    {
      rtvNumber: "RTV/46/2026-27/00002", hotelName: "Lotus Konark", disposition: "REPLACE", status: "dispatched",
      challanNo: "RC-9", creditNoteRef: null, createdAt: "2026-10-23T09:00:00.000Z",
      lines: [{ productName: "POUFFE", qty: 1, reason: "Torn fabric" }],
    },
  ],
  shortCloses: [
    {
      productName: "SIDE TABLE", hotelName: "Lotus Puri", phaseNo: 1, qty: 3, action: "close",
      reasonCode: "no_longer_needed", remarks: "Wing closed for renovation", actedAt: "2026-10-23T10:00:00.000Z",
    },
  ],
  invoices: [
    {
      id: 3001, invoiceNumber: "INV-2026-118", invoiceDate: "2026-10-21", invoiceAmount: 70500, dispatchId: 71,
      dispatchNumber: "DSP/46/2026-27/00003", documentUrl: "https://bucket.s3.ap-south-1.amazonaws.com/inv-118.pdf",
      createdAt: "2026-10-21T08:00:00.000Z",
    },
    {
      id: 3002, invoiceNumber: null, invoiceDate: null, invoiceAmount: null, dispatchId: null, dispatchNumber: null,
      documentUrl: "https://bucket.s3.ap-south-1.amazonaws.com/legacy.pdf", createdAt: "2026-10-01T08:00:00.000Z",
    },
  ],
  ...over,
});

export default vendorDeliveries;
