import React, { useEffect, useMemo, useState } from "react";
import FullLoader from "@/components/shared/FullLoader";
import { downloadQuotesDetails } from "@/services/rfq";
import ReadMore from "@/components/shared/ReadMore";
import { renderFileLink } from "@/utils/elementFunctions";
import { calculateTotal, handleNormalize } from "@/utils/sharedFunctions";
import { Badge } from "react-bootstrap";


/**
 * @updated by mukul 08-08-2025 - normilize total
 */

const addCommasToNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const OverallCostComparison = ({ rfq_id, TA_Filter, freightFilter, normalizeFilter }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [breakupOpen, setBreakupOpen] = useState({}); // key: `${productIdx}_${vendorId}`
  const [maxVendors, setMaxVendors] = useState(0);

  // Helper function to check if vendor has missing freight or packaging costs for a specific product
  const hasMissingCosts = (productIdx, vendorId) => {
    // Don't show highlighting when freight filter is active
    if (freightFilter) return false;
    
    if (!products || products.length === 0) return false;
    
    const product = products[productIdx];
    if (!product || !product.quotations) return false;
    
    const vendorQuote = product.quotations.find(q => q.created_by === vendorId && q.id != null && q.is_regret != 1);
    if (!vendorQuote || !vendorQuote.quote_details || vendorQuote.quote_details.length === 0) return false;
    
    const quoteDetails = vendorQuote.quote_details[0];
    const freightPrice = parseFloat(quoteDetails.freight_price) || 0;
    const packagePrice = parseFloat(quoteDetails.package_price) || 0;
    
    return freightPrice === 0 || packagePrice === 0;
  };
  const toggleBreakup = (productIdx, vendorId) => {
    setBreakupOpen(prev => ({
      ...prev,
      [`${productIdx}_${vendorId}`]: !prev[`${productIdx}_${vendorId}`]
    }));
  };

  useEffect(() => {
    setLoading(true);
    downloadQuotesDetails(rfq_id, TA_Filter, freightFilter)
      .then((res) => {
        let data = res.data || [];
        
        // If normalize filter is enabled, normalize the quotes
        if(normalizeFilter){
          data =   handleNormalize(data)
          // setProducts(normalizedData);
        }

        setProducts(data);


        // Find max number of quoting vendors for any product
        let maxV = 0;
        data.forEach(item => {
          const quoting = item.quotations.filter(q => q.id != null && q.is_regret !== 1 && q.quote_details && q.quote_details[0]);
          if (quoting.length > maxV) maxV = quoting.length;
        });
        setMaxVendors(maxV);
        setLoading(false);

      })
      .catch(() => setLoading(false));
  }, [rfq_id, TA_Filter, freightFilter, normalizeFilter]);

  // ...

  //  Calculate column sums   L1, L2, L3, L4...
const columnSums = useMemo(() => {
  const sums = Array.from({ length: maxVendors }, () => 0);

  products.forEach((item) => {
    const quotingVendors = item.quotations
      .filter(
        (q) =>
          q.id != null &&
          q.is_regret !== 1 &&
          q.quote_details &&
          q.quote_details[0]
      )
      .map((q) => {
        const details = q.quote_details[0];
        const quantity =
          details.rfq_details?.find((spec) => spec.title === "Quantity")
            ?.value || details.quantity;
        return {
          cost: Number(calculateTotal(details, quantity, normalizeFilter)) || 0,
        };
      })
      .sort((a, b) => a.cost - b.cost);

    quotingVendors.forEach((q, idx) => {
      if (idx < sums.length) sums[idx] += q.cost;
    });
  });

  return sums;
}, [products, maxVendors, normalizeFilter]);


  if (loading) return <FullLoader />;
  const hasAnyQuotes = products.some(
    item => item.quotations && item.quotations.some(q => q.id != null && q.is_regret !== 1 && q.quote_details && q.quote_details[0])
  );
  if (!hasAnyQuotes) return <h4 className="mt-4 text-center">No Quotes Yet!</h4>;


  return (
    <div className="card card-body shadow-sm p-4" style={{ borderRadius: 18, marginTop: 16 }}>
      <h3 className="fs-5 fw-bold text-center mb-2" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
        OVERALL COST COMPARISON CHART
        <div className="fw-normal" style={{ fontSize: 14, color: '#444', textTransform: 'none' }}>
          (Incl. Packaging, Freight & GST)
        </div>
      </h3>
      <div className="table-responsive" style={{ overflowX: 'auto', minWidth: 0 }}>
        <table className="table table-bordered overall-table mb-0" style={{ minWidth: 900, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', tableLayout: 'auto' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#2d5ba7', color: 'white', zIndex: 2 }}>
            <tr>
              <th style={{ background: '#2d5ba7', color: '#fff', borderTopLeftRadius: 12, maxWidth: 100, width: 100 }}>Sl. No</th>
              <th style={{ background: '#2d5ba7', color: '#fff', minWidth: 120, maxWidth: maxVendors > 2 ? 180 : 300, width: maxVendors > 2 ? 180 : 300 }}>Product Name</th>
              <th style={{ background: '#2d5ba7', color: '#fff', minWidth: 300, maxWidth: maxVendors > 2 ? 220 : 350, width: maxVendors > 2 ? 220 : 350 }}>Product Details</th>
              <th style={{ background: '#2d5ba7', color: '#fff', minWidth: 80, maxWidth: maxVendors > 2 ? 100 : 150, width: maxVendors > 2 ? 100 : 150 }}>Quantity</th>
              {/* <th style={{ background: '#2d5ba7', color: '#fff', minWidth: 80, maxWidth: maxVendors > 2 ? 100 : 150, width: maxVendors > 2 ? 100 : 150 }}>Target Price</th> */}
              {[...Array(maxVendors)].map((_, idx) => (
                <th key={idx} style={{ background: '#2d5ba7', color: '#fff', minWidth: 160, borderTopRightRadius: idx === maxVendors - 1 ? 12 : 0 }}>
                  {`Lowest ${idx + 1}`} ({`L${idx + 1}`})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((item, idx) => {
              const productName = item.product_details?.[0]?.name || '-';
              const size = item.product_specs?.find(s => s.title === 'Size')?.value || '--';
              const spec = item.product_specs?.find(s => s.title === 'Spec')?.value || '--';
              // Sort vendors for this product by cost (excluding regrets)
              const quotingVendors = item.quotations
                .filter(q => q.id != null && q.is_regret !== 1 && q.quote_details && q.quote_details[0])
                .map(q => {
                  const details = q.quote_details[0];
                  const quantity = details.rfq_details?.find(spec => spec.title === 'Quantity')?.value || details.quantity;
                  return { ...q, cost: calculateTotal(details, quantity, normalizeFilter) };
                })
                .sort((a, b) => a.cost - b.cost);
              // For regrets, keep them in a separate map by vendor id
              const regretMap = {};
              item.quotations.filter(q => q.is_regret === 1).forEach(q => { regretMap[q.created_by] = q; });
              return (
                <tr key={item.product_id || idx} style={{ borderRadius: 8 }}>
                  <td style={{ borderRadius: 8, maxWidth: 100, width: 100 }}>{idx + 1}</td>
                  <td style={{ minWidth: 120, maxWidth: maxVendors > 2 ? 180 : 300, width: maxVendors > 2 ? 180 : 300, wordBreak: 'break-word' }}>
                    {productName.length > 30 ? <ReadMore content={productName} maxLength={30} /> : productName}
                  </td>
                  <td style={{ minWidth: 140, maxWidth: maxVendors > 2 ? 220 : 350, width: maxVendors > 2 ? 220 : 350, wordBreak: 'break-word', background: '#f8fafc', borderRadius: 6, verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%' }}>
                        <div style={{ fontWeight: 'bold', minWidth: 60, textAlign: 'left', paddingRight: 8, whiteSpace: 'nowrap' }}>Size:</div>
                        <div style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left', whiteSpace: 'pre-line' }}>
                          {size && size.length > 0 ? <ReadMore content={size} maxLength={1000} maxLines={3} /> : size}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%' }}>
                        <div style={{ fontWeight: 'bold', minWidth: 60, textAlign: 'left', paddingRight: 8, whiteSpace: 'nowrap' }}>Spec:</div>
                        <div style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left', whiteSpace: 'pre-line' }}>
                          {spec && spec.length > 0 ? <ReadMore content={spec} maxLength={1000} maxLines={3} /> : spec}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ minWidth: 80, maxWidth: maxVendors > 2 ? 100 : 150, width: maxVendors > 2 ? 100 : 150 }}>
                    {(() => {
                      const qty = item.product_specs?.find(s => s.title === 'Quantity')?.value || '-';
                      const unit = item.product_specs?.find(s => s.title === 'Unit')?.value || '';
                      return unit ? `${qty} ${unit}` : qty;
                    })()}
                  </td>
                  {/* {latest_target_price && (<td>₹{latest_target_price}</td>)} */}
                  {[...Array(maxVendors)].map((_, vIdx) => {
                    const q = quotingVendors[vIdx];
                    if (q) {
                      const vendor = q.vendor_details ? q.vendor_details[0] : (item.all_vendors && item.all_vendors.find(v => v.id === q.created_by));
                      const isFinalized = item.all_vendors && item.all_vendors.find(v => v.id === q.created_by && v.is_finalized);
                      const details = q.quote_details[0];
                      const quantity = details.rfq_details?.find(spec => spec.title === 'Quantity')?.value || details.quantity;
                      const cost = q.cost;
                      const key = `${idx}_${q.created_by}`;
                      const isOpen = breakupOpen[key];
                      const delivery = details.delivery_period;
                      const docFile = details.document_files && details.document_files[0] && details.document_files[0].file_url;
                      const comment = details.comment;
                      const missingCosts = hasMissingCosts(idx, q.created_by);
                      return (
                        <td
                          key={q.created_by}
                          style={{
                            minWidth: 200,
                            background: missingCosts
                              ? "#ff8c00"
                              : isFinalized
                              ? "#d4edda"
                              : q.is_lowest
                              ? "#ffe082"
                              : undefined,
                            color: missingCosts 
                              ? "white" 
                              : isFinalized 
                              ? "#155724" 
                              : undefined,
                            position: "relative",
                            borderRadius: 8,
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                              textAlign: "center",
                              lineHeight: 1.2,
                            }}
                          >
                            {cost}
                            <div
                              style={{
                                fontWeight: 400,
                                fontSize: 13,
                                marginTop: 2,
                                wordBreak: "break-word",
                                whiteSpace: "normal",
                              }}
                            >
                              ({vendor?.organization_name || vendor?.name})
                            </div>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <button
                              type="button"
                              onClick={() => toggleBreakup(idx, q.created_by)}
                              style={{
                                cursor: "pointer",
                                fontSize: 13,
                                color: "#0046ad",
                                background: "none",
                                border: "none",
                                padding: 0,
                                textDecoration: "underline",
                              }}
                            >
                              {isOpen ? "Hide Breakup" : "Show Breakup"}
                            </button>
                            {isOpen && (
                              <div
                                style={{
                                  marginTop: 6,
                                  maxWidth: 420,
                                  minWidth: 260,
                                  width: "100%",
                                }}
                              >
                                <table
                                  className="table has_inner_border_table table-sm mb-0"
                                  style={{
                                    background: "#f9f9f9",
                                    borderRadius: 8,
                                    tableLayout: "fixed",
                                    width: "100%",
                                  }}
                                >
                                  <tbody>
                                    <tr>
                                      <th
                                        style={{
                                          textAlign: "left",
                                          width: "50%",
                                        }}
                                      >
                                        Base Price
                                      </th>
                                      <td
                                        style={{
                                          textAlign: "right",
                                          width: "50%",
                                        }}
                                      >
                                        {addCommasToNumber(details.unit_price)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: "left" }}>
                                        Total Rate
                                      </th>
                                      <td style={{ textAlign: "right" }}>
                                        {addCommasToNumber(
                                          details.unit_price * (quantity || 1)
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: "left" }}>
                                        Packaging(
                                        {details.package_mode == "percentage"
                                          ? "IN %"
                                          : "IN ₹"}
                                        )
                                      </th>
                                      <td style={{ textAlign: "right" }}>{`${
                                        details.package_mode == "percentage"
                                          ? ""
                                          : "₹"
                                      }${addCommasToNumber(
                                        details.package_price
                                      )}${
                                        details.package_mode == "percentage"
                                          ? "%"
                                          : ""
                                      }`}</td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: "left" }}>
                                        Freight(
                                        {details.freight_mode == "percentage"
                                          ? "IN %"
                                          : "IN ₹"}
                                        )
                                      </th>
                                      <td style={{ textAlign: "right" }}>
                                        {`${
                                          details.freight_mode == "percentage"
                                            ? ""
                                            : "₹"
                                        }${addCommasToNumber(
                                          details.freight_price
                                        )}${
                                          details.freight_mode == "percentage"
                                            ? "%"
                                            : ""
                                        }`}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: "left" }}>
                                        GST(
                                        {details.tax_mode == "percentage"
                                          ? "IN %"
                                          : "IN ₹"}
                                        )
                                      </th>
                                      <td style={{ textAlign: "right" }}>
                                        {`${
                                          details.tax_mode == "percentage"
                                            ? ""
                                            : "₹"
                                        }${addCommasToNumber(details.tax)}${
                                          details.tax_mode == "percentage"
                                            ? "%"
                                            : ""
                                        }`}
                                      </td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: "left" }}>
                                        Delivery
                                      </th>
                                      <td style={{ textAlign: "right" }}>
                                        {details.delivery_period}{" "}
                                        {details.delivery_period
                                          ? "(in days)"
                                          : "-"}
                                      </td>
                                    </tr>
                                    {comment && (
                                      <tr>
                                        <th style={{ textAlign: "left" }}>
                                          Comments
                                        </th>
                                        <td style={{ textAlign: "right" }}>
                                          <ReadMore
                                            content={comment}
                                            maxLength={60}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                    {docFile && (
                                      <tr>
                                        <th style={{ textAlign: "left" }}>
                                          Files
                                        </th>
                                        <td style={{ textAlign: "right" }}>
                                          {renderFileLink(docFile, "View File")}
                                        </td>
                                      </tr>
                                    )}
                                    <tr className="is_lowest">
                                      <th style={{ textAlign: "left" }}>
                                        Sub Total
                                      </th>
                                      <td style={{ textAlign: "right" }}>
                                        {addCommasToNumber(cost)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                          {item.product_specs?.find(
                            (s) => s.title === "total_price"
                          )?.value && (
                            <div className="d-flex justify-content-center mt-1">
                              <Badge bg="success" className="d-flex gap-1 px-3">
                                <p className="fw-medium">Selling Price: </p>
                                <p className="fw-semibold">
                                  {addCommasToNumber(
                                    item.product_specs.find(
                                      (s) => s.title === "total_price"
                                    ).value
                                  )}
                                </p>
                              </Badge>
                            </div>
                          )}
                        </td>
                      );
                    } else {
                      // If no vendor for this Lx, show hyphen (blank cell)
                      return (
                        <td key={vIdx} style={{ color: '#888', textAlign: 'center', minWidth: 120, borderRadius: 8 }}>-</td>
                      );
                    }
                  })}
                  
                </tr>
              );
            })}
          </tbody>

           <tfoot>
           <tr>
             {/* Span the static columns: Sl. No, Product Name, Product Details, Quantity */}
             <td colSpan={4}
                 style={{
                   fontWeight: 700,
                   textAlign: "left",
                   overflow: "hidden",
                 }}>
               Total
             </td>
         
             {[...Array(maxVendors)].map((_, idx) => (
               <td key={`sum_${idx}`}
                   style={{
                     background: "#eef3ff",
                     fontWeight: 700,
                     textAlign: "center",
                     borderTop: "2px solid #2d5ba7",
                     minWidth: 200
                   }}>
                 {addCommasToNumber(Math.round(columnSums[idx] || 0))}
               </td>
             ))}
           </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default OverallCostComparison; 