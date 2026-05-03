import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  Accordion,
  Badge,
} from "react-bootstrap";
import { BsBoxSeam } from "react-icons/bs";
import { toast } from "react-toastify";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { addCommasToNumber } from "@/utils/sharedFunctions";
import CommonFormInput from "@/components/shared/CommonFormInput";
import usePreviewTotals from "@/hooks/usePreviewTotals";

// Map a PO product's legacy charges_meta shape into the engine's canonical
// input. Mirrors backend pricingEngine.normalizeChargesMeta so the live
// preview matches what the server will recompute on save.
const buildEngineLineFromProduct = (product) => {
  const charges = product?.charges_meta || {};
  const otherCharges = Array.isArray(charges.other_charges)
    ? charges.other_charges
    : [];

  // Legacy flat freight/packaging → engine other_charges entries.
  // Synthetic charges set tax: null (inherit base rate) when the legacy
  // freight_tax / package_tax field is absent. Under tri-state semantics,
  // tax: 0 would mean "explicit no tax" — silently dropping the inherited
  // base tax these legacy POs were saved with.
  const legacyTaxOrNull = (raw) =>
    raw === null || raw === undefined || raw === "" ? null : (parseFloat(raw) || 0);
  const synthetic = [];
  const fp = parseFloat(charges.freight_price);
  if (Number.isFinite(fp) && fp > 0) {
    synthetic.push({
      name: "Freight",
      amount: fp,
      amount_mode: charges.freight_mode || "percentage",
      tax: legacyTaxOrNull(charges.freight_tax),
      tax_mode: charges.freight_tax_mode || "percentage",
    });
  }
  const pp = parseFloat(charges.package_price);
  if (Number.isFinite(pp) && pp > 0) {
    synthetic.push({
      name: "Packaging",
      amount: pp,
      amount_mode: charges.package_mode || "percentage",
      tax: legacyTaxOrNull(charges.package_tax),
      tax_mode: charges.package_tax_mode || "percentage",
    });
  }

  return {
    unit_price: product?.unit_price,
    quantity: product?.quantity,
    tax: charges.tax,
    tax_mode: charges.tax_mode || "percentage",
    other_charges: otherCharges.length ? otherCharges : synthetic,
  };
};

