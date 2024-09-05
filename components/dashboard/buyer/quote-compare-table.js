import React, { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-regular-svg-icons";
import { faPhone } from "@fortawesome/free-solid-svg-icons";
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
  // var alreadyFinalized = [];
  const [openCommonModal, setOpenCommonModal] = useState(false);
  const [vendorData, setVendorData] = useState({});

  useEffect(() => { console.log(proditem) }, []);
  // alreadyFinalized = proditem.quotations.filter((item) => item.finalization != null);

  const getLowestQuote = () => {
    // let fq = quotations.filter((item) => item?.quote_details?.is_regret == 0);

    const quoteWithLowestPrice = quotations?.reduce((lowest, quote) => {
      return (lowest.total_price < quote.total_price) ? lowest : quote;
    });

    // console.log(fq)
    // console.log(quoteWithLowestPrice)
    const fq = [quoteWithLowestPrice];
    return fq.length > 0 ? fq : null;

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
                    {item?.quote_details?.is_regret == 1 && (
                      <div className="vendor_regreted_quote">
                        {" "}
                        <span>RFQ Declined by the vendor</span>{" "}
                      </div>
                    )}
                    <div className="table-si-row table-dark-row">
                      <span>
                        {item?.quote_details?.vendor_details?.organization_name}
                      </span>
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
                          {item?.quote_details?.is_regret == 0 &&
                            !item.finalization && (
                              <Dropdown.Item
                                // href={
                                //   "tel:+91" +
                                //   quotations[0]?.quote_details?.vendor_details
                                //     ?.mobile
                                // }                                
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
                          {!item.finalization &&
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
                    <div className="table-si-row  table-yellow-row">
                      {item.total_price}
                    </div>
                    <div className="table-si-row">
                      {parseInt(item.delivery_period) <= 1
                        ? `${item.delivery_period} Week`
                        : `${item.delivery_period} Weeks`}
                    </div>
                    <div className="table-si-row">
                      {item?.comment.length > 60 
                        ? <ReadMore content={item?.comment} maxLength={60} textSmall={false} />
                        : item.comment
                      }
                      {/* {
                        <ReadMore
                          content={"All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable."}
                          maxLength={60}
                          textSmall={false}
                        />
                      } */}
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
          {getLowestQuote() != null && (
            <div className="quote-sec-bottom-con">
              <span>
                <b>Lowest Bid</b> :{" "}
                {
                  getLowestQuote()[0]?.quote_details?.vendor_details
                    ?.organization_name
                }
              </span>
              <span>
                <Link
                  href={
                    "mailto:" +
                    getLowestQuote()[0]?.quote_details?.vendor_details?.email
                  }
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                </Link>
              </span>

              <span>
                <Link
                  href={
                    "tel:+91" +
                    getLowestQuote()[0]?.quote_details?.vendor_details?.mobile
                  }
                >
                  <FontAwesomeIcon icon={faPhone} />
                </Link>
              </span>

              <button
                type="submit"
                className="btn btn-secondary"
                onClick={(e) =>
                  handleFinalize(e, getLowestQuote()[0], proditem)
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
                  "tel:+91" +
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
            vendorData
          }}
          openCommonModal={openCommonModal}
          closeModal={() => setOpenCommonModal(false)}
        />
      }
    </>
  );
};

export default QuoteCompareTable;
