import React, { useEffect, useState } from "react";
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
import { consoleLoggingIntegration } from "@sentry/nextjs";

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
    hsnCodes: editablePO.hsn_codes || [], // expected [{ rfq_item_id, code }]
    loadMore: false,
  });

  const restrictModifyPO = (status) => status == 'rejected' || status == 'cancelled' || status == 'approved'

  useEffect(() => {
    console.log('CHANGES IN THE PO:')
    console.dir(changes, { depth: null })
  }, [changes])

  const parseNumber = (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  };

  const calculateProductTotal = (product) => {
    const qty = parseNumber(product.quantity);
    const unitPrice = parseNumber(product.unit_price);

    const charges = product.charges_meta || {};
    const freightPrice = parseNumber(charges.freight_price);
    const packagePrice = parseNumber(charges.package_price);
    const tax = parseNumber(charges.tax);

    const freightMode = charges.freight_mode || "percentage";
    const packageMode = charges.package_mode || "percentage";
    const taxMode = charges.tax_mode || "percentage";

    const base = unitPrice * qty;

    const freightAmount =
      freightMode === "percentage"
        ? (base * freightPrice) / 100
        : freightPrice;

    const packageAmount =
      packageMode === "percentage"
        ? (base * packagePrice) / 100
        : packagePrice;

    const combined = base + freightAmount + packageAmount;

    const taxAmount =
      taxMode === "percentage" ? (combined * tax) / 100 : tax;

    const total = combined + taxAmount;
    return Math.round(total);
  };

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

      const needsRecalc =
        field === "quantity" ||
        field === "unit_price" ||
        field.startsWith("charges_meta.");

      if (needsRecalc) {
        updatedProduct.total_price = calculateProductTotal(updatedProduct);
      }

      products[index] = updatedProduct;
      const updatedPO = { ...prev, product_details: products };

      const origProduct =
        originalPO.product_details?.[index] || oldProduct;

      const path = `product[${updatedProduct.id || index}].${field}`;
      const oldVal = field.startsWith("charges_meta.")
        ? (origProduct.charges_meta || {})[field.split(".")[1]]
        : origProduct[field];

      recordChange(path, oldVal, value);

      if (needsRecalc) {
        const oldTotal =
          originalPO.product_details?.[index]?.total_price ||
          oldProduct.total_price;
        recordChange(
          `product[${updatedProduct.id || index}].total_price`,
          oldTotal,
          updatedProduct.total_price
        );
      }

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
      <Row className="gy-3 mb-4">
        <Col md={8}>
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
                      value={editablePO.status || ""}
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
                    <Form.Label>GSTIN</Form.Label>
                    <Form.Control
                      type="text"
                      value={editablePO.gstin || ""}
                      onChange={(e) =>
                        handlePOFieldChange("gstin", e.target.value)
                      }
                      placeholder="Enter GSTIN"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
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
        </Col>
      </Row>

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
                      values={hsnCode?.code || ""}
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