const PurchaseOrderEditView = ({
  data,
  onCancel,
  onSaved,
  handleBack,
  handleUpdatePO,
}) => {
  // Freeze original for diffing
  const [originalPO] = useState(data);
  // Editable copy
  const [editablePO, setEditablePO] = useState(data);
  const [termsAndConditions, setTermsAndConditions] = useState(
    data.terms_and_conditions || ""
  );
  const [changes, setChanges] = useState([]);
  const [saving, setSaving] = useState(false);

  const productDetails = editablePO.product_details || [];

  // HSN state: same UX as view page (loadMore + per-product code)
  const [hsnCodeInfo, setHSNCodeInfo] = useState({
    hsnCodes: editablePO.hsn_codes || [],
    loadMore: false,
  });

  const restrictModifyPO = (status) => status == 'rejected' || status == 'cancelled' || status == 'approved'

  const parseNumber = (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  };

  // Live preview: backend engine recomputes per-line totals as the user
  // edits unit_price, quantity, or any charges_meta field. The same engine
  // recomputes on save (handleUpdatePO model fn), so what the user sees is
  // exactly what the server will persist.
  const previewDraft = useMemo(() => {
    return {
      items: (editablePO.product_details || []).map(buildEngineLineFromProduct),
    };
  }, [editablePO.product_details]);

  const { totals: pricingTotals } = usePreviewTotals(previewDraft);

  // Sync engine totals back into editablePO.product_details[i].total_price
  // so existing render code (per-row totals, accumulator) keeps working.
  useEffect(() => {
    if (!pricingTotals?.lines) return;
    setEditablePO((prev) => {
      const products = prev.product_details || [];
      let changed = false;
      const next = products.map((p, idx) => {
        const newTotal = pricingTotals.lines[idx]?.total ?? 0;
        if (Number(p.total_price) === newTotal) return p;
        changed = true;
        return { ...p, total_price: newTotal };
      });
      return changed ? { ...prev, product_details: next } : prev;
    });
  }, [pricingTotals]);

  const handleResetChanges = () => {
    setEditablePO(originalPO);

    setTermsAndConditions(originalPO.terms_and_conditions || "");

    setHSNCodeInfo({
      hsnCodes: originalPO.hsn_codes || [],
      loadMore: false,
    });

    setChanges([]);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    toast.info("All changes have been reset.");
  };

  const recordChange = (path, oldValue, newValue) => {
    if (oldValue === newValue) return;
    setChanges((prev) => {
      const idx = prev.findIndex((c) => c.path === path);
      const entry = {
        path,
        oldValue,
        newValue,
        timestamp: new Date().toISOString(),
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entry;
        return copy;
      }
      return [...prev, entry];
    });
  };

  const handlePOFieldChange = (field, value) => {
    setEditablePO((prev) => {
      const updated = { ...prev, [field]: value };
      const oldVal = originalPO[field];
      recordChange(field, oldVal, value);
      return updated;
    });
  };

  const handleProductChange = (index, field, value) => {
    setEditablePO((prev) => {
      const products = [...(prev.product_details || [])];
      const oldProduct = products[index];
      if (!oldProduct) return prev;

      let updatedProduct = { ...oldProduct };

      if (field.startsWith("charges_meta.")) {
        const key = field.split(".")[1];
        const oldCharges = { ...(oldProduct.charges_meta || {}) };
        const newCharges = { ...oldCharges, [key]: value };
        updatedProduct.charges_meta = newCharges;
      } else {
        updatedProduct[field] = value;
      }

      // total_price recompute is handled by the live-preview hook + sync
      // effect; we only record the input change here. The backend engine
      // recomputes total_price authoritatively on save.
      products[index] = updatedProduct;
      const updatedPO = { ...prev, product_details: products };

      const origProduct =
        originalPO.product_details?.[index] || oldProduct;

      const path = `product[${updatedProduct.rfq_item_id || index}].${field}`;
      const oldVal = field.startsWith("charges_meta.")
        ? (origProduct.charges_meta || {})[field.split(".")[1]]
        : origProduct[field];

      recordChange(path, oldVal, value);

      return updatedPO;
    });
  };

  const handleChargeChange = (index, key, value) => {
    handleProductChange(index, `charges_meta.${key}`, value);
  };

  const handleRemoveProduct = (index) => {
    setEditablePO((prev) => {
      const products = [...(prev.product_details || [])];
      const removed = products[index];
      if (!removed) return prev;

      const updated = products.filter((_, i) => i !== index);

      recordChange(
        `product[${removed.id || index}].removed`,
        false,
        true
      );

      return { ...prev, product_details: updated };
    });
  };

  // HSN update helper: syncs both UI state + editablePO.hsn_codes + changes
  const updateHSNForProduct = (rfq_item_id, newCode) => {
    // UI state
    setHSNCodeInfo((info) => {
      const existing = info.hsnCodes.find(
        (h) => String(h.rfq_item_id) === String(rfq_item_id)
      );
      if (existing) {
        return {
          ...info,
          hsnCodes: info.hsnCodes.map((h) =>
            String(h.rfq_item_id) === String(rfq_item_id)
              ? { ...h, code: newCode }
              : h
          ),
        };
      }
      return {
        ...info,
        hsnCodes: [
          ...info.hsnCodes,
          { rfq_item_id, code: newCode },
        ],
      };
    });

    // editable PO + change log
    setEditablePO((prev) => {
      const current = prev.hsn_codes || [];
      const idx = current.findIndex(
        (h) => String(h.rfq_item_id) === String(rfq_item_id)
      );
      const oldRow =
        idx >= 0 ? current[idx] : { rfq_item_id, code: "" };

      const updatedRow = { ...oldRow, rfq_item_id, code: newCode };
      let newArr = [...current];

      if (idx >= 0) {
        newArr[idx] = updatedRow;
      } else {
        newArr.push(updatedRow);
      }

      const updatedPO = { ...prev, hsn_codes: newArr };

      recordChange(
        `hsn_codes[${rfq_item_id}].code`,
        oldRow.code,
        newCode
      );

      return updatedPO;
    });
  };

  const toggleHSNLoadMore = () => {
    setHSNCodeInfo((info) => ({
      ...info,
      loadMore: !info.loadMore,
    }));
  };

  const handleTermsChange = (value) => {
    setTermsAndConditions(value);
    recordChange(
      "terms_and_conditions",
      originalPO.terms_and_conditions || "",
      value
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        po_id: editablePO.id,
        updated_po: {
          ...editablePO,
          terms_and_conditions: termsAndConditions,
        },
        changes,
      };

      if (handleUpdatePO) {
        await handleUpdatePO(payload);
      }

      toast.success("PO updated successfully");
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error(err.message ?? "Failed to update PO");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleBack}
        className="btn btn-primary p-2 mb-3 px-3"
        style={{ width: "fit-content" }}
        id="back_button-po_details-purchase_order_page"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
        Back
      </button>

      {/* small warning strip */}
      <Card className="mb-3 alert alert-warning">
        <Card.Body className="p-0">
          <div className="small">
            <strong>Heads up:</strong> Editing this <strong>Purchase Order</strong> will reset
            the <strong>approval hierarchy.</strong> All <strong>existing approvals</strong> will be voided and
            the PO will need to be <strong>approved</strong> again from the beginning. The changes
            will only be reflected when clicked on <strong>Save Changes.</strong> All the edited logs
            can be found in the logs section.
          </div>
        </Card.Body>
      </Card>

      {/* PO + Vendor info */}
      <div className="d-flex flex-column gap-3 mb-4">
        <Card className="shadow-sm">
          <Card.Body>
            <h5 className="mb-3">PO Details</h5>
            <Row className="gy-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>PO Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={editablePO.po_number || ""}
                    onChange={(e) =>
                      handlePOFieldChange("po_number", e.target.value)
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Control
                    type="text"
                    value={(editablePO.status || "").replace("_", " ")}
                    className="text-capitalize"
                    disabled
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Project</Form.Label>
                  <Form.Control
                    type="text"
                    value={editablePO.project_details?.name || ""}
                    disabled
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>RFQ Id</Form.Label>
                  <Form.Control
                    type="text"
                    value={editablePO.rfq_id || ""}
                    disabled
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="shadow-sm">
          <Card.Body>
            <h5 className="mb-3">Vendor Details</h5>
            <div className="mb-2">
              <div className="text-muted small">Vendor Name</div>
              <div className="fw-semibold">
                {editablePO.finalized_vendor_name}
              </div>
            </div>
            <div className="mb-2">
              <div className="text-muted small">Vendor Email</div>
              <div className="fw-semibold">
                {editablePO.finalized_vendor_email}
              </div>
            </div>
            <div className="mb-0">
              <div className="text-muted small">Approval Status</div>
              <Badge
                className="text-capitalize"
                bg={
                  editablePO.approval_status?.status === "approved"
                    ? "success"
                    : "secondary"
                }
              >
                {editablePO.approval_status?.status || "N/A"}
              </Badge>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Products */}
      <section className="mb-4">
        <Card className="shadow-sm">
          <Card.Body>
            <div className="d-flex gap-2 align-items-center mb-3">
              <BsBoxSeam className="me-2 fs-3 text-primary" />
              <div className="d-flex flex-column">
                <strong>Product Details</strong>
                <span className="small text-muted">
                  Details are from the time of finalization
                </span>
              </div>
            </div>

            {productDetails.length === 0 ? (
              <p className="text-muted mb-0">
                No products found in this Purchase Order.
              </p>
            ) : (
              <Accordion alwaysOpen>
                {productDetails.map((prod, idx) => {
                  const qty = parseNumber(prod.quantity);
                  const baseValue = parseNumber(prod.unit_price) * qty;
                  const charges = prod.charges_meta || {};

                  return (
                    <Accordion.Item
                      eventKey={String(idx)}
                      key={prod.id || prod.rfq_item_id || idx}
                      className="mb-2"
                    >
                      <Accordion.Header>
                        <div className="w-100 d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div className="d-flex flex-column gap-1">
                            <div className="fw-semibold">
                              {prod.name || "Unnamed Product"}
                            </div>
                            <div className="small text-muted">
                              RFQ Item: <strong>{prod.rfq_item_id}</strong>
                              {prod.product_id && (
                                <>
                                  {" "}
                                  • Product ID:{" "}
                                  <strong>{prod.product_id}</strong>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-end me-3">
                            <div className="small text-muted">
                              Total Amount
                            </div>
                            <div className="fw-semibold fs-6">
                              ₹
                              {typeof addCommasToNumber === "function"
                                ? addCommasToNumber(prod.total_price)
                                : prod.total_price}
                            </div>
                          </div>
                        </div>
                      </Accordion.Header>

                      <Accordion.Body>
                        <Row className="gy-3">
                          <Col md={3}>
                            <Form.Group>
                              <Form.Label>Quantity</Form.Label>
                              <Form.Control
                                type="number"
                                min={0}
                                value={prod.quantity}
                                onChange={(e) =>
                                  handleProductChange(
                                    idx,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                              />
                            </Form.Group>
                          </Col>
                          <Col md={3}>
                            <Form.Group>
                              <Form.Label>Unit</Form.Label>
                              <Form.Control
                                type="text"
                                value={prod.unit || ""}
                                onChange={(e) =>
                                  handleProductChange(
                                    idx,
                                    "unit",
                                    e.target.value
                                  )
                                }
                              />
                            </Form.Group>
                          </Col>
                          <Col md={3}>
                            <Form.Group>
                              <Form.Label>Unit Price (₹)</Form.Label>
                              <Form.Control
                                type="number"
                                min={0}
                                value={prod.unit_price}
                                onChange={(e) =>
                                  handleProductChange(
                                    idx,
                                    "unit_price",
                                    e.target.value
                                  )
                                }
                              />
                            </Form.Group>
                          </Col>
                          <Col md={3}>
                            <Form.Group>
                              <Form.Label>Base Value (₹)</Form.Label>
                              <Form.Control
                                disabled
                                value={
                                  typeof addCommasToNumber === "function"
                                    ? addCommasToNumber(baseValue)
                                    : baseValue
                                }
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <hr />

                        <Row className="gy-3">
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Freight</Form.Label>
                              <div className="d-flex gap-2">
                                <Form.Control
                                  type="number"
                                  min={0}
                                  value={charges.freight_price ?? ""}
                                  onChange={(e) =>
                                    handleChargeChange(
                                      idx,
                                      "freight_price",
                                      e.target.value
                                    )
                                  }
                                />
                                <Form.Select
                                  style={{ maxWidth: 130 }}
                                  value={
                                    charges.freight_mode || "percentage"
                                  }
                                  onChange={(e) =>
                                    handleChargeChange(
                                      idx,
                                      "freight_mode",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="percentage">%</option>
                                  <option value="absolute">₹</option>
                                </Form.Select>
                              </div>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Packing</Form.Label>
                              <div className="d-flex gap-2">
                                <Form.Control
                                  type="number"
                                  min={0}
                                  value={charges.package_price ?? ""}
                                  onChange={(e) =>
                                    handleChargeChange(
                                      idx,
                                      "package_price",
                                      e.target.value
                                    )
                                  }
                                />
                                <Form.Select
                                  style={{ maxWidth: 130 }}
                                  value={
                                    charges.package_mode || "percentage"
                                  }
                                  onChange={(e) =>
                                    handleChargeChange(
                                      idx,
                                      "package_mode",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="percentage">%</option>
                                  <option value="absolute">₹</option>
                                </Form.Select>
                              </div>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Tax (GST)</Form.Label>
                              <div className="d-flex gap-2">
                                <Form.Control
                                  type="number"
                                  min={0}
                                  value={charges.tax ?? ""}
                                  onChange={(e) =>
                                    handleChargeChange(
                                      idx,
                                      "tax",
                                      e.target.value
                                    )
                                  }
                                />
                                <Form.Select
                                  style={{ maxWidth: 130 }}
                                  value={charges.tax_mode || "percentage"}
                                  onChange={(e) =>
                                    handleChargeChange(
                                      idx,
                                      "tax_mode",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="percentage">%</option>
                                  <option value="absolute">₹</option>
                                </Form.Select>
                              </div>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row className="gy-3 mt-2">
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Total (₹)</Form.Label>
                              <Form.Control
                                disabled
                                value={
                                  typeof addCommasToNumber === "function"
                                    ? addCommasToNumber(prod.total_price)
                                    : prod.total_price
                                }
                              />
                            </Form.Group>
                          </Col>
                          <Col
                            md={8}
                            className="d-flex align-items-end justify-content-end"
                          >
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="p-2"
                              onClick={() => handleRemoveProduct(idx)}
                              disabled={productDetails.length <= 1}
                            >
                              Remove Product
                            </Button>
                          </Col>
                        </Row>
                      </Accordion.Body>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </Card.Body>
        </Card>
      </section>

      {/* HSN Codes + GSTIN (per your existing view logic) */}
      <section className="mb-4">
        <div className="d-flex gap-3 flex-wrap">
          {/* HSN codes per product */}
          <Card className="shadow-sm flex-fill">
            <Card.Body className="d-flex flex-column gap-2">
              <span className="fw-semibold">HSN Codes</span>
              <div className="d-flex flex-column gap-1">
                {(hsnCodeInfo.loadMore
                  ? productDetails
                  : productDetails.slice(0, 1)
                ).map((product) => {
                  const hsnCode = hsnCodeInfo.hsnCodes.find(
                    (code) =>
                      String(code.rfq_item_id) ===
                      String(product.rfq_item_id)
                  );

                  return (
                    <CommonFormInput
                      key={product.rfq_item_id}
                      type="simple-text"
                      label={product.name}
                      placeholder={`Enter ${product.name} HSN Code here...`}
                      values={hsnCode?.hsn_code || ""}
                      onChange={(change) => {
                        updateHSNForProduct(
                          product.rfq_item_id,
                          change.target.value
                        );
                      }}
                    />
                  );
                })}
                <div className="d-flex gap-2 mt-2">
                  {productDetails.length > 1 && (
                    <button
                      className="btn btn-success p-2"
                      onClick={toggleHSNLoadMore}
                    >
                      {hsnCodeInfo.loadMore
                        ? "Load Less"
                        : `Load ${productDetails.length - 1} More`}
                    </button>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* GSTIN (single global) */}
          <Card className="shadow-sm flex-fill">
            <Card.Body className="d-flex flex-column gap-2">
              <div className="d-flex flex-column gap-1">
                <CommonFormInput
                  type="simple-text"
                  label={"GSTIN ( To be mentioned in the PO )"}
                  placeholder={`Enter GSTIN here...`}
                  values={editablePO.gstin || ""}
                  onChange={(change) => {
                    handlePOFieldChange("gstin", change.target.value);
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        </div>
      </section>

      {/* Terms & Conditions */}
      <section className="mb-4">
        <Card className="shadow-sm">
          <Card.Body>
            <Form.Group>
              <Form.Label>Terms & Conditions</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={termsAndConditions}
                onChange={(e) => handleTermsChange(e.target.value)}
                placeholder="Add terms & conditions for this purchase order"
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </section>

      {/* Actions */}
      <div className="d-flex justify-content-end gap-3 mb-4">
        <Button
          variant="outline-secondary"
          size="sm"
          className="p-2"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="dark"
          size="sm"
          className="p-2"
          onClick={handleResetChanges}
          disabled={saving || editablePO == originalPO}
        >
          Reset Changes
        </Button>
        <Button
          variant="success"
          size="sm"
          className="p-2"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default PurchaseOrderEditView;