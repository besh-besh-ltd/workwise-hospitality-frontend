import React, { useEffect, useState } from "react";
import Link from "next/link";
import { faEdit, faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { Router, useRouter } from "next/router";
import { closeRFQ, getAllClauses, getRFQById, sendQuotation } from "@/services/rfq";
import Loader from "@/components/shared/Loader";
import PlaceholderLoading from "react-placeholder-loading";
import { faCircleExclamation, faDownload } from "@fortawesome/free-solid-svg-icons";
import moment from "moment";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";
import ReadMore from "@/components/shared/ReadMore";
import { checkBidExpired, extractfileName } from "@/utils/sharedFunctions";
import { renderFileLink } from "@/utils/elementFunctions";
import storageInstance from "@/utils/storageInstance";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import { toast } from "react-toastify";

const RfqManagementPreview = () => {
  const router = useRouter();
  const { id, type, token } = router.query;
  const [rfqDetails, setrfqDetails] = useState(null);
  const [loading, setloading] = useState(false);
  const [enableBuyerView, setEnableBuyerView] = useState(false);
  const [closeRFqLoading, setcloseRFqLoading] = useState(false);
  const [isSubmitAble, setIsSubmitable] = useState(true);
  const [productleftforbid, setproductleftforbid] = useState(true);
  const [regretModal, setregretModal] = useState(false);
  const [submitLoading, setsubmitLoading] = useState(false);
  const [currentLowest, setCurrentLowest] = useState(null);
  const [buyerClauses, setBuyerClauses] = useState(null);
  const [clauseMap, setClauseMap] = useState(null);
  const [quoteDisabled, setQuoteDisabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  // New state variables for enhanced RA logic
  const [isReverseAuctionActive, setIsReverseAuctionActive] = useState(false);
  const [showLowestPrice, setShowLowestPrice] = useState(false);
  const [wasEndDatePassed, setWasEndDatePassed] = useState(false);
  const [raStatusChanged, setRaStatusChanged] = useState(false);

  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [isLoggedIn, setisLoggedIn] = useState(false);

  useEffect(() => {
    if (id) {
      getRFQdetails();
      getRFQClauses();
    }
  }, [id]);

  useEffect(() => {
    if (type === "buyer-view") {
      setEnableBuyerView(true);
    }

    const token = storageInstance.getStorage("token");
    if (token) {
      setisLoggedIn(true);
    }

    if (redirectAfterLogin) {
      router.push(redirectAfterLogin);
      setRedirectAfterLogin(null);
    }
  }, [router]);

  useEffect(() => {
    if (rfqDetails && buyerClauses) {
      let c_map = new Map();
      rfqDetails.products?.map((pItem) => {
        c_map.set(pItem.id, false);
      })

      buyerClauses?.map((pItem) => {
        c_map.set(pItem.rfq_product_id, true);
      })
      setClauseMap(c_map);
    }

  }, [rfqDetails, buyerClauses])

  useEffect(() => {
    if (rfqDetails && rfqDetails.terms) {
      console.log("RFQ Terms Debug:", {
        count: rfqDetails.terms.length,
        terms: rfqDetails.terms.map(t => ({
          id: t.id,
          name: t.name,
          // Include a sample of other properties that might exist
          properties: {
            term_id: t.term_id,
            term_text: t.term_text,
            term_content: t.term_content,
            content: t.content
          }
        }))
      });
    }
  }, [rfqDetails?.terms]);

  // Notify user when RA status changes and allows quote submission again
  useEffect(() => {
    if (raStatusChanged && isReverseAuctionActive && wasEndDatePassed) {
      toast.info("The reverse auction has started. You can send quotes again.", {
        position: "top-right",
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setRaStatusChanged(false);
    }
  }, [raStatusChanged, isReverseAuctionActive, wasEndDatePassed]);

  const getRFQdetails = () => {
    setloading(true);
    getRFQById(id, token)
      .then((res) => {
        setloading(false);
        let val = checkBidExpired(res.data?.bid_end_date);
        setIsSubmitable(!val);
        
        // Normalize terms data to ensure consistent structure and content
        if (res.data && res.data.terms && Array.isArray(res.data.terms)) {
          res.data.terms = res.data.terms.map(term => {
            // Get term content with comprehensive fallbacks
            const termContent = 
              term.term_content || // First try term_content
              term.name || // Then try name
              (term.content && Array.isArray(term.content) && term.content[0]?.title) || // Then try content array
              term.term_text || // Then try term_text
              (term.original?.term_content) || // Then try original term content
              (term.original?.name) || // Then try original name
              (term.original?.content && Array.isArray(term.original.content) && term.original.content[0]?.title) || // Then try original content
              `Term ${term.id || 'Unknown'}`; // Fallback to ID
            
            // Return normalized term object
            return {
              id: term.id || term.term_id,
              name: termContent,
              term_content: termContent,
              // Keep original data for reference
              original: term.original || term
            };
          });
        }
        
        setrfqDetails(res.data);
        checkIfQuotationSendIsPossible(res.data);
        updatecurrentLowest(res.data?.products);
      })
      .catch((error) => {
        setloading(false);
        console.error("Error fetching RFQ details:", error);
      });
  };

  const updatecurrentLowest = (products) => {
    if (products && Array.isArray(products)) {
      const hasLowestQuotation = products.some(product => product.lowest_quotation !== null);
      setCurrentLowest(hasLowestQuotation && showLowestPrice);
    } else {
      setCurrentLowest(null);
    }
  };

  const getRFQClauses = async () => {
    try {
      const res = await getAllClauses(id);
      setBuyerClauses(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRFqClose = (e) => {
    setcloseRFqLoading(true);
    e.preventDefault();
    closeRFQ(id)
      .then(() => {
        getRFQdetails();
        setcloseRFqLoading(false);
      })
      .catch((err) => {
        setcloseRFqLoading(false);
      });
  };

  const checkIfQuotationSendIsPossible = (rfqd) => {
    // Check if all products are finalized
    if (rfqd?.finalizations?.length === rfqd?.products?.length) {
      setproductleftforbid(false);
    } else {
      setproductleftforbid(true);
    }
    
    // Get current date/time and parse all the relevant dates
    const now = new Date();
    const bidEndDate = rfqd?.bid_end_date ? new Date(rfqd.bid_end_date) : null;
    const raStartDate = rfqd?.ra_start_date ? new Date(rfqd.ra_start_date) : null;
    const raEndDate = rfqd?.ra_end_date ? new Date(rfqd.ra_end_date) : null;
    const isReverseAuction = rfqd?.reverse_auction === 1;
    
    // Determine if bid end date is passed
    const isBidEndDatePassed = bidEndDate && now > bidEndDate;
    // Store if end date was passed (for notifications)
    const previousEndDatePassed = wasEndDatePassed;
    setWasEndDatePassed(isBidEndDatePassed);
    
    // Determine if reverse auction is active
    const isRaActive = isReverseAuction && raStartDate && 
      now >= raStartDate && 
      (!raEndDate || now <= raEndDate);
    
    // Check if RA status changed from inactive to active
    if (isRaActive && !isReverseAuctionActive && previousEndDatePassed) {
      setRaStatusChanged(true);
    }
    
    setIsReverseAuctionActive(isRaActive);
    
    // Show lowest price only during active reverse auction
    const shouldShowLowestPrice = isRaActive;
    setShowLowestPrice(shouldShowLowestPrice);
    
    // Update the currentLowest state based on products and visibility
    if (rfqd?.products) {
      const hasLowestQuotation = rfqd.products.some(product => 
        product.lowest_quotation !== null
      );
      setCurrentLowest(hasLowestQuotation && shouldShowLowestPrice);
    }
    
    let quoteSubmissionDisabled = false;
    let statusMessage = "";
    
    // Determine quote submission status and message
    if (rfqd.status === 2) {
      quoteSubmissionDisabled = true;
      statusMessage = "RFQ is Closed";
    } else if (!productleftforbid) {
      quoteSubmissionDisabled = true;
      statusMessage = "All Products are Finalized";
    } else if (isBidEndDatePassed) {
      if (isReverseAuction) {
        if (isRaActive) {
          quoteSubmissionDisabled = false;
          statusMessage = "Reverse Auction is Active";
        } else if (raStartDate && now < raStartDate) {
          quoteSubmissionDisabled = true;
          statusMessage = "Waiting for Reverse Auction to Start";
        } else if (raEndDate && now > raEndDate) {
          quoteSubmissionDisabled = true;
          statusMessage = "Reverse Auction has Ended";
        } else {
          quoteSubmissionDisabled = true;
          statusMessage = "Bidding Period has Ended";
        }
      } else {
        quoteSubmissionDisabled = true;
        statusMessage = "Bidding Period has Ended";
      }
    }
    
    setQuoteDisabled(quoteSubmissionDisabled);
    setStatusMessage(statusMessage);
  };

  const handleRegretQuote = ({ regret_reason }, resetForm) => {
    let bidProducts = [];
    if (rfqDetails.products.length > 0) {
      rfqDetails.products.map((item, index) => {
        bidProducts.push({
          id: item.id,
          product_id: item.product_id,
          variant: item.variant,
          quantity: item?.product_specs[2]?.value,
          product_name: item.product_details
            ? item.product_details[0].name
            : "",
          unit_price: 0,
          package_price: 0,
          tax: 18,
          freight_price: 0,
          total_price: 0,
          comment: "",
          delivery_period: "",
        });
      });
    }

    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: bidProducts,
      is_regret: 1,
      regret_reason: regret_reason,
      globalPaymentTerms: "",
      globalComment: "",
    };

    setsubmitLoading(true);
    sendQuotation(payload, token)
      .then((res) => {
        setsubmitLoading(false);
        toast.success("Quote regret submitted successfully!");
        router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        Router.reload();
      })
      .catch((err) => {
        setsubmitLoading(false);
        toast.error("Failed to submit regret. Please try again.");
      })
      .finally(() => setregretModal(false));
  };

  const addCommasToNumber = (number) => {
    let numberString = number.toString();
    let parts = numberString.split(".");

    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  return (
    <>
      {loading && (
        <>
          <section className="buyer-common-header sc-pt-80 ">
            <div className="container-fluid">
              <h1 className="heading">
                <PlaceholderLoading shape="rect" width={600} height={50} />
              </h1>
            </div>
          </section>

          <section className="buyer-rfq-det-sec-1 hasFullLoader">
            {loading && <Loader />}
            <div className="container-fluid">
              <div className="row">
                <div className="col-md-12">
                  <div className="manage-rfq-con">
                    {/* Content for Manage RFQs tab */}
                    <span className="title">
                      <PlaceholderLoading
                        shape="rect"
                        width={200}
                        height={10}
                      />
                      <br />
                      <PlaceholderLoading
                        shape="rect"
                        width={200}
                        height={10}
                      />
                    </span>

                    <div className="details-table">
                      <div className="table-responsive">
                        <table className="table table-striped ">
                          <thead>
                            <tr>
                              <th>Name of product</th>
                              <th>Size specifications & Quantity</th>
                              <th>TDS</th>
                              <th>Quality Assurance Plan (QAP)</th>
                              <th>Comments</th>
                              <th>Selected vendors</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={200}
                                  height={15}
                                />
                              </td>
                              <td>
                                <div className="size-specification">
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />

                                  <FontAwesomeIcon icon={faEye} />
                                </div>
                              </td>

                              <td>
                                <div>
                                  <span>
                                    <FontAwesomeIcon icon={faEye} />
                                  </span>
                                  <span>
                                    <Image
                                      src="/assets/images/download-icon.png"
                                      alt="Workwise"
                                      width={16}
                                      height={16}
                                      priority={true}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <span>
                                    <FontAwesomeIcon icon={faEye} />
                                  </span>
                                  <span>
                                    <Image
                                      src="/assets/images/download-icon.png"
                                      alt="Workwise"
                                      width={16}
                                      height={16}
                                      priority={true}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={200}
                                  height={10}
                                />
                              </td>
                              <td>
                                <span>
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <form>
                        <div className="row">
                          <div className="col-md-12">
                            <div className="row">
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>

                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>

                              <div className="col-md-12">
                                <div className="form-group">
                                  <div className="form-group">
                                    <PlaceholderLoading
                                      shape="rect"
                                      width={"100%"}
                                      height={10}
                                    />
                                    <PlaceholderLoading
                                      shape="rect"
                                      width={"100%"}
                                      height={150}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="row">
                            <div className="col-md-8">
                              <h4>
                                {" "}
                                <PlaceholderLoading
                                  shape="rect"
                                  width={300}
                                  height={10}
                                />
                              </h4>

                              <ul style={{ listStyle: "none" }}>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                              </ul>
                            </div>
                          </div>
                          <PlaceholderLoading
                            shape="rect"
                            width={200}
                            height={50}
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      {/* // Not loading contents */}
      {!loading && rfqDetails && rfqDetails.id && (
        <>
          <section className="buyer-common-header sc-pt-80">
            <div className="container-fluid">
              {enableBuyerView
                ? <h1 className="heading">RFQ Management</h1>
                : <h1 className="heading">Inquiry from {rfqDetails.company_name}. (RFQ #{rfqDetails.rfq_no})</h1>
              }
            </div>
          </section>

          <section className="buyer-rfq-det-sec-1">
            <div className="container-fluid">
              <div className="row">
                <div className="col-md-12">
                  <div className="manage-rfq-con">

                    {/* Content for Manage RFQs tab */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="title mb-0">RFQ #{rfqDetails.rfq_no} details</span>

                      <div>
                        {type === "buyer-view" && rfqDetails.status === 1 && (
                          <Link href={`/dashboard/buyer/rfq-management-edit?id=${rfqDetails.id}`}>
                            <button
                              type="button"
                              className="btn btn-primary me-2"
                              style={{ width: "auto" }}
                            >
                              <FontAwesomeIcon icon={faEdit} className="me-2" />
                              Edit RFQ
                            </button>
                          </Link>
                        )}
                        
                        <button
                          type="button"
                          className=" btn btn-primary "
                          style={{ width: "180px" }}
                          onClick={(e) => {
                            e.preventDefault();
                            router.push({
                              pathname: `/dashboard/${type === "buyer-view" ? "buyer" : "vendor"}/query`,
                              query: {
                                rfq_id: rfqDetails.id,
                                role: type === "buyer-view" ? "buyer" : "vendor",
                                token: token
                              }
                            });
                          }}
                        >
                          Queries
                          {rfqDetails.unseen_query_count > 0 && <span className=" bg-danger px-2 rounded ms-2 ">{rfqDetails.unseen_query_count } +  </span>}
                        </button>


                        {type == "buyer-view" &&
                          ((rfqDetails.total_quotes_received > 0) ?
                            <Link href={`/dashboard/buyer/quote-compare?rfq=${rfqDetails.id}`}>
                              <button
                                type="button"
                                className="btn btn-secondary "
                                // style={{ width: "260px" }}
                              >
                                Compare Received Quotes
                              </button>
                            </Link>
                            :
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ width: "230px" }}
                              disabled
                            >
                              No Quotes Received
                            </button>
                          )

                        }
                        {(rfqDetails.status == 1 && !rfqDetails?.quotations[0]?.is_regret && productleftforbid && isSubmitAble && rfqDetails.quotations?.length > 0)
                          ? <Link href={`/dashboard/vendor/send-quote?type=update-quote&id=${id}&token=${token}`}>
                            <button
                              type="button"
                              className="btn btn-secondary m-0 p-2"
                              style={{ width: "240px" }}
                            >
                              <>
                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                Update Your Quote
                              </>
                            </button>
                          </Link>
                          : null
                        }
                      </div>
                    </div>

                    <div className="details-table">
                      <div className="table-responsive">
                        <table className="table table-striped ">
                          <thead>
                            <tr className="text-nowrap">
                              <th>Name of product</th>
                              <th>Size & specifications</th>
                              <th>Quantity</th>
                              {isReverseAuctionActive && <th>Current Lowest</th>}
                              <th>TDS</th>
                              <th>QAP</th>
                              {type != "buyer-view" && <th>Finalization Status</th>}
                              <th >Comments</th>
                              {type == "buyer-view" ? <th>Selected vendors</th> : null}
                              {<th>Technical Evaluation</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {rfqDetails?.products?.map((item) => {
                              let size, spec, qty, unit;
                              item?.product_specs?.map((p_spec) => {
                                switch (p_spec.title) {
                                  case 'Size':
                                    size = p_spec.value
                                    break;
                                  case 'Spec':
                                    spec = p_spec.value
                                    break;
                                  case 'Quantity':
                                    qty = p_spec.value
                                    break;
                                  case 'Unit':
                                    unit = p_spec.value
                                    break;
                                  default:
                                    break;
                                }
                              })
                              return (
                                <tr key={`${item?.id}_${item?.product_id}_${item?.variant}`}>
                                  <td>{item?.product_details[0]?.name}</td>
                                  <td style={{ minWidth: "300px", maxWidth: "500px" }}>
                                    <div className="row">
                                      <p className="col-12 mb-1" >
                                        <strong>Size: </strong>
                                        {size || "----"}
                                      </p>
                                      <p className="col-12 mb-1 truncate-text" style={{ maxHeight: "100px", WebkitLineClamp: 3 }} >
                                        <strong>Spec: </strong>
                                        {spec || "----"}
                                      </p>
                                      <div className="col-12 d-block  rounded-2 p-2 mb-1">
                                      { item.SPEC_files? <p className="fw-bold mb-1">File Attachments</p> : '' }
                                        <div className="row mx-1">
                                          {item.SPEC_files?.map((file, index) => (
                                            <a key={index} href={file} target="_blank" className="col-md-6 page-link text-truncate mb-1" style={{ maxWidth: "200px" }}>
                                              <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
                                              {extractfileName(file)}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td>{`${qty}-${unit}`}</td>
                                  {isReverseAuctionActive && (item?.lowest_quotation ? <td>{addCommasToNumber(item?.lowest_quotation?.total_price)}</td> : <td>--</td>)}

                                  <td>
                                    {(item.datasheet_file || item.TDS_flies) ? (
                                      <>
                                        {renderFileLink(item.datasheet_file)}
                                        {renderFileLink(item.TDS_flies)}
                                      </>
                                    ) : <span>N/A</span>}
                                  </td>
                                  <td>
                                    {(item.qap_file || item.QAP_files) ? (
                                      <>
                                        {renderFileLink(item.qap_file)}
                                        {renderFileLink(item.QAP_files)}
                                      </>
                                    ) : <span>N/A</span>}
                                  </td>
                                  {type != "buyer-view" &&
                                    <td>
                                      {item.finalization_status ==
                                        "You are finalized" ? (
                                        <span className="text-success">
                                          You are finalized
                                        </span>
                                      ) : item.finalization_status ==
                                        "Another vendor is finalized" ? (
                                        <span className="text-danger">
                                          Another vendor is finalized
                                        </span>
                                      ) : (
                                        <span className="text-warning">
                                          No vendor finalized yet
                                        </span>
                                      )}
                                    </td>
                                  }
                                  <td style={{ minWidth: "250px", maxWidth: "400px" }}>
                                    {item?.comment && item?.comment != ""
                                      ? <ReadMore content={item.comment} maxLines={4} additionalClasses="text-sm" />
                                      : "N/A"}
                                  </td>

                                  {type == "buyer-view" &&
                                    <td>
                                      <span>
                                        <Link
                                          href={`rfq-management-vendor?type=buyer-view&vendors=${item.vendor_details?.map((ven_item) => ven_item.user_id).join(",")}&productid=${item.product_id}&variant=${item.variant}`}
                                          className="page-link"
                                        >
                                          View selected vendors ({item.vendor_details?.length})
                                        </Link>
                                      </span>
                                    </td>
                                  }

                                        <td>
                                      {clauseMap && clauseMap.get(item.id)
                                        ? <a
                                          href={`/dashboard/${type == 'buyer-view' ? 'buyer' : 'vendor'}/technical-evaluation?rfq_id=${id}&prod_id=${item.id}&token=${token}`}
                                          className="text-dark-blue"
                                          style={{
                                            fontSize: '0.8rem',
                                            padding: '5px 10px',
                                            display: 'inline-block',
                                            border: 'none',
                                            backgroundColor: 'lightblue',
                                            color: 'darkblue',
                                            textDecoration: 'none',
                                          }}

                                        >
                                          View Evaluation
                                        </a>
                                        : "N/A"
                                      }
                                    </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <form>
                        <div className="row">
                          <div className="col-md-12">
                            <div className="row wacomnamepp">
                              <div className="col-md-3">
                                <div className="form-group mb-2">
                                  <label
                                    htmlFor="comname"
                                    className="form-label"
                                  >
                                    Company Name
                                  </label>
                                  <input
                                    type="text"
                                    id="wacomnamepp"
                                    className="form-control"
                                    name="comname"
                                    placeholder="lorem ipsum" 
                                    disabled
                                    value={rfqDetails?.company_name}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3 ">
                                <div className="form-group mb-2">
                                  <label
                                    htmlFor="cperson"
                                    className="form-label"
                                  >
                                    Contact person
                                  </label>
                                  <input
                                    type="text"
                                    id="cperson"
                                    className="form-control"
                                    name="cperson"
                                    placeholder="John Doe"
                                    disabled
                                    value={rfqDetails?.contact_name}
                                  />
                                </div>
                              </div>

                              <div className="col-md-3 ">
                                <div className="form-group mb-2">
                                  <label htmlFor="email" className="form-label">
                                    Email
                                  </label>
                                  <input
                                    type="text"
                                    id="email"
                                    className="form-control"
                                    name="email"
                                    placeholder="lorem@ipsum.com"
                                    disabled
                                    value={rfqDetails?.response_email}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3 ">
                                <div className="form-group mb-2">
                                  <label htmlFor="wapp" className="form-label">
                                    Contact Number
                                  </label>
                                  <input
                                    type="text"
                                    id="wapp"
                                    className="form-control"
                                    name="wapp"
                                    placeholder="1234567890"
                                    disabled
                                    value={`${rfqDetails?.contact_number}`}
                                  />
                                </div>
                              </div>

                              {type == "buyer-view" && rfqDetails?.project_name && rfqDetails?.project_name != "" &&
                                <div className="col-md-3">
                                  <div className="form-group mt-0 mb-2">
                                    <label htmlFor="project_name" className="form-label">
                                      Project Name
                                    </label>
                                    <input
                                      type="text"
                                      id="project_name"
                                      className="form-control"
                                      name="project_name"
                                      disabled
                                      value={`${rfqDetails?.project_name}`}
                                    />
                                  </div>
                                </div>}

                              {rfqDetails?.rfq_type && rfqDetails?.rfq_type != "" &&
                                <div className="col-md-3">
                                  <div className="form-group mt-0 mb-2">
                                    <label htmlFor="rfq_type" className="form-label">
                                      RFQ Type
                                    </label>
                                    <input
                                      type="text"
                                      id="rfq_type"
                                      className="form-control"
                                      name="rfq_type"
                                      disabled
                                      value={`${rfqDetails?.rfq_type}`}
                                    />
                                  </div>
                                </div>}

                              {rfqDetails?.reverse_auction && rfqDetails?.reverse_auction != "" &&
                                <>
                                <div className="col-md-3">
                                  <div className="form-group mt-0 mb-2">
                                    <label htmlFor="reverse_auction" className="form-label">
                                      Reverse Auction
                                    </label>
                                    <input
                                      type="text"
                                      id="reverse_auction"
                                      className="form-control"
                                      name="reverse_auction"
                                      disabled
                                      value={`${rfqDetails?.reverse_auction == 1 ? 'Enabled' : 'Disabled'}`}
                                    />
                                  </div>
                                </div>
                                
                                {rfqDetails?.reverse_auction == 1 && (
                                  <>
                                    <div className="col-md-3">
                                      <div className="form-group mt-0 mb-2">
                                        <label htmlFor="ra_start_date" className="form-label">
                                          Auction Start Date
                                        </label>
                                        <input
                                          type="text"
                                          id="ra_start_date"
                                          className="form-control"
                                          name="ra_start_date"
                                          disabled
                                          value={rfqDetails?.ra_start_date && rfqDetails.ra_start_date !== "null" && rfqDetails.ra_start_date !== "" 
                                            ? rfqDetails.ra_start_date 
                                            : "Not specified"}
                                        />
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div className="form-group mt-0 mb-2">
                                        <label htmlFor="ra_end_date" className="form-label">
                                          Auction End Date
                                        </label>
                                        <input
                                          type="text"
                                          id="ra_end_date"
                                          className="form-control"
                                          name="ra_end_date"
                                          disabled
                                          value={rfqDetails?.ra_end_date && rfqDetails.ra_end_date !== "null" && rfqDetails.ra_end_date !== "" 
                                            ? rfqDetails.ra_end_date 
                                            : "Not specified"}
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}
                                </>}

                              {rfqDetails?.bid_end_date && rfqDetails?.bid_end_date != "" &&
                                <div className="col-md-3">
                                  <div className="form-group mt-0 mb-2">
                                    <label htmlFor="bid_end_date" className="form-label">
                                      Procurement End Date
                                    </label>
                                    <input
                                      type="text"
                                      id="bid_end_date"
                                      className="form-control"
                                      name="bid_end_date"
                                      disabled
                                      value={`${rfqDetails?.bid_end_date}`}
                                    />
                                  </div>
                                </div>}

                              {rfqDetails?.location && rfqDetails?.location != "" &&
                                <div className="col-md-6">
                                  <div className="form-group mt-0">
                                    <label htmlFor="location" className="form-label">
                                      Delivery Location
                                    </label>
                                    <input
                                      type="text"
                                      id="location"
                                      className="form-control"
                                      name="location"
                                      disabled
                                      value={`${rfqDetails?.location}`}
                                    />
                                  </div>
                                </div>}

                            </div>
                          </div>

                          {rfqDetails && rfqDetails?.id && (
                            <div className="col-md-12">
                              <div className="row terms-conditions">
                                <div className="col-md-6 ">
                                  <h4>Terms & Conditions</h4>
                                  {(!rfqDetails?.terms || rfqDetails?.terms.length === 0) && (
                                    <p>No predefined terms selected!</p>
                                  )}

                                  {rfqDetails?.terms?.length > 0 && (
                                    <ol>
                                      {rfqDetails?.terms?.map((item, index) => {
                                        const termContent = item.term_content || item.name || (item.content && item.content[0]?.title);
                                        if (!termContent) return null;
                                        
                                        return (
                                          <li key={`term-${item.id || index}`} className="mb-2">
                                            {termContent}
                                          </li>
                                        );
                                      })}
                                    </ol>
                                  )}
                                </div>
                                <div className="col-md-6">
                                  {/* winning bid area */}
                                  {rfqDetails.finalizations &&
                                    rfqDetails.finalizations.length > 0 && (
                                      <div className="finalized-details">
                                        {/* <h4>Finalized Details</h4>
                                        <div className="noborder-table">
                                          <div className="table-responsive">
                                            <table>
                                              <thead>
                                                <tr>
                                                  <th>Product name</th>
                                                  <th>Vendor</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {rfqDetails.finalizations.map((item => {
                                                  return (
                                                    <tr>
                                                      <td>{item?.product_details?.name}</td>
                                                      <td>{item?.winning_vendor?.organization_name}</td>
                                                    </tr>
                                                  )
                                                }))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div> */}
                                      </div>
                                    )}
                                  {/* winning bid area end */}
                                  {rfqDetails.quotations.length > 0 &&
                                    rfqDetails.quotations[0].is_regret == 0 && (
                                      <div className="submitted-quotation">
                                        <h4>
                                          You've already submitted a quotation on{" "}
                                          {moment(
                                            new Date(rfqDetails?.quotations[0]?.timestamp
                                          )).format("HH:mm A - DD/MM/YYYY")}{" "}
                                        </h4>

                                        {(rfqDetails.status == 2 || !productleftforbid || quoteDisabled) ? (
                                          <button
                                            type="button"
                                            className={`btn ${rfqDetails.status == 2 ? 'btn-danger' : (wasEndDatePassed && isReverseAuctionActive ? 'btn-success' : 'btn-secondary')} m-0 mx-auto mt-2`}
                                            style={{ width: "240px" }}
                                            disabled={quoteDisabled}
                                          >
                                            <FontAwesomeIcon icon={faCircleExclamation} className="me-2" />
                                            {statusMessage || (rfqDetails.status == 2 ? "RFQ is Closed" : "All Products are Finalized")}
                                          </button>
                                        ) :
                                          <Link className="mx-auto mt-2" href={`/dashboard/vendor/send-quote?type=update-quote&id=${id}&token=${token}`}>
                                            <button
                                              type="button"
                                              className="btn btn-secondary m-0"
                                              style={{ width: "240px" }}
                                            >
                                              <>
                                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                Update Your Quote
                                              </>
                                            </button>
                                          </Link>
                                        }
                                      </div>
                                    )}
                                  {rfqDetails.quotations.length > 0 &&
                                    rfqDetails.quotations[0].is_regret == 1 && (
                                      <div className="submitted-quotation">
                                        <h4 className="text-center">
                                          You've{" "}
                                          <span style={{ color: "#f00" }}>
                                            declined
                                          </span>{" "}
                                          the RFQ request on{" "}
                                          {moment(
                                            new Date(
                                              parseInt(
                                                rfqDetails.quotations[0]
                                                  .timestamp
                                              )
                                            )
                                          ).format(
                                            "DD/MM/YYYY - HH:mm:ss A"
                                          )}{" "}
                                        </h4>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          )}

                          {rfqDetails.TERM_files && rfqDetails.TERM_files.length > 0 &&
                            <div className="col-md-12 mb-2">
                              <div className="row">
                                <div className="col-md-6">
                                  <h4>Terms & Conditions File</h4>
                                  <div className="row mt-2">
                                    {rfqDetails.TERM_files.map((file) => (
                                      <div className="col-md-6 col-lg-4">
                                        <a href={file} target="_blank" key={file} className="file-badge mb-2" type="button" >
                                          <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
                                          <span className="text-truncate">{extractfileName(file)}</span>
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          }

                          <div className="col-md-12">
                            <div className="row">
                              <div className="col-md-6">
                                <h4>Additional Terms & Conditions</h4>
                                <div className="form-group">
                                  <textarea
                                    id="comment"
                                    className="form-control text-sm fw-normal"
                                    name="comment"
                                    placeholder="comment here"
                                    rows={5}
                                    disabled
                                    value={rfqDetails?.comment}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          {enableBuyerView && (
                            <>
                              {rfqDetails?.status == 1 && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={handleRFqClose}
                                  disabled={closeRFqLoading}
                                >
                                  {closeRFqLoading
                                    ? "Processing request..."
                                    : "Mark RFQ as Closed"}
                                </button>
                              )}
                              {rfqDetails?.status == 2 && (
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={(e) => e.preventDefault()}
                                  disabled={true}
                                >
                                  RFQ has been closed
                                </button>
                              )}
                            </>
                          )}
                          {!enableBuyerView && (
                            <>
                              {(!isSubmitAble || rfqDetails.status == 2) ? (
                                // Show a single disabled button saying "RFQ is Closed"
                                <div className="row w-50">
                                  <div className="col-12">
                                    <button
                                      type="button"
                                      className="btn btn-danger w-100"
                                      disabled
                                    >
                                      <FontAwesomeIcon icon={faCircleExclamation} className="me-2" />
                                      RFQ is Closed
                                    </button>
                                  </div>
                                </div>
                              ) : (!productleftforbid) ? (
                                // Show a single disabled button saying "All Products are Finalized"
                                <div className="row w-50">
                                  <div className="col-12">
                                    <button
                                      type="button"
                                      className="btn btn-secondary w-100"
                                      disabled
                                    >
                                      <FontAwesomeIcon icon={faCircleExclamation} className="me-2" />
                                      All Products are Finalized
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Show the two buttons if neither condition is met
                                rfqDetails.quotations.length <= 0 && rfqDetails?.status == 1 && (
                                  <div className="row w-50">
                                    <div className="col-md-6 ps-4">
                                      <button
                                        type="submit"
                                        className="btn btn-primary"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setregretModal(true);
                                        }}
                                      >
                                        Regret Quote
                                      </button>
                                    </div>
                                    <div className="col-md-6 d-flex justify-content-end p-0">
                                      {rfqDetails?.quotations?.length === 0 && (
                                        <>
                                          {(rfqDetails.status == 2 || !productleftforbid || quoteDisabled) ? (
                                            <button
                                              type="button"
                                              className={`btn ${rfqDetails.status == 2 ? 'btn-danger' : (wasEndDatePassed && isReverseAuctionActive ? 'btn-success' : 'btn-secondary')}`}
                                              disabled={quoteDisabled}
                                            >
                                              <FontAwesomeIcon icon={faCircleExclamation} className="me-2" />
                                              {statusMessage || (rfqDetails.status == 2 ? "RFQ is Closed" : "All Products are Finalized")}
                                            </button>
                                          ) : (
                                            <Link href={`/dashboard/vendor/send-quote?id=${id}${token !== undefined ? `&token=${token}` : ''}`}>
                                              <button type="button" className={`btn ${wasEndDatePassed && isReverseAuctionActive ? 'btn-success' : 'btn-secondary'}`}>
                                                {wasEndDatePassed && isReverseAuctionActive ? 'Send Quote (Reverse Auction)' : 'Send Quote'}
                                              </button>
                                            </Link>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      {!loading && rfqDetails && !rfqDetails.id && (
        <section className="buyer-common-header sc-pt-80">
          <div className="container-fluid">
            {<h1 className="heading">RFQ Not Available!</h1>}
          </div>
        </section>
      )}
      <RegretQuoteReasonModal
        handleRegretReason={handleRegretQuote}
        showModal={regretModal}
        closeModal={() => {
          setregretModal(false);
        }}
      />

      {/* ------------- Auth Modal ------------- */}
      <LoginContainer
        loading={loading}
        setloading={setloading}
        openAuthModal={openAuthModal}
        setOpenAuthModal={setOpenAuthModal}
        activeAuthTab={activeAuthTab}
        setActiveAuthTab={setActiveAuthTab}
      />
    </>
  );
};

export default RfqManagementPreview;
