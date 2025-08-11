import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-regular-svg-icons";
import { faAward, faPhone } from "@fortawesome/free-solid-svg-icons";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import Dropdown from "react-bootstrap/Dropdown";
import CommonModal from "@/components/modal/CommonModal";
import ReadMore from "@/components/shared/ReadMore";
import { calculateTotal, extractfileName } from "@/utils/sharedFunctions";
import { useRouter } from "next/router";
import QuoteHistoryModal from "@/components/modal/QuoteHistoryModal";
import FinalizeVendorModal from "./FinalizeVendorModal";
import FinalizeHistoryModal from "./FinalizeHistoryModal";

const QuoteCompareTable = ({
  quotations,
  quantity,
  handleFinalize,
  proditem,
  alreadyFinalized,
  isRfqClosed = false,
  availableBudget,
  normalizeFilter
}) => {
  // Common state to manage all the modals in the whole component
  const [activeModal, setActiveModal] = useState(null);

  const [currentItem, setCurrentItem] = useState(null);
  const router = useRouter();
  const { rfq } = router.query;
  const [vendorData, setVendorData] = useState({});
  const [lowestQuote, setLowestQuote] = useState(null);
  const [quotehistorydata, setQuotehistorydata] = useState({
    product_details:[],
    previous_quotes:[]
  });
  useEffect(() => {
    calculateLowestQuote();
  }, []);

  const calculateLowestQuote = () => {
    const removeRegretQuotes = quotations.filter((item) => item.quote_details.is_regret != 1);
    if (removeRegretQuotes.length > 0) {
      const quoteWithLowestPrice = removeRegretQuotes?.reduce((lowest, currentItem) => {
        const curItemQuoteDetails = currentItem;
          const curItemVendorDetails = curItemQuoteDetails.quote_details.vendor_details;

          const lowestQuoteDetails = lowest;
          const lowestVendorDetails = lowestQuoteDetails.quote_details.vendor_details;

          const curQuantity = proditem.product_details[0].rfq_details.find(spec => spec.title == 'Quantity')?.value || curItemQuoteDetails.quantity
          const lowQuantity = proditem.product_details[0].rfq_details.find(spec => spec.title == 'Quantity')?.value || lowestQuoteDetails.quantity

          const currentTotal = calculateTotal(curItemQuoteDetails, curQuantity, normalizeFilter)
          const lowestTotal = calculateTotal(lowestQuoteDetails, lowQuantity, normalizeFilter)

          if (curItemQuoteDetails.unit_price > 0) {
            let curLowest = lowest;
            if (currentTotal < lowestTotal) curLowest = currentItem;
            else if (currentTotal == lowestTotal) {
              const curPrevWorked = curItemVendorDetails.prev_worked == 1;
              const lowestPrevWorked = lowestVendorDetails.prev_worked == 1;

              if (curPrevWorked && !lowestPrevWorked) curLowest = currentItem;
              else if (!curPrevWorked && lowestPrevWorked) curLowest = lowest;
              else {
                const curTimestamp = new Date(
                  currentItem.quote_details.timestamp.slice(0, 23)
                );
                const lowestTimestamp = new Date(
                  lowest.quote_details.timestamp.slice(0, 23)
                );

                if (curTimestamp < lowestTimestamp) curLowest = currentItem;
                else curLowest = lowest;
              }
            }

            return curLowest;
          }
          return lowest;
      });
      setLowestQuote(quoteWithLowestPrice);
    }
  };

  const renderFileLink = (files,lable = "view file") => {
    return files.map((file, index) => (
      <a key={index} href={file.file_url} target="_blank" className="page-link text-truncate mb-1" style={{ maxWidth: "200px" }}>
        <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
        {lable}
      </a>
    ));
  };

  const handleViewFinalizationHistory = () => {
    setActiveModal('finalize_history');
  }

  return (
    <>
      <div
        className="table-content"
        key={`${proditem.id}_${proditem.product_id}_${proditem.variant}`}
      >
        <div className="table-elements">
          <div className="table-row">
            <div className="table-col">
              <div className="table-si-row "></div>
              <div className="table-si-row table-grey-row">Quantity</div>
              <div className="table-si-row">Base Price</div>
              <div className="table-si-row fw-semibold table-grey-row">
                Sub Total Rate
              </div>
              <div className="table-si-row">Packaging (% / ₹)</div>
              <div className="table-si-row table-grey-row">Freight (% / ₹)</div>
              <div className="table-si-row">GST (% / ₹)</div>
              <div className="table-si-row fw-semibold table-grey-row">
                Total Rate
              </div>
              <div className="table-si-row">Delivery Period (In Days)</div>
              <div className="table-si-row table-grey-row">Comments</div>
              <div className="table-si-row">Vendor Documents</div>
              <div className="table-si-row table-grey-row">
                Terms & Conditions
              </div>
              <div className="table-si-row">Payment Terms</div>
            </div>
            {quotations &&
              quotations.length > 0 &&
              quotations.map((item, index) => {
                // Check if the quote is updated
                let itemUpdated =
                  item.previous_quotes?.length > 0
                    ? item.previous_quotes[item.previous_quotes.length - 1]
                    : null;

                const rfqDetails = proditem?.product_details[0];
                const quantity =
                  rfqDetails?.rfq_details.find(
                    (spec) => spec.title == "Quantity"
                  )?.value || item.quantity;

                return (
                  <div
                    className="table-col"
                    key={`tab_qq_${item.quote_id}_${index}`}
                  >
                    <div
                      className="table-si-row table-dark-row "
                      style={{ overflow: "visible" }}
                    >
                      <span
                        className="d-block text-center fw-bold fs-5"
                        style={{ width: "100%" }}
                      >
                        {item?.quote_details?.vendor_details
                          ?.organization_name ||
                          item?.quote_details?.vendor_details?.name}
                      </span>

                      {item?.quote_details?.is_regret == 1 && (
                        <div className="vendor_regreted_quote">
                          <div>
                            <span
                              style={{ fontWeight: "bold", fontSize: "1rem" }}
                            >
                              RFQ Declined by the vendor
                            </span>
                            <span style={{ fontSize: "0.85rem" }}>
                              {item?.quote_details?.regret_reason || ""}
                            </span>
                          </div>
                        </div>
                      )}

                      <Dropdown className="dots-nav-anchor">
                        <Dropdown.Toggle className="dots-nav">
                          <Image
                            src="/assets/images/3-dots-nav.svg"
                            width={4}
                            height={18}
                            alt="Nav"
                          />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {alreadyFinalized?.length == 0 &&
                            item?.quote_details?.is_regret == 0 &&
                            !item.finalization &&
                            !isRfqClosed && (
                              <Dropdown.Item
                                className="negotiate-link"
                                href={`/dashboard/buyer/query?rfq_id=${rfq}&role=buyer`}
                              >
                                Negotiate
                              </Dropdown.Item>
                            )}
                          <Dropdown.Item
                            target="_blank"
                            href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${item?.quote_details?.vendor_details?.id}`}
                            className="view-link"
                          >
                            View Profile
                          </Dropdown.Item>
                          {!item.quote_details.is_regret == 1 &&
                            (!item.finalization ||
                              item.finalization.winning_vendor.id !=
                                item?.quote_details?.created_by) && (
                              <Dropdown.Item
                                href="#"
                                onClick={(e) => {
                                  setActiveModal("finalize");
                                  setCurrentItem(item);
                                  // handleFinalize(item, proditem);
                                }}
                                className="finalize-link"
                              >
                                Finalize
                              </Dropdown.Item>
                            )}

                          {item.previous_quotes?.length > 0 && (
                            <Dropdown.Item
                              href="#"
                              onClick={() => {
                                setActiveModal("quote_history");
                                setQuotehistorydata({
                                  product_details: proditem.product_details,
                                  previous_quotes: item.previous_quotes,
                                });
                              }}
                              className="history-link"
                            >
                              Quote History
                            </Dropdown.Item>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                    <div className="table-si-row table-grey-row">
                      {quantity}
                    </div>
                    <div className="table-si-row">
                      {item.unit_price}
                      {itemUpdated &&
                        itemUpdated.unit_price != item.unit_price && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {itemUpdated?.unit_price}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row table-grey-row fw-semibold">
                      {quantity * item.unit_price}
                      {itemUpdated &&
                        (itemUpdated.quantity != quantity ||
                          itemUpdated.unit_price != item.unit_price) && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {quantity * itemUpdated?.unit_price}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row">
                      {item?.package_price !== null
                        ? item.package_mode == "percentage"
                          ? `${item?.package_price || 0} %`
                          : `₹ ${item?.package_price || 0}`
                        : "0 %"}

                      {itemUpdated &&
                        itemUpdated.package_price != item.package_price && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {itemUpdated?.package_price !== null
                              ? itemUpdated.package_mode == "percentage"
                                ? `${itemUpdated?.package_price || 0} %`
                                : `₹ ${itemUpdated?.package_price || 0}`
                              : "0 %"}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row table-grey-row">
                      {item?.freight_price !== null
                        ? item.freight_mode == "percentage"
                          ? `${item?.freight_price || 0} %`
                          : `₹ ${item?.freight_price || 0}`
                        : "0 %"}

                      {itemUpdated &&
                        itemUpdated.freight_price != item.freight_price && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {itemUpdated?.freight_price !== null
                              ? itemUpdated.freight_mode == "percentage"
                                ? `${itemUpdated?.freight_price || 0} %`
                                : `₹ ${itemUpdated?.freight_price || 0}`
                              : "0 %"}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row">
                      {item?.tax !== null
                        ? item.tax_mode == "percentage"
                          ? `${item?.tax || 0} %`
                          : `₹ ${item?.tax || 0}`
                        : "0 %"}

                      {itemUpdated && itemUpdated.tax != item.tax && (
                        <span className="d-block buyer-individual-quote-compare-text-strike ">
                          {itemUpdated?.tax !== null
                            ? itemUpdated.tax_mode == "percentage"
                              ? `${itemUpdated?.tax || 0} %`
                              : `₹ ${itemUpdated?.tax || 0}`
                            : "0 %"}
                        </span>
                      )}
                    </div>
                    <div
                      className={`table-si-row fw-semibold  ${
                        item.is_lowest
                          ? "bg-success text-white d-flex justify-content-between "
                          : "table-grey-row"
                      }`}
                    >
                     {calculateTotal(item, quantity, normalizeFilter)}
                       {itemUpdated &&
                        calculateTotal(itemUpdated, quantity) !=
                          calculateTotal(item, quantity) && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {calculateTotal(itemUpdated, quantity)}
                          </span>
                        )}
                      {item.is_lowest && (
                        <span className="d-flex align-items-center gap-2 border border-light rounded-3 text-white px-3 py-2">
                          <FontAwesomeIcon icon={faAward} fontSize={16} />
                          Lowest
                        </span>
                      )}
                    </div>
                    <div className="table-si-row">
                      {item.delivery_period != ""
                        ? parseInt(item.delivery_period) <= 1
                          ? `${item.delivery_period || 0} Day`
                          : `${item.delivery_period || 0} Days`
                        : "--"}
                      {itemUpdated &&
                        itemUpdated.delivery_period != item.delivery_period && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {parseInt(itemUpdated.delivery_period) <= 1
                              ? `${itemUpdated.delivery_period || 0} Day`
                              : `${itemUpdated.delivery_period || 0} Days`}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row table-grey-row">
                      {item?.comment ? (
                        <ReadMore content={item?.comment} maxLines={2} />
                      ) : (
                        "--"
                      )}
                      {item?.global_comment ? (
                        <ReadMore content={item?.global_comment} maxLines={2} />
                      ) : (
                        "--"
                      )}
                    </div>
                    <div className="table-si-row">
                      {item.document_files ? (
                        <>{renderFileLink(item.document_files)}</>
                      ) : (
                        <span>N/A</span>
                      )}
                    </div>
                    <div className="table-si-row table-grey-row">
                      {item.global_document_files ? (
                        <>
                          {renderFileLink(
                            item.global_document_files,
                            "view file"
                          )}
                        </>
                      ) : (
                        <span>N/A</span>
                      )}
                    </div>
                    <div className="table-si-row">
                      {item?.global_payment_term ? (
                        <ReadMore
                          content={item?.global_payment_term}
                          maxLines={2}
                        />
                      ) : (
                        "NA"
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      {/* Lowest bid area */}
      {alreadyFinalized?.length == 0 ? (
        <div className="quote-sec-bottom">
          {lowestQuote && (
            <div className="quote-sec-bottom-con">
              <div>
                <span>
                  <b>Lowest Bid</b> :{" "}
                  {lowestQuote?.quote_details?.vendor_details
                    ?.organization_name ||
                    lowestQuote?.quote_details?.vendor_details?.name}
                </span>
                <span>
                  <Link
                    href={
                      "mailto:" +
                      lowestQuote?.quote_details?.vendor_details?.email
                    }
                  >
                    <FontAwesomeIcon icon={faEnvelope} />
                  </Link>
                </span>

                <span>
                  <Link
                    href={
                      "tel: " +
                      lowestQuote[0]?.quote_details?.vendor_details?.mobile
                    }
                  >
                    <FontAwesomeIcon icon={faPhone} />
                  </Link>
                </span>
              </div>
              {isRfqClosed ? (
                <button
                  type="submit"
                  className="btn btn-danger btn-outlined"
                  disabled
                >
                  RFQ has been Closed
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-secondary"
                  onClick={(e) => {
                    setActiveModal('finalize')
                    setCurrentItem(lowestQuote);
                    // handleFinalize(lowestQuote, proditem)
                  }}
                >
                  Finalize
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="quote-sec-bottom">
          <div className="quote-sec-bottom-con">
            <div>
              {" "}
              <span>
                <b>Finalized vendor</b> :{" "}
                {alreadyFinalized[0]?.finalization?.winning_vendor
                  ?.organization_name ??
                  alreadyFinalized[0]?.finalization?.winning_vendor
                    ?.company_name}
              </span>
              <span>
                <Link
                  href={
                    "mailto:" +
                    alreadyFinalized[0]?.finalization?.winning_vendor?.email
                  }
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                </Link>
              </span>
              <span>
                <Link
                  href={
                    "tel: " +
                    alreadyFinalized[0]?.finalization?.winning_vendor?.mobile
                  }
                >
                  <FontAwesomeIcon icon={faPhone} />
                </Link>
              </span>
              {Array.isArray(proditem.finalization_history) && proditem.finalization_history.length > 0 && (
                <button
                  className="btn btn-sm btn-success p-2"
                  style={{ minWidth: "230px", marginLeft: "10px" }}
                  onClick={handleViewFinalizationHistory}
                >
                  Finalization History
                </button>
              )}
            </div>

            <div>
              {" "}
              <span>
                <b>Finalized By</b> :{" "}
                {alreadyFinalized[0]?.finalization?.finilized_by?.name}
              </span>
              <span>
                <Link
                  href={
                    "mailto:" +
                    alreadyFinalized[0]?.finalization?.finilized_by?.email
                  }
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                </Link>
              </span>
              <span>
                <Link
                  href={
                    "tel: " +
                    alreadyFinalized[0]?.finalization?.finilized_by?.mobile
                  }
                >
                  <FontAwesomeIcon icon={faPhone} />
                </Link>
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Lowest bid area end */}

      {/* ------------- Show Vendors contact info in Modal ------------- */}
      {activeModal == 'common' && (
        <CommonModal
          data={{
            title: "Contact Information",
            email: vendorData.email,
            mobile: vendorData.mobile,
          }}
          openCommonModal={activeModal == 'common'}
          closeModal={() => setActiveModal(null)}
        />
      )}
      {activeModal == 'quote_history' && (
        <QuoteHistoryModal
          showModal={activeModal == 'quote_history'}
          closeModal={() => {
            setActiveModal(null);
          }}
          quotehistorydata={quotehistorydata}
        />
      )}
      <FinalizeVendorModal
        show={activeModal == 'finalize'}
        onHide={() => setActiveModal(null)}
        onConfirm={() => {
          handleFinalize(currentItem, proditem);
          setActiveModal(null)
        }}
        vendorName={
          currentItem?.quote_details?.vendor_details?.organization_name ||
          currentItem?.quote_details?.vendor_details?.name
        }
        quotedPrice={currentItem?.total_price}
        productName={proditem?.product_details?.[0].product_name}
        alreadyFinalized={alreadyFinalized}
        availableBudget={availableBudget}
      />
      <FinalizeHistoryModal
        show={proditem.finalization_history.length > 0 && activeModal == 'finalize_history'}
        onHide={() => setActiveModal(null)}
        history={proditem.finalization_history}
        quantity={proditem.product_details[0].rfq_details.find(spec => spec.title == 'Quantity')?.value}
        calculateTotal={calculateTotal}
      />
    </>
  );
};

export default QuoteCompareTable;
