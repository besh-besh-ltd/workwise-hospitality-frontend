import React, { useEffect, useState } from "react";
import FullLoader from "@/components/shared/FullLoader";
import { downloadQuotesDetails } from "@/services/rfq";
import ReadMore from "@/components/shared/ReadMore";

const calculateTotal = (item, quantity) => {
  let total_qty = parseInt(quantity) || 0;
  let unit_price = item.unit_price || 0;
  
  // Handle null values by defaulting to 0
  let freight_price = item.freight_price !== null ? parseFloat(item.freight_price) : 0;
  let package_price = item.package_price !== null ? parseFloat(item.package_price) : 0;
  let tax = item.tax !== null ? parseFloat(item.tax) : 0;

  let total_without_fpt = unit_price * total_qty;
  let FP = (total_without_fpt * freight_price) / 100;
  let PP = (total_without_fpt * package_price) / 100;

  let total_with_fpt = total_without_fpt + FP + PP;
  let T = (total_with_fpt * tax) / 100;

  let TotalPrice = total_with_fpt + T;
  return Math.round(TotalPrice);
}

const OverallCostComparison = ({ rfq_id, TA_Filter, freightFilter }) => {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [breakupOpen, setBreakupOpen] = useState({}); // key: `${productIdx}_${vendorId}`

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
        const data = res.data || [];
        let allVendors = (data[0]?.all_vendors || []).map(v => ({ ...v }));
        allVendors.forEach(vendor => {
          let total = 0, hasQuote = false;
          data.forEach(item => {
            const q = item.quotations.find(q => q.created_by === vendor.id && q.id != null && q.is_regret !== 1);
            if (q && q.quote_details && q.quote_details[0]) {
              hasQuote = true;
              const details = q.quote_details[0];
              const quantity = details.rfq_details?.find(spec => spec.title === 'Quantity')?.value || details.quantity;
              total += calculateTotal(details, quantity);
            }
          });
          vendor.total = hasQuote ? total : Infinity;
        });
        allVendors = allVendors.filter(v => v.total !== Infinity).sort((a, b) => a.total - b.total);
        setVendors(allVendors);
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rfq_id, TA_Filter, freightFilter]);

  if (loading) return <FullLoader />;
  if (!vendors.length || !products.length) return <h4 className="mt-4 text-center">No Quotes Yet!</h4>;

  return (
    <div className="card card-body shadow-sm p-4" style={{ borderRadius: 18, marginTop: 16 }}>
      <h3 className="fs-5 fw-bold text-center mb-2" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
        OVERALL COST COMPARISON CHART
        <div className="fw-normal" style={{ fontSize: 14, color: '#444', textTransform: 'none' }}>
          (Incl. Packaging, Freight & GST)
        </div>
      </h3>
      <div className="table-responsive">
        <table className="table table-bordered overall-table mb-0" style={{ minWidth: 900, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#2d5ba7', color: 'white', zIndex: 2 }}>
            <tr>
              <th style={{ background: '#2d5ba7', color: '#fff', borderTopLeftRadius: 12, maxWidth: 100, width: 100 }}>Sl. No</th>
              <th style={{ background: '#2d5ba7', color: '#fff', maxWidth: 300, width: 300 }}>Product Name</th>
              <th style={{ background: '#2d5ba7', color: '#fff', maxWidth: 350, width: 350 }}>Product Details</th>
              <th style={{ background: '#2d5ba7', color: '#fff', maxWidth: 100, width: 100 }}>Quantity</th>
              {vendors.map((vendor, idx) => (
                <th key={vendor.id} style={{ background: '#2d5ba7', color: '#fff', minWidth: 160, borderTopRightRadius: idx === vendors.length - 1 ? 12 : 0 }}>
                  {`L${idx + 1}`}
                  <br />
                  <span style={{ fontWeight: 400 }}>{vendor.organization_name || vendor.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((item, idx) => {
              const productName = item.product_details?.[0]?.name || '-';
              const size = item.product_specs?.find(s => s.title === 'Size')?.value || '--';
              const spec = item.product_specs?.find(s => s.title === 'Spec')?.value || '--';
              return (
                <tr key={item.product_id || idx} style={{ borderRadius: 8 }}>
                  <td style={{ borderRadius: 8, maxWidth: 100, width: 100 }}>{idx + 1}</td>
                  <td style={{ maxWidth: 350, width: 350, wordBreak: 'break-word' }}>
                    {productName.length > 30 ? <ReadMore content={productName} maxLength={30} /> : productName}
                  </td>
                  <td style={{ maxWidth: 350, width: 350, wordBreak: 'break-word', background: '#f8fafc', borderRadius: 6, verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%' }}>
                        <div style={{ fontWeight: 'bold', minWidth: 60, textAlign: 'left', paddingRight: 8, whiteSpace: 'nowrap' }}>Size:</div>
                        <div style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left', whiteSpace: 'pre-line' }}>{size}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%' }}>
                        <div style={{ fontWeight: 'bold', minWidth: 60, textAlign: 'left', paddingRight: 8, whiteSpace: 'nowrap' }}>Spec:</div>
                        <div style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left', whiteSpace: 'pre-line' }}>{spec}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ maxWidth: 100, width: 100 }}>
                    {(() => {
                      const qty = item.product_specs?.find(s => s.title === 'Quantity')?.value || '-';
                      const unit = item.product_specs?.find(s => s.title === 'Unit')?.value || '';
                      return unit ? `${qty} ${unit}` : qty;
                    })()}
                  </td>
                  {vendors.map((vendor) => {
                    const q = item.quotations.find(q => q.created_by === vendor.id);
                    const isFinalized = item.all_vendors && item.all_vendors.find(v => v.id === vendor.id && v.is_finalized);
                    if (q && q.is_regret === 1) {
                      return (
                        <td key={vendor.id} style={{ background: '#d32f2f', color: '#fff', fontWeight: 600, textAlign: 'center', minWidth: 120, borderRadius: 8 }} title={q.regret_reason || 'Vendor Regretted'}>
                          REGRET
                        </td>
                      );
                    }
                    if (q && q.quote_details && q.quote_details[0]) {
                      const details = q.quote_details[0];
                      const quantity = details.rfq_details?.find(spec => spec.title === 'Quantity')?.value || details.quantity;
                      const cost = calculateTotal(details, quantity);
                      const key = `${idx}_${vendor.id}`;
                      const isOpen = breakupOpen[key];
                      const delivery = details.delivery_period;
                      const docFile = details.document_files && details.document_files[0] && details.document_files[0].file_url;
                      const comment = details.comment;
                      return (
                        <td key={vendor.id} style={{ minWidth: 160, background: isFinalized ? '#d4edda' : (q.is_lowest ? '#ffe082' : undefined), color: isFinalized ? '#155724' : undefined, position: 'relative', borderRadius: 8 }}>
                          <div style={{ fontWeight: 600 }}>{cost} <span style={{ fontWeight: 400 }}>({vendor.organization_name || vendor.name})</span></div>
                          <div style={{ marginTop: 4 }}>
                            <button
                              type="button"
                              onClick={() => toggleBreakup(idx, vendor.id)}
                              style={{ cursor: 'pointer', fontSize: 13, color: '#0046ad', background: 'none', border: 'none', padding: 0, textDecoration: 'underline' }}
                            >
                              {isOpen ? 'Hide Breakup' : 'Show Breakup'}
                            </button>
                            {isOpen && (
                              <div style={{ marginTop: 6 }}>
                                <table className="table table-sm mb-0" style={{ background: '#f9f9f9', borderRadius: 8 }}>
                                  <tbody>
                                    <tr>
                                      <th style={{ textAlign: 'left', width: '50%' }}>Base Price</th>
                                      <td style={{ textAlign: 'right', width: '50%' }}>{details.unit_price}</td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: 'left' }}>Packaging (%)</th>
                                      <td style={{ textAlign: 'right' }}>{details.package_price || 0}%</td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: 'left' }}>Freight (%)</th>
                                      <td style={{ textAlign: 'right' }}>{details.freight_price || 0}%</td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: 'left' }}>GST (%)</th>
                                      <td style={{ textAlign: 'right' }}>{details.tax || 0}%</td>
                                    </tr>
                                    <tr>
                                      <th style={{ textAlign: 'left' }}>Total</th>
                                      <td style={{ textAlign: 'right' }}>{cost}</td>
                                    </tr>
                                  </tbody>
                                </table>
                                {comment && (
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%', marginTop: 8 }}>
                                    <div style={{ fontWeight: 'bold', minWidth: 70, textAlign: 'left', paddingRight: 8, whiteSpace: 'nowrap' }}>Comment:</div>
                                    <div style={{ flex: 1, wordBreak: 'break-word', textAlign: 'right', whiteSpace: 'pre-line' }}><ReadMore content={comment} maxLength={60} /></div>
                                  </div>
                                )}
                                {delivery && (
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%', marginTop: 8 }}>
                                    <div style={{ fontWeight: 'bold', minWidth: 70, textAlign: 'left', paddingRight: 8, whiteSpace: 'nowrap' }}>Delivery:</div>
                                    <div style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left', whiteSpace: 'pre-line' }}>{delivery} weeks</div>
                                  </div>
                                )}
                                {docFile && (
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%', marginTop: 8 }}>
                                    <div style={{ fontWeight: 'bold', minWidth: 70, textAlign: 'left', paddingRight: 8, whiteSpace: 'nowrap' }}>Document:</div>
                                    <div style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left', whiteSpace: 'pre-line' }}><a href={docFile} target="_blank" rel="noopener noreferrer" style={{ color: '#0046ad', textDecoration: 'underline' }}>View File</a></div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {item.product_specs?.find(s => s.title === 'total_price')?.value && (
                            <div style={{ fontSize: '0.9em', color: '#0046ad', marginTop: 2 }}>Total: {item.product_specs.find(s => s.title === 'total_price').value}</div>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td key={vendor.id} style={{ color: '#888', textAlign: 'center', minWidth: 120, borderRadius: 8 }}>-</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OverallCostComparison; 