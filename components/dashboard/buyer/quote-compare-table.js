import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-regular-svg-icons";
import { faAward, faPhone } from "@fortawesome/free-solid-svg-icons";
import Dropdown from "react-bootstrap/Dropdown";
import CommonModal from "@/components/modal/CommonModal";
import ReadMore from "@/components/shared/ReadMore";

const QuoteCompareTable = ({
  quotations,
  quantity,
  handleFinalize,
  proditem,
  alreadyFinalized
}) => {

  const [openCommonModal, setOpenCommonModal] = useState(false);
  const [vendorData, setVendorData] = useState({});
  const [lowestQuote, setLowestQuote] = useState(null);

  useEffect(() => {
    calculateLowestQuote();
  }, []);

  const calculateLowestQuote = () => {
    const removeRegretQuotes = quotations.filter((item) => item.quote_details.is_regret != 1);
    const quoteWithLowestPrice = removeRegretQuotes?.reduce((lowest, quote) => {
      return (lowest.total_price < quote.total_price) ? lowest : quote;
    });
    setLowestQuote(quoteWithLowestPrice);
  };

  const handleNegotiate = (item) => {
    setVendorData(item?.quote_details?.vendor_details);
    setOpenCommonModal(true);
  }

  return (
    <>
      <div className="table-content" key={`${proditem.id}_${proditem.product_id}_${proditem.variant}`}>
        <div className="table-elements">
          <div className="table-row">
            <div className="table-col">
              <div className="table-si-row"></div>
              <div className="table-si-row">Quantity</div>
              <div className="table-si-row">Unit Rate</div>
              <div className="table-si-row table-grey-row">Total Rate</div>
              <div className="table-si-row">Packaging (%)</div>
              <div className="table-si-row">Freight (%)</div>
              <div className="table-si-row">GST (%)</div>
              <div className="table-si-row  table-yellow-row">Sub Total</div>
              <div className="table-si-row">Delivery Period (In Weeks)</div>
              <div className="table-si-row">Comments</div>
            </div>
            {quotations &&
              quotations.length > 0 &&
              quotations.map((item, index) => {
                return (
                  <div className="table-col" key={`tab_qq_${item.quote_id}_${index}`}>
                    <div className="table-si-row table-dark-row">
                      <span>
                        {item?.quote_details?.vendor_details?.organization_name}
                      </span>

                      {item?.quote_details?.is_regret == 1 && (
                        <div className="vendor_regreted_quote">
                          {" "}
                          <span>RFQ Declined by the vendor</span>{" "}
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
                          {alreadyFinalized?.length == 0 && item?.quote_details?.is_regret == 0 &&
                            !item.finalization && (
                              <Dropdown.Item
                                className="negotiate-link"
                                onClick={() => handleNegotiate(item)}
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
                          {alreadyFinalized?.length == 0 && !item.finalization &&
                            item?.quote_details?.is_regret == 0 && (
                              <Dropdown.Item
                                href="#"
                                onClick={(e) =>
                                  handleFinalize(e, item, proditem)
                                }
                                className="finalize-link"
                              >
                                Finalize
                              </Dropdown.Item>
                            )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                    <div className="table-si-row">{item.quantity}</div>
                    <div className="table-si-row">{item.unit_price}</div>
                    <div className="table-si-row table-grey-row">
                      {item.quantity * item.unit_price}
                    </div>
                    <div className="table-si-row">{item.package_price} %</div>
                    <div className="table-si-row">{item.freight_price} %</div>
                    <div className="table-si-row">{item.tax} %</div>
                    <div className={`table-si-row  ${item.is_lowest ? "bg-success text-white d-flex justify-content-between " : "table-yellow-row"}`}>
                      {item.total_price}
                      {item.is_lowest &&
                        <span className="d-flex align-items-center gap-2 border border-light rounded-3 text-white px-3 py-2" >
                          <FontAwesomeIcon icon={faAward} fontSize={16} />
                          Lowest
                        </span>
                      }
                    </div>
                    <div className="table-si-row">
                      {parseInt(item.delivery_period) <= 1
                        ? `${item.delivery_period} Week`
                        : `${item.delivery_period} Weeks`}
                    </div>
                    <div className="table-si-row">
                      {item?.comment.length > 60
                        ? <ReadMore content={item?.comment} maxLength={55} textSmall={false} />
                        : item.comment
                      }
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
              <span>
                <b>Lowest Bid</b> :{" "}
                {
                  lowestQuote?.quote_details?.vendor_details
                    ?.organization_name
                }
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

              <button
                type="submit"
                className="btn btn-secondary"
                onClick={(e) =>
                  handleFinalize(e, lowestQuote, proditem)
                }
              >
                Finalize
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="quote-sec-bottom">
          <div className="quote-sec-bottom-con">
            <span>
              <b>Finalized vendor</b> :{" "}
              {
                alreadyFinalized[0]?.finalization?.winning_vendor
                  ?.organization_name
              }
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
          </div>
        </div>
      )}
      {/* Lowest bid area end */}

      {/* ------------- Show Vendors contact info in Modal ------------- */}
      {openCommonModal &&
        <CommonModal
          data={{
            title: "Contact Information",
            email: vendorData.email,
            mobile: vendorData.mobile
          }}
          openCommonModal={openCommonModal}
          closeModal={() => setOpenCommonModal(false)}
        />
      }
    </>
  );
};

export default QuoteCompareTable;
