import React, { useEffect, useState, useCallback } from "react";
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
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import { checkBidExpired, extractfileName, formatDate } from "@/utils/sharedFunctions";
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
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [currentLowest, setCurrentLowest] = useState(null);
  const [quoteDisabled, setQuoteDisabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  // New state variables for enhanced RA logic
  const [isReverseAuctionActive, setIsReverseAuctionActive] = useState(false);
  const [showLowestPrice, setShowLowestPrice] = useState(false);
  const [wasEndDatePassed, setWasEndDatePassed] = useState(false);
  const [raStatusChanged, setRaStatusChanged] = useState(false);
  // Add technical evaluation statuses tracking
  const [techEvalStatuses, setTechEvalStatuses] = useState({});
  // Changes by Agnij 2025-05-05 [Add state for technical evaluation restrictions]
  const [showTechEvalRestrictions, setShowTechEvalRestrictions] = useState(false);

  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [isLoggedIn, setisLoggedIn] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [localId, setLocalId] = useState(router.query.id);

  useEffect(() => {
    if (id) {
      getRFQdetails();
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


  const handleTermsToggle = (e) => {
    e.preventDefault(); // Prevent any unintended navigation
    setOpenTerms(!openTerms);
  };

  // Notify user when RA status changes and allows quote submission again
  useEffect(() => {
    // Only show toast if:
    // 1. RA status has changed
    // 2. RA is active
    // 3. Bid end date has passed
    // 4. Not in buyer view
    // 5. There are products left for bidding (not all finalized)
    // 6. No products have been finalized for any vendor
    if (raStatusChanged &&
        isReverseAuctionActive &&
        wasEndDatePassed &&
        !enableBuyerView &&
        productleftforbid &&
        rfqDetails?.products?.every(item =>
          item.finalization_status !== "Another vendor is finalized" &&
          item.finalization_status !== "You are finalized"
        )
    ) {
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
  }, [raStatusChanged, isReverseAuctionActive, wasEndDatePassed, enableBuyerView, productleftforbid, rfqDetails]);

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

        // Check if any products are not finalized
        const hasUnfinalizedProducts = res.data?.products?.some(
          product => product.finalization_status !== "Another vendor is finalized" &&
                    product.finalization_status !== "You are finalized"
        );

        // Only set productleftforbid to true if there are unfinalized products
        setproductleftforbid(hasUnfinalizedProducts);

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
      // Extract technical evaluation status for each product
      const techStatuses = {};
      products.forEach(product => {
        if (product.tech_evaluation_status) {
          techStatuses[product.id] = product.tech_evaluation_status;
        }
      });
      setTechEvalStatuses(techStatuses);

      // Determine if lowest quotation should be visible based on technical evaluation
      const hasLowestQuotation = products.some(product => {
        // Show lowest quote if it exists and either:
        // 1. Product doesn't have technical evaluation, or
        // 2. Product has technical evaluation and vendor is accepted
        const hasTechEval = product.tech_evaluation_status?.has_tech_eval;
        const isAccepted = product.tech_evaluation_status?.is_accepted;

        return product.lowest_quotation !== null &&
               (!hasTechEval || (hasTechEval && isAccepted));
      });

      setCurrentLowest(hasLowestQuotation && showLowestPrice);
    } else {
      setCurrentLowest(null);
    }
  };

  const handleRFqClose = (e) => {
    e.preventDefault();
    setShowCloseConfirmModal(true);
  };

  const handleCloseConfirm = async () => {
    setcloseRFqLoading(true);
    try {
      await closeRFQ(id);
      getRFQdetails();
      toast.success("RFQ closed successfully");
    } catch (err) {
      console.error("Error closing RFQ:", err);
      toast.error("Failed to close RFQ");
    } finally {
      setcloseRFqLoading(false);
      setShowCloseConfirmModal(false);
    }
  };

  const handleCloseCancel = () => {
    setShowCloseConfirmModal(false);
  };

  const checkIfQuotationSendIsPossible = useCallback(() => {
    // --- Initial Setup ---
    const now = new Date();
    // Consider memoizing date objects outside this callback with useMemo for performance optimization
    const bidEndDateRaw = rfqDetails?.bid_end_date ? new Date(rfqDetails.bid_end_date) : null;
    const bidEndDateEndOfDay = bidEndDateRaw ? new Date(bidEndDateRaw.getFullYear(), bidEndDateRaw.getMonth(), bidEndDateRaw.getDate(), 23, 59, 59, 999) : null;
    const raStartDate = rfqDetails?.ra_start_date ? new Date(rfqDetails.ra_start_date) : null;
    const raEndDate = rfqDetails?.ra_end_date ? new Date(rfqDetails.ra_end_date) : null;

    const isReverseAuction = rfqDetails?.reverse_auction == 1;
    const isRfqClosed = rfqDetails?.status == 2;
    const areAllProductsFinalized = !productleftforbid; // Assumes productleftforbid is boolean/truthy

    // --- Determine Status ---
    // Default state: Allowed to send quote during normal bidding period
    let isDisabled = false;
    let message = "Send Quote";
    let currentIsReverseAuctionActive = false;

    // Changes by Agnij 2025-05-05 [Ensure RFQ closed status takes precedence]
    // Priority 1: RFQ Closed (highest priority)
    if (isRfqClosed) {
      isDisabled = true;
      message = "RFQ is Closed";
    }
    // Priority 2: Active Reverse Auction (only if RFQ is not closed)
    else if (isReverseAuction && raStartDate && raEndDate && now >= raStartDate && now <= raEndDate) {
      isDisabled = false; // Explicitly allowed
      message = "Reverse Auction is Active";
      currentIsReverseAuctionActive = true;
    }
    // Check other disabling conditions only if RA is not currently active and RFQ is not closed
    else {
        // Priority 3: All Products Finalized
      if (areAllProductsFinalized) {
            isDisabled = true;
            message = "All Products are Finalized";
        }
        // Priority 4: Past Bid End Date
        // Changes by Agnij 2025-05-05 [Ensure quotes can be updated until end of bid end date]
        else if (bidEndDateEndOfDay && now > bidEndDateEndOfDay) {
            isDisabled = true; // Disable by default if bid ended
            if (isReverseAuction) {
                if (raEndDate && now > raEndDate) {
                    message = "Reverse Auction has Ended";
                } else if (raStartDate && now < raStartDate) {
                    message = "Bidding Period Ended (Reverse Auction Pending)";
                } else if (!raStartDate || !raEndDate) {
                    message = "Bidding Period Ended (RA Dates Invalid)";
                } else {
                    // Should not happen if Priority 1 caught active RA, but acts as fallback
                    message = "Bidding Period Ended";
                }
            } else {
                // No RA, bid just ended
                message = "Bidding Period has Ended";
            }
        }
        // Priority 5: Invalid RFQ State (No Bid End Date)
        else if (!bidEndDateRaw) {
            isDisabled = true;
            message = "RFQ Not Open for Bidding";
        }
        // If none of the above conditions met, the default "Send Quote" state remains.
    }

    // --- Update State ---
    setIsReverseAuctionActive(currentIsReverseAuctionActive);
    setQuoteDisabled(isDisabled);
    setStatusMessage(message);

    // Changes by Agnij 2025-05-05 [Only show technical evaluation restrictions during active RA]
    // Only apply technical evaluation restrictions during active reverse auction
    setShowTechEvalRestrictions(currentIsReverseAuctionActive);

    // Update current lowest visibility based on RA status
    setShowLowestPrice(currentIsReverseAuctionActive);

    // Track if current RA status is different from previous to notify user
    if (wasEndDatePassed !== (bidEndDateEndOfDay && now > bidEndDateEndOfDay)) {
      setWasEndDatePassed(bidEndDateEndOfDay && now > bidEndDateEndOfDay);
      if (isReverseAuction && raStartDate && now >= raStartDate) {
        setRaStatusChanged(true);
      }
    }

  }, [rfqDetails, productleftforbid]);

  useEffect(() => {
    if (rfqDetails) {
      checkIfQuotationSendIsPossible();
    }
  }, [rfqDetails, checkIfQuotationSendIsPossible]);

  const handleRegretQuote = ({ regret_reason }, resetForm) => {
    let bidProducts = [];
    if (rfqDetails.products.length > 0) {
      rfqDetails.products.map((item, index) => {
        bidProducts.push({
          id: item.id,
          product_id: item.product_id,
          variant: item.variant,
          quantity: item?.product_specs?.find(spec => spec?.title === 'Quantity')?.value || 0,
          product_name: item.product_details
            ? item.product_details[0].name
            : "",
          unit_price: 0,
          package_price: 0,
          tax: 0,
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
        setregretModal(false);
        toast.success("Quote regret submitted successfully!")
        // toast.success("Quote regret submitted successfully!", {
        //   onClose: () => {
        //     // Reload the page after the toast is closed
        //     window.location.href = `/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`;
        //   }
        // });
        window.location.href = `/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`;
      })
      .catch((err) => {
        setsubmitLoading(false);
        setregretModal(false);
        toast.error("Failed to submit regret. Please try again.");
      });
  };

  const addCommasToNumber = (number) => {
    let numberString = number.toString();
    let parts = numberString.split(".");

    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const goToQuoteCreation = () => {
    // Changes by Agnij 2025-05-05 [Pass tech eval restriction flag to quote page]
    router.push(
      `/dashboard/vendor/send-quote?id=${id}${token !== undefined ? `&token=${token}` : ''}&showTechEvalRestrictions=${isReverseAuctionActive}`
    );
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
              <div className="d-flex justify-content-between align-items-center flex-wrap">
                <div>
                  {enableBuyerView ? (
                    <h1 className="heading mb-0">RFQ Management</h1>
                  ) : (
                    <h1 className="heading mb-0">
                      Inquiry from {rfqDetails.company_name} (RFQ #
                      {rfqDetails.rfq_no})
                    </h1>
                  )}
                </div>
                {!enableBuyerView && <div className="d-flex gap-3">
                  {/* Queries Button */}
                  <button
                    id="view_queries-rfq_header-inquiries_details_page"
                    type="button"
                    className="btn btn-primary position-relative"
                    style={{ minWidth: 140 }}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push({
                        pathname: `/dashboard/${
                          type === "buyer-view" ? "buyer" : "vendor"
                        }/query`,
                        query: {
                          rfq_id: rfqDetails.id,
                          role: type === "buyer-view" ? "buyer" : "vendor",
                          token: token,
                        },
                      });
                    }}
                  >
                    Queries
                    {rfqDetails.unseen_query_count > 0 && (
                      <span className="bg-danger px-2 rounded ms-2 text-white small position-absolute top-0 end-0 translate-middle">
                        {rfqDetails.unseen_query_count}+
                      </span>
                    )}
                  </button>
                  {/* Regret Quote Button (conditional rendering example) */}
                  {!enableBuyerView &&
                    rfqDetails.quotations.length === 0 &&
                    productleftforbid && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.preventDefault();
                          setregretModal(true);
                        }}
                      disabled={
                        (quoteDisabled && statusMessage !== "Reverse Auction is Active") ||
                        rfqDetails.status == 2 ||
                        rfqDetails.products?.every(
                          (item) =>
                            item.finalization_status === "Another vendor is finalized" ||
                            item.finalization_status === "You are finalized"
                        )
                      }

                      >
                        Regret Quote
                      </button>
                    )}
                  {/* Send Quote Button / Disabled State */}
                  {!enableBuyerView && rfqDetails.quotations.length === 0 && (
                    <button
                      type="button"
                      className={`btn ${
                        isReverseAuctionActive ? "btn-success" : "btn-secondary"
                      }`}
                      onClick={goToQuoteCreation}
                      disabled={
                        (quoteDisabled &&
                          statusMessage !== "Reverse Auction is Active") ||
                        rfqDetails.status == 2 ||
                        rfqDetails.products?.every(
                          (item) =>
                            item.finalization_status ===
                              "Another vendor is finalized" ||
                            item.finalization_status === "You are finalized"
                        )
                      }
                    >
                      {isReverseAuctionActive ? "Send Quote" : statusMessage}
                    </button>
                  )}
                  {rfqDetails.status == 1 &&
                  !rfqDetails?.quotations[0]?.is_regret &&
                  productleftforbid &&
                  isSubmitAble &&
                  rfqDetails.quotations?.length > 0 &&
                  !rfqDetails.products?.some(
                    (item) =>
                      item.finalization_status ===
                        "Another vendor is finalized" ||
                      item.finalization_status === "You are finalized"
                  ) ? (
                    <button
                      id="update_your_quote-rfq_header-inquiries_details_page"
                      type="button"
                      className="btn btn-secondary m-0 p-2"
                      style={{ width: "240px" }}
                      onClick={() => {
                        // Changes by Agnij 2025-05-05 [Pass update parameter]
                        router.push(
                          `/dashboard/vendor/send-quote?type=update-quote&id=${id}${
                            token !== undefined ? `&token=${token}` : ""
                          }&showTechEvalRestrictions=${isReverseAuctionActive}`
                        );
                      }}
                    >
                      <>
                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                        Update Your Quote
                      </>
                    </button>
                  ) : null}
                </div>}
              </div>
            </div>
          </section>

          <section className="buyer-rfq-det-sec-1">
            <div className="container-fluid">
              <div className="row">
                <div className="col-md-12">
                  {/* RFQ Details Section */}
                  <div className="bg-light p-3 rounded-2">
                    <div className="row g-3">
                      {rfqDetails?.company_name && (
                        <div className="col-md-2 col-sm-6">
                          <strong>Company Name:</strong>
                          <div>{rfqDetails.company_name}</div>
                        </div>
                      )}
                      
                      {/* hotel list : currently usiing only company data here to display, need to change */}
                      {rfqDetails?.company_name && (
                        <div className="  col-md-2 col-sm-6"> 
                          <strong>Hotels:</strong>
                          <div>{rfqDetails.company_name}</div>
                        </div>
                      )}

                      {rfqDetails?.contact_name && (
                        <div className="  col-md-2 col-sm-6"> 
                          <strong>Contact Persone:</strong>
                          <div>{rfqDetails.contact_name}</div>
                        </div>
                      )}
                      {rfqDetails?.response_email && (
                        <div className="  col-md-2 col-sm-6"> 
                          <strong>Email:</strong>
                          <div>{rfqDetails.response_email}</div>
                        </div>
                      )}

                      {rfqDetails?.contact_number && (
                        <div className="  col-md-2 col-sm-6"> 
                          <strong>Contact Number:</strong>
                          <div>{rfqDetails.contact_number}</div>
                        </div>
                      )}

                        <div className="  col-md-2 col-sm-6"> 
                          <strong>Type:</strong>
                          <div>
                            {Number(rfqDetails.is_tender) == 1 ? "Tender" : `RFQ ${ rfqDetails?.rfq_type ||"" } `}
                          </div>
                        </div>


                {rfqDetails?.bid_end_date && (
                        <div className=" col-md-2 col-sm-6 ">
                          <strong>Procurement End Date:</strong>
                          <div>{rfqDetails.bid_end_date}</div>
                        </div>
                      )}

                {rfqDetails?.tender_publish_date && (
                        <div className=" col-md-2 col-sm-6 ">
                          <strong>Tender Publish Date:</strong>
                          <div>{rfqDetails.tender_publish_date}</div>
                        </div>
                      )}

                {rfqDetails?.vendor_clarification_date && (
                        <div className=" col-md-2 col-sm-6 ">
                          <strong>Clarification Date:</strong>
                          <div>{rfqDetails.vendor_clarification_date}</div>
                        </div>
                      )}
                      
                      {rfqDetails?.tender_fees && rfqDetails?.is_tender   ? (
                        <div className=" col-md-2 col-sm-6 ">
                          <strong>Tender Fees:</strong>
                          <div>{rfqDetails.tender_fees}</div>
                        </div>
                      ):""}
                              
                      {rfqDetails?.ra_start_date && (
                        <div className="  col-md-4 col-sm-6 ">
                          <strong>Reverse Auction:</strong>
                          <div>
                         {new Date(rfqDetails.ra_start_date).toLocaleString("en-GB", {
                           day: "numeric",
                           month: "short",
                           year: "numeric",
                           hour: "numeric",
                           minute: "2-digit",
                           hour12: true,
                         })}
                         
                         <strong className="mx-1" > to </strong>

                         {new Date(rfqDetails.ra_end_date).toLocaleString("en-GB", {
                           day: "numeric",
                           month: "short",
                           year: "numeric",
                           hour: "numeric",
                           minute: "2-digit",
                           hour12: true,
                         })}
                          </div>
                        </div>
                      )}


                      {rfqDetails?.location && (
                        <div className="col-md-4 col-sm-6 ">
                          <strong>Delivery Location:</strong>
                          <div>{rfqDetails.location}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="manage-rfq-con">
                    {/* Content for Manage RFQs tab */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="title mb-0">
                        RFQ #{rfqDetails.rfq_no} details
                      </span>

                      <div>
                        {type === "buyer-view" && rfqDetails.status === 1 && (
                          <Link
                            href={`/dashboard/buyer/rfq-management-edit?id=${rfqDetails.id}`}
                          >
                            <button
                              id="edit_rfq-rfq_header-inquiries_details_page"
                              type="button"
                              className="btn btn-primary me-2"
                              style={{ width: "auto" }}
                            >
                              <FontAwesomeIcon icon={faEdit} className="me-2" />
                              Edit RFQ
                            </button>
                          </Link>
                        )}

                        {type == "buyer-view" &&
                          (rfqDetails?.is_quotes_present ? (
                            <Link
                              href={`/dashboard/buyer/quote-compare?rfq=${rfqDetails.id}`}
                            >
                              <button
                                id="compare_received_quotes-rfq_header-inquiries_details_page"
                                type="button"
                                className="btn btn-secondary "
                                style={{ width: "270px" }}
                              >
                                Compare Received Quotes
                              </button>
                            </Link>
                          ) : (
                            <button
                              id="no_quotes_received-rfq_header-inquiries_details_page"
                              type="button"
                              className="btn btn-primary"
                              style={{ width: "230px" }}
                              disabled
                            >
                              No Quotes Received
                            </button>
                          ))}
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
                              {isReverseAuctionActive && (
                                <th>Current Lowest</th>
                              )}
                              <th>TDS</th>
                              <th>QAP</th>
                              {type != "buyer-view" && (
                                <th>Finalization Status</th>
                              )}
                              <th>Comments</th>
                              {type == "buyer-view" && !rfqDetails.is_tender ? (
                                <th>Selected vendors</th>
                              ) : null}
                              {<th>Technical Evaluation</th>}
                              {rfqDetails?.products?.some(
                                (product) => product.target_price
                              ) && <th>Target Price</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {rfqDetails?.products?.map((item) => {
                              let size, spec, qty, unit;
                              item?.product_specs?.map((p_spec) => {
                                switch (p_spec.title) {
                                  case "Size":
                                    size = p_spec.value;
                                    break;
                                  case "Spec":
                                    spec = p_spec.value;
                                    break;
                                  case "Quantity":
                                    qty = p_spec.value;
                                    break;
                                  case "Unit":
                                    unit = p_spec.value;
                                    break;
                                  default:
                                    break;
                                }
                              });
                              const tech_evaluation_status =
                                item.tech_evaluation_status?.is_accepted ||
                                null;
                              return (
                                <tr
                                  key={`${item?.id}_${item?.product_id}_${item?.variant}`}
                                >
                                  <td>{item?.product_details[0]?.name}</td>
                                  <td
                                    style={{
                                      minWidth: "300px",
                                      maxWidth: "500px",
                                    }}
                                  >
                                    <div className="row">
                                      <p className="col-12 mb-1">
                                        <strong>Size: </strong>
                                        {size || "----"}
                                      </p>
                                      <p
                                        className="col-12 mb-1 truncate-text"
                                        style={{
                                          maxHeight: "100px",
                                          WebkitLineClamp: 3,
                                        }}
                                      >
                                        <strong>Spec: </strong>
                                        {spec || "----"}
                                      </p>
                                      <div className="col-12 d-block  rounded-2 p-2 mb-1">
                                        {item.SPEC_files ? (
                                          <p className="fw-bold mb-1">
                                            File Attachments
                                          </p>
                                        ) : (
                                          ""
                                        )}
                                        <div className="row mx-1">
                                          {item.spec_file?.map(
                                            (file, index) => (
                                              <a
                                                key={index}
                                                href={file}
                                                target="_blank"
                                                className="col-md-6 page-link text-truncate mb-1"
                                                style={{ maxWidth: "200px" }}
                                              >
                                                <FontAwesomeIcon
                                                  icon={faDownload}
                                                  className="ms-0 me-2"
                                                />
                                                {extractfileName(file)}
                                              </a>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td>{`${qty ?? "N/A"}-${unit ?? "N/A"}`}</td>
                                  {isReverseAuctionActive &&
                                    (item?.lowest_quotation ? (
                                      <td>
                                        {addCommasToNumber(
                                          item?.lowest_quotation?.total_price
                                        )}
                                      </td>
                                    ) : (
                                      <td>--</td>
                                    ))}

                                  <td>
                                    {item.datasheet_file ? (
                                      <>{renderFileLink(item.datasheet_file)}</>
                                    ) : (
                                      <span>N/A</span>
                                    )}
                                  </td>
                                  <td>
                                    {item.qap_file ? (
                                      <>{renderFileLink(item.qap_file)}</>
                                    ) : (
                                      <span>N/A</span>
                                    )}
                                  </td>
                                  {type != "buyer-view" && (
                                    <td>
                                      {item.finalization_status ==
                                      "You are finalized" ? (
                                        <span
                                          className="text-success"
                                          style={{ pointerEvents: "none" }}
                                        >
                                          You are finalized
                                        </span>
                                      ) : item.finalization_status ==
                                        "Another vendor is finalized" ? (
                                        <span
                                          className="text-danger"
                                          style={{ pointerEvents: "none" }}
                                        >
                                          Another vendor is finalized
                                        </span>
                                      ) : (
                                        <span className="text-warning">
                                          No vendor finalized yet
                                        </span>
                                      )}
                                    </td>
                                  )}
                                  <td
                                    style={{
                                      minWidth: "250px",
                                      maxWidth: "400px",
                                    }}
                                  >
                                    {item?.comment && item?.comment != "" ? (
                                      <ReadMore
                                        content={item.comment}
                                        maxLines={4}
                                        additionalClasses="text-sm"
                                      />
                                    ) : (
                                      "N/A"
                                    )}
                                  </td>

                                  {type == "buyer-view" && !rfqDetails.is_tender && (
                                    <td>
                                      <span>
                                        <Link
                                          href={`rfq-management-vendor?type=buyer-view&productid=${item.product_id}&variant=${item.variant}&id=${id}&rfq_product_id=${item.id}`}
                                          className="page-link"
                                        >
                                          View selected vendors (
                                          {item.vendors_count})
                                        </Link>
                                      </span>
                                    </td>
                                  )}

                                  <td>
                                    {item.tech_evaluation_status
                                      ?.has_tech_eval ? (
                                      <a
                                        href={`/dashboard/${
                                          type === "buyer-view"
                                            ? "buyer"
                                            : "vendor"
                                        }/technical-evaluation?rfq_id=${id}&prod_id=${
                                          item.id
                                        }&token=${token}`}
                                        className="text-dark-blue"
                                        style={{
                                          fontSize: "0.8rem",
                                          padding: "5px 10px",
                                          display: "inline-block",
                                          border: "none",
                                          backgroundColor: "lightblue",
                                          color: "darkblue",
                                          textDecoration: "none",
                                          borderRadius: "5px",
                                        }}
                                      >
                                        {item.tech_evaluation_status
                                          ?.is_accepted ? (
                                          <span
                                            style={{
                                              color: "darkgreen",
                                              fontWeight: "600",
                                            }}
                                          >
                                            Technically Accepted
                                          </span>
                                        ) : (
                                          <span
                                            style={{
                                              color: "darkorange",
                                              fontWeight: "600",
                                            }}
                                          >
                                            Pending
                                          </span>
                                        )}
                                      </a>
                                    ) : (
                                      "N/A"
                                    )}
                                  </td>

                                  {item.target_price && (
                                    <td className="position-relative">
                                      <div className="target-price-badge bg-warning text-dark fw-bold px-3 py-2 rounded shadow-sm border border-warning-subtle">
                                        <i className="bi bi-bullseye me-2"></i>₹
                                        {item?.target_price?.toLocaleString()}
                                        <span className="target-price-pulse"></span>
                                      </div>
                                    </td>
                                  )}
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

                              {type == "buyer-view" &&
                                rfqDetails?.project_name &&
                                rfqDetails?.project_name != "" && (
                                  <div className="col-md-3">
                                    <div className="form-group mt-0 mb-2">
                                      <label
                                        htmlFor="project_name"
                                        className="form-label"
                                      >
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
                                  </div>
                                )}
                            </div>
                          </div>

                          {rfqDetails && rfqDetails?.id && (
                            <div className="col-md-12">
                              <div className="row terms-conditions">
                                <div className="col-md-6">
                                  <div className="mt-4 pt-3 border-top">
                                    <h4>Terms & Conditions</h4>
                                    {(!rfqDetails?.terms ||
                                      rfqDetails?.terms.length === 0) && (
                                      <p className="mt-3">
                                        No predefined terms selected!
                                      </p>
                                    )}
                                    {rfqDetails?.terms?.length > 0 && (
                                      <ol className="mt-3">
                                        {rfqDetails.terms.map((item, index) => {
                                          const termContent =
                                            item.term_content ||
                                            item.name ||
                                            (item.content &&
                                              item.content[0]?.title);
                                          if (!termContent) return null;

                                          return (
                                            <li
                                              key={`term-${item.id || index}`}
                                              className="mb-2"
                                            >
                                              {termContent}
                                            </li>
                                          );
                                        })}
                                      </ol>
                                    )}
                                  </div>
                                </div>

                                <div className="col-md-6">
                                  {rfqDetails.finalizations &&
                                    rfqDetails.finalizations.length > 0 && (
                                      <div className="finalized-details"></div>
                                    )}

                                  {rfqDetails.quotations.length > 0 &&
                                    rfqDetails.quotations[0].is_regret ===
                                      0 && (
                                      <div className="submitted-quotation">
                                        <h4>
                                          You've already submitted a quotation
                                          on{" "}
                                          {moment
                                            .utc(
                                              rfqDetails?.quotations[0]
                                                ?.timestamp
                                            )
                                            .local()
                                            .format("hh:mm A - DD/MM/YYYY")}
                                        </h4>

                                        {rfqDetails.status === 2 ||
                                        !productleftforbid ||
                                        quoteDisabled ||
                                        rfqDetails.products?.every(
                                          (item) =>
                                            item.finalization_status ===
                                              "Another vendor is finalized" ||
                                            item.finalization_status ===
                                              "You are finalized"
                                        ) ? (
                                          <button
                                            type="button"
                                            className={`btn ${
                                              rfqDetails.status === 2
                                                ? "btn-danger"
                                                : wasEndDatePassed &&
                                                  isReverseAuctionActive
                                                ? "btn-success"
                                                : "btn-secondary"
                                            } m-0 mx-auto mt-2`}
                                            style={{
                                              width: "240px",
                                              opacity: "0.5",
                                            }}
                                            disabled={
                                              quoteDisabled ||
                                              rfqDetails.status === 2
                                            }
                                          >
                                            <FontAwesomeIcon
                                              icon={faCircleExclamation}
                                              className="me-2"
                                            />
                                            {rfqDetails.status === 2
                                              ? "RFQ is Closed"
                                              : rfqDetails.products?.some(
                                                  (item) =>
                                                    item.finalization_status ===
                                                      "Another vendor is finalized" ||
                                                    item.finalization_status ===
                                                      "You are finalized"
                                                )
                                              ? rfqDetails.products?.some(
                                                  (item) =>
                                                    item.finalization_status ===
                                                    "You are finalized"
                                                )
                                                ? "You are finalized"
                                                : "Another vendor is finalized"
                                              : statusMessage ||
                                                "All Products are Finalized"}
                                          </button>
                                        ) : (
                                          <Link
                                            className="mx-auto mt-2"
                                            href={`/dashboard/vendor/send-quote?type=update-quote&id=${localId}${
                                              token !== undefined
                                                ? `&token=${token}`
                                                : ""
                                            }&showTechEvalRestrictions=${isReverseAuctionActive}`}
                                          >
                                            <button
                                              type="button"
                                              className="btn btn-secondary m-0"
                                              style={{ width: "240px" }}
                                            >
                                              <FontAwesomeIcon
                                                icon={faEdit}
                                                className="me-2"
                                              />
                                              Update Your Quote
                                            </button>
                                          </Link>
                                        )}
                                      </div>
                                    )}

                                  {rfqDetails.quotations.length > 0 &&
                                    rfqDetails.quotations[0].is_regret ===
                                      1 && (
                                      <div className="submitted-quotation">
                                        <h4 className="text-center">
                                          You've{" "}
                                          <span style={{ color: "#f00" }}>
                                            declined
                                          </span>{" "}
                                          the RFQ request on{" "}
                                          {moment(
                                            rfqDetails?.quotations[0]?.timestamp
                                          )
                                            .add(5, "hours")
                                            .add(30, "minutes")
                                            .format("DD/MM/YYYY - hh:mm:ss A")}
                                        </h4>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          )}

                          {rfqDetails.TERM_files &&
                            rfqDetails.TERM_files.length > 0 && (
                              <div className="col-md-12 mb-2">
                                <div className="row">
                                  <div className="col-md-6">
                                    <h4>Terms & Conditions File</h4>
                                    <div className="row mt-2">
                                      {rfqDetails.TERM_files.map((file) => (
                                        <div className="col-md-6 col-lg-4">
                                          <a
                                            href={file}
                                            target="_blank"
                                            key={file}
                                            className="file-badge mb-2"
                                            type="button"
                                          >
                                            <FontAwesomeIcon
                                              icon={faDownload}
                                              className="ms-0 me-2"
                                            />
                                            <span className="text-truncate">
                                              {extractfileName(file)}
                                            </span>
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

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

      {/* Close RFQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCloseConfirmModal}
        onClose={handleCloseCancel}
        onConfirm={handleCloseConfirm}
        title="Close RFQ"
        description={`Are you sure you want to close RFQ #${
          rfqDetails?.rfq_no || "this RFQ"
        }?\nOnce closed, vendors will no longer be able to submit quotes.`}
        confirmButtonColor="warning"
        confirmButtonText="Close RFQ"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default RfqManagementPreview;