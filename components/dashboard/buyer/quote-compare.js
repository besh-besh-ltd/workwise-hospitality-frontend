import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import FullLoader from "@/components/shared/FullLoader";
import useModulePermissions from "@/hooks/useModulePermissions";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import {
  closeRFQ,
  downloadQuotesDetails,
  finalizeQuotation,
  getAllClauses,
  getQuotes,
  getRfqs,
  handleUploadFileInFormData,
  saveExcelInDB,
  updateTargetPrice,
} from "@/services/rfq";
import { useRouter } from "next/router";
import * as XLSX from "xlsx-js-style";
import QuoteCompareTable from "@/components/dashboard/buyer/quote-compare-table";
import Loader from "@/components/shared/Loader";
import OverallComparison from "./overallComparison";
import { addCommasToNumber, calculateTotal, formatPrice, handleNormalize, normalizeFlatQuotationData, formatRFQNumber, getEntityLabel } from "@/utils/sharedFunctions";
import PlaceholderLoading from "react-placeholder-loading";
import { toast } from "react-toastify";
import { getProjectAvailableBudget, getProjectList } from '@/services/project';
import { getUserMappings } from '@/services/hospitality';
import Select from 'react-select';
import LPRModal from "@/components/shared/LPRModal";
import { Button, Badge } from "react-bootstrap";
import OverallCostComparison from './OverallCostComparison';
import ReadMore from "@/components/shared/ReadMore";
import InputModal from "@/components/shared/InputModal";
import NormalizeInfoModal from "@/components/modal/NormalizeInfoModal";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import NegotiationCompactBanner from "./negotiation/NegotiationCompactBanner";
import ProductNegotiationBadge from "../vendor/ProductNegotiationBadge";
import { getProfile } from "@/services/Auth";
import { getAllActiveNegotiationRounds, getActiveNegotiationRound, getRoundQuotes } from "@/services/negotiation";
import { getEntityApprovalInstances, getApprovalInstanceDetails } from "@/services/approval";

/**
 * @note We have left the View LPR button to be displayed even if the Previous quotes are not there which needs to be corrected later 
 * @Updated Ayush Singh 22 JUNE 2025
 * @updated by mukul 08-08-2025 - normilize total
 */


const QuoteCompare = () => {
  const router = useRouter();
  const { rfq, rfq_product_id, source, tab = 'product' } = router.query;
  const [loading, setloading] = useState(false);
  const [quotesLoading, setquotesLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [closeRFqLoading, setcloseRFqLoading] = useState(false);
  const [finalizeLoading, setfinalizeLoading] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(100);
  const [myRFQs, setmyRFQs] = useState([]);
  const [currentRFQ, setcurrentRFQ] = useState(null);
  const [quotes, setquotes] = useState([]);
  const [originalQuotes, setOriginalQuotes] = useState([]); // Store original data before normalization
  const [vendorCodeMap, setVendorCodeMap] = useState({});
  const [l1total, setl1total] = useState(0);
  const [hasMoreQuotes, sethasMoreQuotes] = useState(true);
  const [TA_Filter, setTA_Filter] = useState(false);
  const [TEavailable, setTEavailable] = useState(false);
  const [freightFilter, setFreightFilter] = useState(false);
  const [normalizeFilter, setNormalizeFilter] = useState(false);
  const [rfqNo, setRfqNo] =useState(null);
  const [projects, setProjects] = useState(null);
  const [allProjects, setAllProjects] = useState(null);
  const [selectedproject, setSelectedproject] = useState(null);
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [openModals, setOpenModals] = useState({});
  const [availableBudget, setAvailableBudget] = useState(null);
  // Add new state for active tab
  const [activeTab, setActiveTab] = useState(tab);
  const [isTenderFilter, setIsTenderFilter] = useState(null);
  // const [targetPrice , setTargetPrice] = useState(null);
  // const [targetPriceHistory ,  settargetPriceHistory] = useState([]);

  useEffect(() => {
    if(tab != activeTab) {
      setActiveTab(tab);
    }
  }, [tab]);


 const [openModalId, setOpenModalId] = useState(null);
 const[openInputModal , setOpenInputModal] =useState(false)
 const [showNormalizeModal, setShowNormalizeModal] = useState(false);
 const [currentUser, setCurrentUser] = useState(null);
 const [productNegotiationData, setProductNegotiationData] = useState({}); // { productId: { activeRound, roundQuotes } }
 const [sidebarNegotiationMap, setSidebarNegotiationMap] = useState({}); // { rfqId: { hasActive, hasPending, userNeedsToApprove } }

  // Permission-based authorization for Negotiation and Quote-Compare sections
  // Memoize hotelIds to prevent infinite re-renders in useModulePermissions
  const hotelIdsKey = currentRFQ?.hotel_ids?.join(',') || currentRFQ?.hotel_id || '';
  const hotelIds = useMemo(() => {
    return currentRFQ?.hotel_ids || (currentRFQ?.hotel_id ? [currentRFQ.hotel_id] : []);
  }, [hotelIdsKey]);

  // Negotiation permissions
  const {
    canRead: canReadNegotiation,
    canUpdate: canUpdateNegotiation,
    canCreate: canCreateNegotiation,
    loading: negotiationPermissionsLoading,
  } = useModulePermissions({
    moduleKey: "negotiation",
    hotelIds: hotelIds,
    enabled: !!currentRFQ,
  });
  const canWriteNegotiation = canUpdateNegotiation || canCreateNegotiation;

  // Quote-Compare permissions
  const {
    canRead: canReadQuoteCompare,
    canUpdate: canUpdateQuoteCompare,
    canCreate: canCreateQuoteCompare,
    loading: quoteComparePermissionsLoading,
  } = useModulePermissions({
    moduleKey: "quote-compare",
    hotelIds: hotelIds,
    enabled: !!currentRFQ,
  });
  const canWriteQuoteCompare = canUpdateQuoteCompare || canCreateQuoteCompare;

  // Combined loading state
  const permissionsLoading = negotiationPermissionsLoading || quoteComparePermissionsLoading;

  // Track which rfq has had its metadata loaded — only Stage 1 controls this
  const [metadataLoadedForRfq, setMetadataLoadedForRfq] = useState(null);
  const rfqMetadataReady = metadataLoadedForRfq === rfq;

  // Stage 1: Fetch RFQ metadata first to get hotel context for permission check
  // This is a lightweight call that doesn't expose sensitive quote data
  useEffect(() => {
    setMetadataLoadedForRfq(null);

    const fetchRFQMetadata = async () => {
      if (!rfq || rfq === 'undefined' || rfq === 'null') {
        setcurrentRFQ(null);
        return;
      }

      try {
        // Get RFQ metadata for permission context
        const response = await getRfqs({ rfq_id: String(rfq), page: 1, limit: 1, tech_eval: false });
        const rfqData = Array.isArray(response) ? response[0] : response?.data?.[0];
        if (rfqData) {
          // Set minimal RFQ data for permission check (hotel_id, hotel_ids)
          setcurrentRFQ(prev => ({
            ...prev,
            id: rfqData.id,
            hotel_id: rfqData.hotel_id,
            hotel_ids: rfqData.hotel_ids,
          }));
          setMetadataLoadedForRfq(rfq);
        }
      } catch (error) {
        console.error("Error fetching RFQ metadata:", error);
      }
    };

    fetchRFQMetadata();
  }, [rfq]);

  // Stage 2: Once permissions are verified, fetch full data only if user has access
  useEffect(() => {
    if (rfq && rfqMetadataReady && !permissionsLoading && (canReadNegotiation || canReadQuoteCompare)) {
      getRespectiveQuotes();
      loadNegotiationData();
    }
  }, [rfq, rfqMetadataReady, permissionsLoading, canReadNegotiation, canReadQuoteCompare, TA_Filter, freightFilter, normalizeFilter]);

  const loadNegotiationData = async () => {
    if (!rfq) return;
    
    try {
      // Load all active rounds for this RFQ
      const response = await getAllActiveNegotiationRounds(rfq);
      let activeRounds = [];
      
      if (response) {
        if (response.status === 1 && response.data) {
          activeRounds = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
          activeRounds = response;
        }
      }

      // For each active round, load quotes and organize by product
      const negotiationData = {};
      
      for (const round of activeRounds) {
        if (round.rfq_product_id) {
          try {
            const quotesResponse = await getRoundQuotes(round.id);
            let roundQuotes = [];
            
            if (quotesResponse) {
              if (quotesResponse.status === 1 && quotesResponse.data) {
                roundQuotes = Array.isArray(quotesResponse.data) ? quotesResponse.data : [];
              } else if (Array.isArray(quotesResponse)) {
                roundQuotes = quotesResponse;
              }
            }

            negotiationData[round.rfq_product_id] = {
              activeRound: round,
              roundQuotes: roundQuotes
            };
          } catch (error) {
            console.error(`Error loading quotes for round ${round.id}:`, error);
          }
        }
      }

      setProductNegotiationData(negotiationData);
    } catch (error) {
      console.error('Error loading negotiation data:', error);
      setProductNegotiationData({});
    }
  };

  useEffect(() => {
    getAllRFQs();
  }, [page, selectedproject, isTenderFilter]);

  // Load negotiation status for sidebar RFQs (for highlighting)
  useEffect(() => {
    if (myRFQs && myRFQs.length > 0 && currentUser?.id) {
      const loadSidebarNegotiationData = async () => {
        const map = {};
        const userId = currentUser.id;
        await Promise.all(
          myRFQs.map(async (rfqItem) => {
            try {
              const response = await getAllActiveNegotiationRounds(rfqItem.id);
              const rounds = (response?.status === 1 && Array.isArray(response.data)) ? response.data : [];
              const hasActive = rounds.some(r => r.status === 'ACTIVE');
              const pendingRounds = rounds.filter(r => r.status === 'PENDING_APPROVAL');
              let userNeedsToApprove = false;

              // Check if current user is an approver for any pending round
              for (const round of pendingRounds) {
                if (!round.rfq_product_id) continue;
                try {
                  const instancesRes = await getEntityApprovalInstances('NEGOTIATION', round.rfq_product_id);
                  const instances = instancesRes?.data || instancesRes || [];
                  const pendingInstance = (Array.isArray(instances) ? instances : []).find(i => i.status === 'PENDING');
                  if (pendingInstance) {
                    const detailRes = await getApprovalInstanceDetails(pendingInstance.id);
                    const detail = detailRes?.data || detailRes || {};
                    const currentStep = (detail.steps || []).find(s => s.step_order === detail.current_step);
                    if (currentStep?.approvers?.some(a => String(a.user_id) === String(userId) && a.status === 'PENDING')) {
                      userNeedsToApprove = true;
                      break;
                    }
                  }
                } catch {
                  // ignore
                }
              }

              map[rfqItem.id] = { hasActive, hasPending: pendingRounds.length > 0, userNeedsToApprove };
            } catch {
              // ignore
            }
          })
        );
        setSidebarNegotiationMap(map);
      };
      loadSidebarNegotiationData();
    }
  }, [myRFQs, currentUser]);

  useEffect(() => {
    getAllProjects();
    fetchUserHotelMappings();
    // getPricehistory();
    loadCurrentUser();
  }, [rfq]);

  const loadCurrentUser = async () => {
    try {
      const res = await getProfile();
      setCurrentUser(res.data);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };


  useEffect(() => {
    if(quotes && quotes.length > 0) {
      const project_id = quotes[0].rfq[0].project_id;
      if(project_id != -1 && project_id != null) {
        getAvailableBudget(project_id)
          .then((budget) => {
            setAvailableBudget(budget);
          })
          .catch((error) => {
            setAvailableBudget(null);
          }); 
      }
    }
  }, [quotes])

  useEffect(() => {
    const handler = setTimeout(() => {
        getAllRFQs(true);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [rfqNo,selectedproject, isTenderFilter]);


  const closeModalForVariant = (variantId) => {
  setOpenModals(prev => ({ ...prev, [variantId]: false }));
};


const transformData = (data) => {
  return data.map(item => {
    // Extract product information
   const product = {
     product_variant_id: item.product_variant_id,
     id: item.id,
     name: item.product_details[0].product_name,
     spec: item.product_details[0],
     quantity: item.product_details[0].rfq_details.find(
       (detail) => detail.title === "Quantity"
     )?.value,
     unit: item.product_details[0].rfq_details.find(
       (detail) => detail.title === "Unit"
     )?.value,
    
   };
    // Extract vendors from quotations
    const vendors = item.quotations.map(quote => ({
      id: quote.quote_details.vendor_details.id,
      name: quote.quote_details.vendor_details.name,
      email: quote.quote_details.vendor_details.email,
      mobile: quote.quote_details.vendor_details.mobile,
      organization_name: quote.quote_details.vendor_details.organization_name,
      latest_target_price : quote.quote_details.latest_target_price,
      is_regret : quote.quote_details.is_regret
    }));

    return {
      ...product,
      vendors
    };
  });
};


  const getVendorCode = (vendor = {}) => {
    if (vendor.rfq_product_vendor_id) return `VEN-${vendor.rfq_product_vendor_id}`;
    return 'VEN-NA';
  };

  const getAvailableBudget = async (projectId) => {
  try {
    const response = await getProjectAvailableBudget(projectId);
    return response
  } catch (error) {
    console.error("Error fetching available budget:", error);
    return null; // or handle the error as needed
  }
};


const openModalForVariant = (variantId) => {
  setOpenModals(prev => ({ ...prev, [variantId]: true }));
};
  const getAllProjects = () => {
    getProjectList()
        .then((res) => {
            let d = [];
            (res.data.data || res.data || []).map((item) => {
                d.push({ label: item.name, value: item.id, hospitality_company_id: item.hospitality_company_id, hotel_id: item.hotel_id });
            });
            setProjects(d);
            setAllProjects(d);
        })
        .catch((error) => {
            console.error(error)
        })
  }

  const fetchUserHotelMappings = async () => {
    try {
      const response = await getUserMappings();
      const mappings = response?.data || [];
      setUserHotelMappings(mappings);
    } catch (error) {
      console.error("Error fetching user hotel mappings", error);
    }
  }

  const handleHotelSelectionChange = (hotelIds) => {
    setSelectedHotelIds(hotelIds);
    
    // Filter projects based on selected hotels
    if (!hotelIds || hotelIds.length === 0) {
      setProjects(allProjects);
    } else {
      const filtered = allProjects.filter(p => hotelIds.includes(p.hotel_id));
      setProjects(filtered);
    }
    
    // Reset project selection when hotels change
    setSelectedproject(null);
  }

  const handleTAFilterChange = (e) => {
    setTA_Filter(e.target.checked);
  }

  const handleFreightFilterChange = (e) => {
    setFreightFilter(e.target.checked);
  }


const handleNormalizeClick = () => {
  if (normalizeFilter) {
    setNormalizeFilter(false);
  } else {
    setNormalizeFilter(true);
    setShowNormalizeModal(true);
  }
};

const handleCloseNormalizeModal = () => {
  setShowNormalizeModal(false);
};

  const loadMoreRFQs = (e) => {
    e.preventDefault();
    if (hasMoreQuotes) {
      setpage((prevPage) => prevPage + 1);
    }
  };

 
  const getAllRFQs = (rfqNumberChange=false) => {
    setloading(true);
    getRfqs({ tech_eval: false, page, limit, project_id: selectedproject ? selectedproject : -1, rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null, sort: "DESC", is_tender: isTenderFilter !== null ? (isTenderFilter === '1' || isTenderFilter === 1) : null })
      .then((res) => {
        setloading(false);
        const newData = Array.isArray(res) ? res : [];

        if(rfqNumberChange){
          setpage(1);
          setlimit(100);
          setmyRFQs(newData);
          sethasMoreQuotes(true);  
        }else{
          setmyRFQs((prevRFQs) => {
            const all = [...prevRFQs, ...newData];
            const unique = [];
            const seen = new Set();
            for (const rfq of all) {
              if (!seen.has(rfq.id)) {
                unique.push(rfq);
                seen.add(rfq.id);
              }
            }
            return unique;
          });
        }

      })
      .catch((err) => {
        setloading(false);
      })
      .finally(() => {
        setloading(false);
      })
  };

  const getRespectiveQuotes = () => {
    setquotesLoading(true);
    setquotes([]);
    setTEavailable(false);

    getQuotes(rfq, TA_Filter, freightFilter, rfq_product_id, source , 'quote_compare')
      .then((res) => {
        // Store original data before normalization for highlighting logic
        setOriginalQuotes(res.data);

        const data = normalizeFilter ? normalizeFlatQuotationData(res.data) : res.data;

        setquotes(data);

        // Build vendorCodeMap from all_vendors and vendor_details
        const codeMap = {};
        const setCode = (id, val) => {
          if (!id || !val) return;
          codeMap[id] = val;
          codeMap[String(id)] = val;
        };
        data.forEach((product) => {
          (product.all_vendors || []).forEach((v) => {
            if (v.id && v.rfq_product_vendor_id) setCode(v.id, v.rfq_product_vendor_id);
          });
          (product.quotations || []).forEach((q) => {
            const vdRaw =
              q.vendor_details ||
              (q.quote_details && q.quote_details.vendor_details);
            const vd = Array.isArray(vdRaw) ? vdRaw[0] : vdRaw;
            if (vd?.id && vd.rfq_product_vendor_id) setCode(vd.id, vd.rfq_product_vendor_id);
          });
        });
        setVendorCodeMap(codeMap);
      })
      .catch((err) => {
      })
      .finally(() => {
        setquotesLoading(false);
        getRFQClauses();
      })
  };

  const getRFQClauses = async () => {
    try {
      const res = await getAllClauses(rfq);
      if(res.data && res.data.length > 0)
        setTEavailable(true);
    } catch (error) {
      console.error(error);
    }
  };

  const getDeliveryRange = (items) => {
    const validItems = items.filter(num => typeof num === "number" && !isNaN(num) && num > 0);

    if (validItems.length > 0) {
      // Find the smallest delivery week
      let smallest = Math.min(...validItems);

      // Find the largest delivery week
      let largest = Math.max(...validItems);

      if (smallest === largest) {
        return smallest === 1 ? `Within 1 day` : `Within ${smallest} days`;
      }

      let smallestStr = smallest === 1 ? "1 day" : `${smallest} days`;
      let largestStr = largest === 1 ? "1 day" : `${largest} days`;

      return `Within ${smallestStr} - ${largestStr}`;
    } else {
      return "-";
    }
  };

  const handleExcelUpload = async (file) => {
    try {
      const res = await handleUploadFileInFormData(file);
      const filePath = res.data[0]?.file_path;

      if (filePath) {
        return filePath; // Return the uploaded file object
      } else {
        throw new Error("File upload failed. No file path returned.");
      }
    } catch (error) {
      throw new Error("File upload failed: " + error.message);
    }
  };


  const handleDownloadQuote = async (e) => {
    e.preventDefault();
    setDownloadLoading(true);

    try {
      const res = await downloadQuotesDetails(rfq, TA_Filter, freightFilter);

      const quoteData = normalizeFilter ? handleNormalize(res.data) : res.data;

      const [excelBuffer, fileName] = generateExcelFile(quoteData);

      if (excelBuffer) {
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const file = new File([blob], fileName, { type: blob.type });

        const filePath = await handleExcelUpload(file);
        await saveExcelInDB(rfq, filePath);

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to download quotes. Please try again.")
    } finally {
      setDownloadLoading(false);
    }
  };

const generateExcelFile = (api_data) => {
  let l1totaltemp = 0;
  let allVendors = api_data[0].all_vendors;

  let heading_array = [["Product Name", "Specification", "Size", "Qty"]];
  let amount_array = ["", "", "", ""];

  let total_array = ["TOTAL", "", ""];
  let l1array = ["Lowest total (L1 Total)", "", "", ""];
  let paymentTermsArray = ["Payment Terms", "", "", ""];
  let commentsArray = ["Vendor Comment", "", "", ""];
  let deliveryArray = ["Delivery", "", "", ""];
  let totalArray = ["Total", "", ""];
  let filesArray = ["Attached Files", "", "", ""];

  allVendors.map((item) => {
    heading_array[0].push(item.organization_name || item.name || item.email || 'Unknown Vendor');
    heading_array[0].push("");
    heading_array[0].push("");
    heading_array[0].push("");
    heading_array[0].push("");
    heading_array[0].push(""); // Added for target_price

    amount_array.push("Unit Rate");
    amount_array.push("Freight");
    amount_array.push("Packaging");
    amount_array.push("GST");
    amount_array.push("Target Price"); // Added new column
    amount_array.push("Total Amount");

    paymentTermsArray.push(
      [
        item.global_payment_term?.[0]?.details || "",
        ...(item.payment_terms || []).map(pt =>
          pt.comment
            ? `${pt.value || ""}% - ${pt.comment}`
            : `${pt.type || ""}${pt.days ? " " + pt.days + " days" : ""}${pt.value ? " - " + pt.value + "%" : ""}`
        )
      ].filter(Boolean).join(", ") || "-"
    );

    paymentTermsArray.push("");
    paymentTermsArray.push("");
    paymentTermsArray.push("");
    paymentTermsArray.push("");
    paymentTermsArray.push(""); // Added for target_price

    const sanitizeComment = (comment) => comment.replace(/[\n\r,"]/g, " ").trim();

    commentsArray.push(
      (item?.global_payment_term && item?.global_payment_term[0]?.comment)
        ? sanitizeComment(item?.global_payment_term[0]?.comment)
        : "-"
    );
    commentsArray.push("");
    commentsArray.push("");
    commentsArray.push("");
    commentsArray.push("");
    commentsArray.push(""); // Added for target_price
  });

  allVendors.map((vendor) => {
    let vq = [];
    let total = 0;
    api_data.map((product) => {
      const quantity = product.product_specs.find(
        (spec) => spec.title === "Quantity"
      );

      let q = product.quotations.filter(
        (quotation) =>
          quotation.created_by == vendor.id &&
          quotation.id != null &&
          quotation.is_regret != 1
      );
      if (q.length > 0) {
        vq.push(parseFloat(q[0].quote_details[0].delivery_period));
        total = total + calculateTotal(q[0].quote_details[0], quantity.value, normalizeFilter);
      }
    });
    vendor.total = total;
    vendor.quoted_products = vq;
  });

  heading_array[0].push("LOWEST");
  heading_array[0].push("Selling Price");
  heading_array[0].push("Target Price");
  heading_array[0].push("Last Purchase Rate");
  amount_array.push("");
  amount_array.push("");  // for Selling Price
  amount_array.push("");  // for Target Price
  amount_array.push("");  // for Last Purchase Rate

  let data = heading_array;
  data.push(amount_array);
  let totalQty = 0;

  api_data.map((item) => {
    totalQty = totalQty + parseFloat(item.product_specs.find((specItem) => specItem.title == 'Quantity')?.value);
    let temp_arr = [
      item.product_details[0].name,
      item.product_specs.find((specItem) => specItem.title == 'Spec')?.value || "-",
      item.product_specs.find((specItem) => specItem.title == 'Size')?.value || "-",
      item.product_specs.find((specItem) => specItem.title == 'Quantity')?.value || "-"
    ];

    const array = item.quotations.filter(
      (item) => item.id != null && item.is_regret != 1
    );

    let lowest = null;

    if (array.length === 1) {
      if (array[0].quote_details[0].total_price > 0) {
        lowest = array[0];
      } else {
        lowest = null;
      }
    } else {
      lowest = array.reduce((lowest, currentItem) => {
        const curItemQuoteDetails = currentItem.quote_details[0];
        const curItemVendorDetails = currentItem.vendor_details[0];

        const lowestQuoteDetails = lowest.quote_details[0];
        const lowestVendorDetails = lowest.vendor_details[0];

        const curQuantity = curItemQuoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || curItemQuoteDetails.quantity;
        const lowQuantity = lowestQuoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || lowestQuoteDetails.quantity;

        const currentTotal = calculateTotal(curItemQuoteDetails, curQuantity, normalizeFilter);
        const lowestTotal = calculateTotal(lowestQuoteDetails, lowQuantity, normalizeFilter);

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
                currentItem.timestamp.slice(0, 23)
              );
              const lowestTimestamp = new Date(lowest.timestamp.slice(0, 23));

              if (curTimestamp < lowestTimestamp) curLowest = currentItem;
              else curLowest = lowest;
            }
          }
          return curLowest;
        }
        return lowest;
      }, array[0]);
    }

    if (lowest) {
      const lowestQuoteDetails = lowest.quote_details[0];
      const lowestQuantity = lowestQuoteDetails.rfq_details.find(spec => spec.title == 'Quantity')?.value || lowestQuoteDetails.quantity;

      l1totaltemp = l1totaltemp + calculateTotal(lowestQuoteDetails, lowestQuantity, normalizeFilter);
      setl1total(l1totaltemp);

      item.quotations.map((q) => {
        if (q.id == lowest.id) {
          q.is_lowest = true;
        } else {
          q.is_lowest = false;
        }
      });
    }

    item?.quotations?.map((q) => {
      // Find the vendor's latest_target_price from all_vendors
      const vendor = item.all_vendors.find(v => v.id === q.created_by);
      const target_price = vendor?.latest_target_price ?? "0";

      if (q.is_regret == 1 || !q.quote_details || q?.quote_details?.length == 0) {
        temp_arr.push("0");
        temp_arr.push("0");
        temp_arr.push("0");
        temp_arr.push("0");
        temp_arr.push(target_price); // Use vendor-specific target_price
        temp_arr.push("0");
      } else {
        const temp_quote_details = q.quote_details[0];
        const temp_quantity = temp_quote_details?.rfq_details?.find(spec => spec?.title == 'Quantity')?.value || temp_quote_details.quantity;

        temp_arr.push(
          q.quote_details.length > 0 && q?.quote_details[0]?.unit_price
            ? q.quote_details[0].unit_price : "0"
        );
        temp_arr.push(
          q.quote_details.length > 0 && q?.quote_details[0]?.freight_price
            ? q.quote_details[0].freight_mode == "percentage"
              ? q.quote_details[0].freight_price + "%"
              : "₹" + q.quote_details[0].freight_price
            : "0"
        );
        temp_arr.push(
          q.quote_details.length > 0 && q?.quote_details[0]?.package_price
            ? q.quote_details[0].package_mode == "percentage"
              ? q.quote_details[0].package_price + "%"
              : "₹" + q.quote_details[0].package_price
            : "0"
        );
        temp_arr.push(
          q.quote_details.length > 0 && q?.quote_details[0]?.tax
            ? q.quote_details[0].tax_mode == "percentage"
              ? q.quote_details[0].tax + "%"
              : "₹" + q.quote_details[0].tax
            : "0"
        );
        temp_arr.push(target_price); // Use vendor-specific target_price
        temp_arr.push(
          q.quote_details.length > 0
            ? `${calculateTotal(temp_quote_details, temp_quantity, normalizeFilter)} ${q.is_lowest ? "(Lowest)" : ""}`
            : "-"
        );
      }
    });
    temp_arr.push(
      lowest
        ? calculateTotal(
            lowest.quote_details[0],
            lowest.quote_details[0].rfq_details.find(
              (spec) => spec.title == "Quantity"
            )?.value,
            normalizeFilter
          )
        : "-"
    );
    temp_arr.push(
      addCommasToNumber(
        item.product_specs.find((specItem) => specItem.title == "total_price")
          ?.value
      ) ?? "-"
    );

    temp_arr.push(
      item.latest_target_price 
        ? addCommasToNumber(item.latest_target_price)
        : "-"
    );

    temp_arr.push(
      item.last_purchase_rate
        ? addCommasToNumber(
            calculateTotal(
              item.last_purchase_rate,
              item.product_specs.find(
                (specItem) => specItem.title == "Quantity"
              )?.value,
              normalizeFilter
            )
          )
        : item.last_quote_rate
        ? addCommasToNumber(
            calculateTotal(
              item.last_quote_rate,
              item.product_specs.find(
                (specItem) => specItem.title == "Quantity"
              )?.value,
              normalizeFilter
            )
          )
        : "-"
    );
    data.push(temp_arr);
  });

  total_array.push(totalQty);
  totalArray.push(totalQty);
  l1array.push(l1totaltemp);

  let emptyArr = ["", "", "", ""];
  allVendors.map((item) => {
    emptyArr.push("");
    emptyArr.push("");
    emptyArr.push("");
    emptyArr.push("");
    emptyArr.push(""); // Added for target_price
    emptyArr.push("");
    l1array.push("");
    l1array.push("");
    l1array.push("");
    l1array.push("");
    l1array.push(""); // Added for target_price
    l1array.push("");

    let deliveryRange = getDeliveryRange(item.quoted_products);
    deliveryArray.push(deliveryRange);
    deliveryArray.push("");
    deliveryArray.push("");
    deliveryArray.push("");
    deliveryArray.push(""); // Added for target_price
    deliveryArray.push("");

    totalArray.push("");
    totalArray.push("");
    totalArray.push("");
    totalArray.push("");
    totalArray.push(""); // Added for target_price
    totalArray.push(item.total ? item.total : 0);
  });

  l1array.pop();
  data.push(emptyArr, emptyArr, emptyArr, emptyArr);

  data.push(totalArray);
  data.push(l1array);

  data.push(deliveryArray);
  data.push(paymentTermsArray);
  data.push(commentsArray);

  const globalFiles = FilterOutGlobalTermsFiles(api_data);
  const maxFileLen = globalFiles
    .filter(Array.isArray)
    .reduce((max, arr) => Math.max(max, arr.length), 0);

  globalFiles.map((item) => {
    filesArray.push(
      item
        ? item[0]?.file_url
        : "-"
    );
    filesArray.push("");
    filesArray.push("");
    filesArray.push("");
    filesArray.push(""); // Added for target_price
    filesArray.push("");
  });

  data.push(filesArray);
  for (let i = 1; i < maxFileLen; i++) {
    let temp = ["", "", "", ""];
    globalFiles.map((fileArr) => {
      if (fileArr && fileArr[i])
        temp = [...temp, fileArr[i].file_url, "", "", "", "", ""]; // Added empty string for target_price
      else temp = [...temp, "-", "", "", "", "", ""]; // Added empty string for target_price
    });
    data.push(temp);
  }

  // ---------------------------------
  // Add RFQ metadata header (top rows)
  // ---------------------------------
  const headerOffset = 3; // number of rows added at the top
  const totalColumns = data[0]?.length || 0;

  const padToCols = (row) => {
    const r = Array.isArray(row) ? row.slice() : [];
    while (r.length < totalColumns) r.push("");
    return r;
  };

  const titleText = formatRFQNumber(currentRFQ?.rfq_no, currentRFQ?.is_tender) || "-";
  const infoRow1 = padToCols([
    "Project",
    currentRFQ?.project_name ?? "-",
    "Quote Submission Deadline",
    currentRFQ?.bid_end_date ?? "-",
  ]);

  const infoRow2 = padToCols([
    "POC For RFQ",
    currentRFQ?.contact_name ?? "-",
    "Contact",
    currentRFQ?.contact_number ?? "-",
  ]);

  const titleRow = padToCols([titleText]);

  // Unshift in reverse order to maintain intended order at top
  data.unshift(infoRow2);
  data.unshift(infoRow1);
  data.unshift(titleRow);

  const ws = XLSX.utils.aoa_to_sheet(data);
  const width = 25;
  const range = XLSX.utils.decode_range(ws["!ref"]);

  // MERGE l1 row
  {
    let columnToMergeStart = 4;
    let columnToMergeEnd = allVendors.length * 6 + 3; // Updated for 6 columns per vendor

    const mergeRange = {
      s: { r: headerOffset + api_data.length + 7, c: columnToMergeStart },
      e: { r: headerOffset + api_data.length + 7, c: columnToMergeEnd },
    };

    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push(mergeRange);

    for (let col = range.s.c; col < range.e.c - 1; col++) {
      const cellAddress = XLSX.utils.encode_cell({
        r: api_data.length + 7,
        c: col,
      });
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {};
      ws[cellAddress].s.fill = { fgColor: { rgb: "DDDDDD" } };
      ws[cellAddress].s.font = { color: { rgb: "000000" } };
    }
  }

  // Align all text to the center
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {};
      ws[cellAddress].s.alignment = {
        horizontal: "center",
        wrapText: true,
        vertical: "center",
      };
    }
  }

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerOffset + 0, c: col });
    if (!ws["!cols"]) ws["!cols"] = [];
    const cell = ws[cellAddress];

    if (col === 0 || col === 2) {
      ws["!cols"][col] = { width: 30 };
    } else if (col === 1) {
      ws["!cols"][col] = { width: 60 };
    } else if (col === 3) {
      ws["!cols"][col] = { width: 15 };
    } else {
      ws["!cols"][col] = { width };
      cell.s.alignment = { horizontal: "center" };
    }

    if (!cell) ws[cellAddress] = {};
    if (!cell.s) cell.s = {};
  }

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerOffset + 1, c: col });
    if (!ws["!cols"]) ws["!cols"] = [];
    if (col >= 3) {
      const cell = ws[cellAddress];
      if (!cell) ws[cellAddress] = {};
      if (!cell.s) cell.s = {};
      cell.s.alignment = { horizontal: "center" };
    }
  }

  // MERGE Heading
  for (let i = 4; i < allVendors.length * 6 + 2; i += 6) { // Updated for 6 columns
    let columnToMergeStart = i;
    let columnToMergeEnd = i + 5; // Updated for 6 columns

    const mergeRange = {
      s: { r: headerOffset + 0, c: columnToMergeStart },
      e: { r: headerOffset + 0, c: columnToMergeEnd },
    };
    const mergeRangeDelivery = {
      s: { r: headerOffset + api_data.length + 8, c: columnToMergeStart },
      e: { r: headerOffset + api_data.length + 8, c: columnToMergeEnd },
    };
    const mergeRangePaymentTerms = {
      s: { r: headerOffset + api_data.length + 9, c: columnToMergeStart },
      e: { r: headerOffset + api_data.length + 9, c: columnToMergeEnd },
    };
    const mergeRangeComments = {
      s: { r: headerOffset + api_data.length + 10, c: columnToMergeStart },
      e: { r: headerOffset + api_data.length + 10, c: columnToMergeEnd },
    };
    const mergeRangeFiles = {
      s: { r: headerOffset + api_data.length + 11, c: columnToMergeStart },
      e: { r: headerOffset + api_data.length + 11, c: columnToMergeEnd },
    };

    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push(mergeRange);
    ws["!merges"].push(mergeRangeDelivery);
    ws["!merges"].push(mergeRangePaymentTerms);
    ws["!merges"].push(mergeRangeComments);
    ws["!merges"].push(mergeRangeFiles);

    for (let i = 1; i < maxFileLen; i++) {
      const mergeConfig = {
        s: { r: headerOffset + api_data.length + 11 + i, c: columnToMergeStart },
        e: { r: headerOffset + api_data.length + 11 + i, c: columnToMergeEnd },
      };
      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push(mergeConfig);
    }
  }

  // Packaging, Freight, GST, Target Price, Total Amount column width
  for (let i = 6; i < allVendors.length * 6 + 2; i += 6) { // Updated for 6 columns
    if (!ws["!cols"]) ws["!cols"] = [];
    ws["!cols"][i - 2] = { width: 10 };
    ws["!cols"][i - 1] = { width: 10 };
    ws["!cols"][i] = { width: 10 };
    ws["!cols"][i + 1] = { width: 12 }; // Target Price column
    ws["!cols"][i + 2] = { width: 12 };
  }

  if (!ws["!merges"]) ws["!merges"] = [];

  const columns = 4;
  for (let c = 0; c < columns; c++) {
    const mergeConfig = {
      s: { r: headerOffset + 0, c },
      e: { r: headerOffset + 1, c },
    };
    ws["!merges"].push(mergeConfig);
  }
  ws["!merges"].push({
    s: { r: headerOffset + 0, c: range.e.c - 1},
    e: { r: headerOffset + 1, c: range.e.c - 1},
  });

  ws["!merges"].push({
  s: { r: headerOffset + 0, c: range.e.c },
  e: { r: headerOffset + 1, c: range.e.c },
});

  for (let row = range.s.r; row <= range.e.r; row++) {
    const col = 0;
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    if (!ws[cellAddress]) ws[cellAddress] = {};
    if (!ws[cellAddress].s) ws[cellAddress].s = {};
    if (row > headerOffset + 1) {
      ws[cellAddress].s.alignment = {
        horizontal: "left",
        vertical: "center",
      };
    }
  }

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cellValue = ws[cellAddress] ? ws[cellAddress].v : "";
      if (cellValue === "-") {
        if (!ws[cellAddress].s) ws[cellAddress].s = {};
        ws[cellAddress].s.font = { bold: true, color: { rgb: "FF0000" } };
      }
    }
  }

  for (
    let i = headerOffset + 2 + api_data.length + 4;
    i < headerOffset + 2 + api_data.length + 4 + 6;
    i++
  ) {
    const cellAddress = XLSX.utils.encode_cell({ r: i, c: 0 });
    if (!ws[cellAddress]) ws[cellAddress] = {};
    if (!ws[cellAddress].s) ws[cellAddress].s = {};
    ws[cellAddress].s.font = { bold: true };
  }

  // Center merged column titles for the first two grid rows
  [
    XLSX.utils.encode_cell({ r: headerOffset + 0, c: 0 }),
    XLSX.utils.encode_cell({ r: headerOffset + 1, c: 0 }),
    XLSX.utils.encode_cell({ r: headerOffset + 0, c: 1 }),
    XLSX.utils.encode_cell({ r: headerOffset + 1, c: 1 }),
  ].forEach((addr) => {
    if (!ws[addr]) ws[addr] = {};
    if (!ws[addr].s) ws[addr].s = {};
    ws[addr].s.alignment = { vertical: "center", horizontal: "center" };
  });

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerOffset + 0, c: col });
    if (!ws[cellAddress]) ws[cellAddress] = {};
    if (!ws[cellAddress].s) ws[cellAddress].s = {};
    ws[cellAddress].s.font = { bold: true };
    ws[cellAddress].s.alignment = {
      wrapText: true,
      horizontal: "center",
      vertical: "center",
    };

    if (col >= 4 && col < range.e.c) {
      const cellAddress2 = XLSX.utils.encode_cell({ r: headerOffset + 1, c: col });
      if (!ws[cellAddress2]) ws[cellAddress2] = {};
      if (!ws[cellAddress2].s) ws[cellAddress2].s = {};
      ws[cellAddress2].s.font = { bold: true, sz: 9 };
    }
  }

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {};
      ws[cellAddress].s.border = {
        top: { style: "thin", color: { auto: 1 } },
        bottom: { style: "thin", color: { auto: 1 } },
        left: { style: "thin", color: { auto: 1 } },
        right: { style: "thin", color: { auto: 1 } },
      };
    }
  }

  for (let i = 4; i < allVendors.length * 6 + 4; i += 6) { // Updated for 6 columns
    for (let j = 0; j < api_data.length + 6 + 1; j++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerOffset + j, c: i });
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {};
      ws[cellAddress].s.border = {
        right: { style: "thin" },
        top: { style: "thin" },
        left: { style: "thick" },
        bottom: { style: "thin" },
      };
    }
  }

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerOffset + 0, c: col });
    if (!ws[cellAddress]) ws[cellAddress] = {};
    if (!ws[cellAddress].s) ws[cellAddress].s = {};
    ws[cellAddress].s.fill = { fgColor: { rgb: "DDDDDD" } };
    ws[cellAddress].s.font = { color: { rgb: "000000" }, sz: 12, bold: true };
  }

  let fileRow = headerOffset + 2 + api_data.length + 9;
  for (let row_i = fileRow; row_i < fileRow + maxFileLen; row_i++) {
    if (!ws["!rows"]) ws["!rows"] = [];
    ws["!rows"][row_i] = { hpx: 35 };

    for (let col = 4; col <= api_data.length * 6 + 4; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row_i, c: col });
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {};

      if (ws[cellAddress].v !== "" && ws[cellAddress].v !== "-") {
        const file_link = ws[cellAddress].v;
        ws[cellAddress].l = { Target: file_link };
        ws[cellAddress].s = {
          alignment: {
            wrapText: true,
            horizontal: "left",
            vertical: "top"
          },
          font: {
            color: { rgb: "0000FF" },
            underline: true,
          },
          border: {
            right: { style: "thin" },
            top: { style: "thin" },
            bottom: { style: "thin" },
          }
        };
      }
    }
  }

  if (maxFileLen > 1) {
    for (let c = 0; c < columns; c++) {
      const mergeConfig = {
        s: { r: fileRow, c },
        e: { r: fileRow + maxFileLen - 1, c },
      };
      ws["!merges"].push(mergeConfig);
    }
  }

  // Merge and style the RFQ title row across all columns
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalColumns - 1 } });
  const titleAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (!ws[titleAddr]) ws[titleAddr] = { v: titleText };
  if (!ws[titleAddr].s) ws[titleAddr].s = {};
  ws[titleAddr].s = {
    font: { bold: true, sz: 20 },
    alignment: { horizontal: "left", vertical: "center" },
    fill: { fgColor: { rgb: "DDDDDD" } },
  };

  // Light highlight for the two info rows
  for (let r = 1; r <= 2; r++) {
    for (let c = 0; c < totalColumns; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = {};
      if (!ws[addr].s) ws[addr].s = {};
      ws[addr].s.fill = { fgColor: { rgb: "FFFFFF" } };
      if (c % 2 === 0) {
        ws[addr].s.font = { bold: true };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  try {
    const filename = `${currentRFQ?.rfq_no}_quotes.xlsx`;
    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });
    setDownloadLoading(false);
    return [excelBuffer, filename];
  } catch (error) {
    console.error("Error generating Excel file:", error);
    return null;
  }
};


  const FilterOutGlobalTermsFiles = (all_data) => {
    let fileArr = Array.from({ length: all_data[0]?.all_vendors.length || 0 }, () => []);

    // Get global document files from all_vendors instead of product-specific files
    if (all_data[0]?.all_vendors) {
      all_data[0].all_vendors.forEach((vendor, index) => {
        fileArr[index] = vendor.global_document_files ? vendor.global_document_files : [];
      });
    }
    
    return fileArr;
  }
   
const handleSubmitTargetPrice = async ({ productId, vendorIds, targetPrice }) => {
  try {
    const result = await updateTargetPrice({productId, vendorIds, targetPrice , rfq_id : rfq });
    
    if (!result) {
      toast.error("Error updating Target Price");
    } else {
      toast.success("Target Price created and vendors have been informed");
    }
  } catch (error) {
    toast.error(error.message || "Failed to update Target Price");
    console.error("Update target price error:", error);
  }
};
  const handleRFqClose = (e) => {
    e.preventDefault();
    setShowCloseConfirmModal(true);
  };

  const handleCloseConfirm = async () => {
    setcloseRFqLoading(true);
    try {
      await closeRFQ(rfq);
      getRespectiveQuotes();
      toast.success(`${getEntityLabel(currentRFQ?.is_tender)} closed successfully`);
    } catch (err) {
      console.error("Error closing RFQ:", err);
      toast.error(`Failed to close ${getEntityLabel(currentRFQ?.is_tender)}`);
    } finally {
      setcloseRFqLoading(false);
      setShowCloseConfirmModal(false);
    }
  };

  const handleCloseCancel = () => {
    setShowCloseConfirmModal(false);
  };

  const handleFinalize = (item, proditem, existingPOId, selectedHierarchy, routeType = 'PO') => {
    setfinalizeLoading(true);
    const specs = proditem.product_details[0].rfq_details;

    // PO-related payload - only include full details for PO route
    const poRequiredPayload = routeType === 'PO' ? {
      project_id: proditem.rfq[0].project_id,
      total_value: item.total_price,
      existing_po_id: existingPOId,
      selected_hierarchy: selectedHierarchy,
      product_info: {
        rfq_product_id: proditem.id,
        quantity: specs.find(spec => spec.title == 'Quantity')?.value ?? -1,
        unit: specs.find(spec => spec.title == 'Unit')?.value ?? "N/A",
        unit_price: item.unit_price,
        charges_meta: {
          freight_price: item.freight_price,
          freight_mode: item.freight_mode,
          package_price: item.package_price,
          package_mode: item.package_mode,
          tax: item.tax,
          tax_mode: item.tax_mode
        },
        finalized_vendor_id: item.quote_details.created_by
      },
    } : {
      // Minimal payload for ARC route
      product_info: {
        rfq_product_id: proditem.id,
        quantity: specs.find(spec => spec.title == 'Quantity')?.value ?? -1,
        unit: specs.find(spec => spec.title == 'Unit')?.value ?? "N/A",
        unit_price: item.unit_price,
        finalized_vendor_id: item.quote_details.created_by
      }
    };

    const payload = {
      rfq_id: proditem.rfq_id,
      rfq_no: proditem.rfq[0].rfq_no,
      product_variant_id: proditem.product_variant_id,
      vendor_id: item.quote_details.created_by,
      quote_id: item.quote_id,
      quote_item_id: item.quote_item_id,
      variant: proditem.variant,
      route_type: routeType, // Pass the selected route type
      ...poRequiredPayload
    };

    finalizeQuotation(payload)
      .then((res) => {
        setfinalizeLoading(false);
        const routeMsg = routeType === 'ARC' 
          ? "Vendor finalized! ARC approval will be triggered when all products are finalized."
          : "Vendor finalized! Purchase Order created.";
        toast.success(res.message ?? routeMsg)
        getRespectiveQuotes();
      })
      .catch((err) => {
        setfinalizeLoading(false);
        toast.error(err?.message?.response?.data?.message ?? err.message ?? "Something went wrong in finalizing a vendor!")
      });
  };

  useEffect(() => {
    if (rfq) {
      setTA_Filter(false);
      setFreightFilter(false);
      setNormalizeFilter(false);
    }
  }, [rfq]);

  useEffect(() => {
    if (rfq && myRFQs) {
      const rfq_details = myRFQs.find((rfq_item) => rfq_item.id == rfq);
      setcurrentRFQ(rfq_details);
    }
  }, [rfq, myRFQs])

  useEffect(() => {
    getAllRFQs();
  }, [page, selectedproject, isTenderFilter]);
  
// useEffect(()=>{
//   if(quotes)
//     console.log("logging here best possible price",quotes[0]?.latest_target_price)
// },[])

// const handleTargetPriceSubmit = async ({ productId, vendorIds, targetPrice }) => {
//   console.log("Submitted Data:", { productId, vendorIds, targetPrice });

// };

  // Permission loading state - show loading while permissions are being verified
  // This prevents data from being fetched until permissions are checked
  if (currentRFQ && (permissionsLoading || !rfqMetadataReady)) {
    return (
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted">Verifying permissions...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Access denied check - show only if user has NO permissions for EITHER section
  if (currentRFQ && !permissionsLoading && !canReadNegotiation && !canReadQuoteCompare) {
    return <AccessDeniedPage />;
  }

  return (
    <>
      {finalizeLoading && <Loader />}
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              <h3 className="heading">Compare Received Quote</h3>
            </div>
            <div className="col-md-8">
              {rfq && quotes && quotes.length > 0 && (
                <div className="btn-options float-end">
                  {/* Download quote & Close Rfq Buttons */}
                  <span id="download_quote_actions-quote_compare_page" onClick={handleDownloadQuote}>
                    {" "}
                    {downloadLoading
                      ? "Generating Excel file...."
                      : "Download as Excel"}{" "}
                  </span>

                  <>
                    {quotes[0]?.rfq[0]?.status == 1 && (
                      <span id="close_rfq_actions-quote_compare_page" onClick={handleRFqClose}>
                        {closeRFqLoading
                          ? "Processing request..."
                          : `Mark ${getEntityLabel(quotes[0]?.rfq[0]?.is_tender)} as Closed`}
                      </span>
                    )}
                    {quotes[0]?.rfq[0]?.status == 2 && (
                      <span className="disabled-button">
                        {getEntityLabel(quotes[0]?.rfq[0]?.is_tender)} has been closed
                      </span>
                    )}
                  </>
                <span onClick={handleNormalizeClick} id="normalize_quotes_button-top_actions-compare_quotes_page">
                  {normalizeFilter ? "Remove Normalize Quotes" : "Normalize Quotes Smartly"}
                </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-2">
              <div className="hasFullLoader">
                <p className="px-1 pt-3 fs-6 mb-1 fw-medium">Quotes Received</p>
                {loading && <FullLoader />}
                <div className="py-1">
                  <label>Search {getEntityLabel(currentRFQ?.is_tender)} No.</label>
                  <input
                    className="form-control react-select"
                    style={{
                      borderRadius: "0.25rem",
                      borderColor: "#ced4da",
                      boxShadow: "none",
                    }}
                    value={rfqNo}
                    onChange={(e) => setRfqNo(e.target.value)}
                    name="rfq_type"
                    placeholder="Ex. 123456"
                    isClearable
                    id="search_rfq_no-quotes_received-compare_quotes_page"
                  />
                </div>
                {userHotelMappings.length > 0 && (
                  <div className="py-2">
                    <label>Select Hotels</label>
                    <Select
                      isMulti
                      options={userHotelMappings}
                      value={userHotelMappings.filter(opt => 
                        selectedHotelIds.includes(opt.hospitality_hotel_id)
                      )}
                      onChange={(selectedOptions) => {
                        const ids = selectedOptions 
                          ? selectedOptions.map(opt => opt.hospitality_hotel_id)
                          : [];
                        handleHotelSelectionChange(ids);
                      }}
                      placeholder="Select Hotels..."
                      closeMenuOnSelect={false}
                      classNamePrefix="react-select"
                      isClearable
                      formatOptionLabel={(option) => (
                        <div>
                          <span>{option.hotel_name}</span>
                        </div>
                      )}
                      getOptionValue={(option) => option.hospitality_hotel_id}
                      id="select_hotels_filter-quotes_received-compare_quotes_page"
                    />
                  </div>
                )}
                <div className="py-2">
                  <label>Select Project</label>
                  <Select
                    options={projects}
                    onChange={(selectedOption, actionMeta) =>
                      setSelectedproject(
                        selectedOption?.value ? selectedOption.value : -1
                      )
                    }
                    // value={selectedproject}
                    name="project_id"
                    placeholder="Select"
                    isClearable
                    id="select_project_filter-quotes_received-compare_quotes_page"
                  />
                </div>
                <div className="py-2">
                  <label>Type</label>
                  <Select
                    options={[
                        { label: "RFQ", value: "0" },
                        { label: "Tender", value: "1" }
                    ]}
                    onChange={(selectedOption) => {
                      setIsTenderFilter(selectedOption?.value || null);
                      setpage(1);
                    }}
                    value={isTenderFilter !== null ? { label: isTenderFilter === '1' || isTenderFilter === 1 ? "Tender" : "RFQ", value: isTenderFilter } : null}
                    placeholder="Select"
                    isClearable
                    id="is_tender_filter-quotes_received-compare_quotes_page"
                  />
                </div>
                {!loading && myRFQs && myRFQs.length === 0 ? (
                  <p style={{ textAlign: "center" }}>No {getEntityLabel(currentRFQ?.is_tender, true)} yet!</p>
                ) : !loading && myRFQs && myRFQs.length > 0 ? (
                  <ul
                    className="overflow-y-auto mt-1"
                    style={{ maxHeight: "70vh" }}
                  >
                    {myRFQs.map((item) => {
                      const negStatus = sidebarNegotiationMap[item.id] || {};
                      const isSelected = item.id == rfq;
                      return (
                        <li
                          key={item.id}
                          className={`${
                            isSelected ? "active rounded" : ""
                          }`}
                          style={!isSelected && negStatus.userNeedsToApprove ? { backgroundColor: '#fff3f3', borderLeft: '3px solid #dc3545' } : !isSelected && negStatus.hasPending ? { backgroundColor: '#fff8e1', borderLeft: '3px solid #ffc107' } : !isSelected && negStatus.hasActive ? { borderLeft: '3px solid #28a745' } : {}}
                        >
                          <Link
                            href={`/dashboard/buyer/quote-compare/?rfq=${item?.id}`}
                            className={`${
                              isSelected ? "text-white" : "text-dark"
                            }`}
                            id={`rfq_item_${item.rfq_no}-quotes_received-compare_quotes_page`}
                          >
                            {item.title && item.title != "" && (
                              <span
                                className="d-block fw-bold"
                                style={{ fontSize: "14px" }}
                              >
                                {item.title}
                              </span>
                            )}
                            <span className="d-flex align-items-center gap-1 flex-wrap">
                              {formatRFQNumber(item?.rfq_no, item?.is_tender)}
                              {!isSelected && negStatus.userNeedsToApprove && (
                                <Badge bg="danger" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Your Approval Required</Badge>
                              )}
                              {!isSelected && negStatus.hasPending && !negStatus.userNeedsToApprove && (
                                <Badge bg="warning" text="dark" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Approval Pending</Badge>
                              )}
                              {!isSelected && negStatus.hasActive && !negStatus.hasPending && (
                                <Badge bg="info" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Negotiation</Badge>
                              )}
                            </span>
                            {item.project_name && item.project_name != "" && (
                              <b
                                className="d-block fw-semibold"
                                style={{ fontSize: "14px" }}
                              >
                                {item.project_name}
                              </b>
                            )}
                          </Link>
                        </li>
                      );
                    })}

                    {hasMoreQuotes && !loading && myRFQs.length >= 10 && (
                      <Link
                        href="#"
                        id="load_more_rfqs-quote_list-quote_compare_page" className="d-flex justify-content-end px-3 pe-auto"
                        onClick={loadMoreRFQs}
                      >
                        <span className="link-primary">...Load More</span>
                      </Link>
                    )}

                    {hasMoreQuotes && loading && (
                      <div className="d-flex justify-content-center align-items-center">
                        Loading ...
                        <div
                          className="spinner-border spinner-border-sm text-primary ms-2"
                          role="status"
                        >
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    )}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="col-md-10">
              <div className="quote-sec-table quote-sec-tab">
                {!quotesLoading && currentRFQ && (
                  <div className="mb-3">
                    {currentRFQ.title && currentRFQ.title != "" && (
                      <h3 className="fs-5 mb-1 fw-bold">
                        {currentRFQ.title}
                      </h3>
                    )}
                    <h3 className="fs-5 mb-1">
                      <span className="fw-semibold">{getEntityLabel(currentRFQ?.is_tender)} No : </span>
                      {currentRFQ?.rfq_no}
                    </h3>
                    {currentRFQ.project_name &&
                      currentRFQ.project_name != "" && (
                        <p className="sub-heading fs-6 mb-2">
                          {currentRFQ.project_name}
                        </p>
                      )}
                    <hr />

                    <div className="row text-sm ">
                      <div className="col-md-6">
                        <p className="sub-heading mb-0">
                          <b>Company Name</b> : {currentRFQ.company_name}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Company Name</b> : {currentRFQ?.hotel_name || ''}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Contact Person Name</b> : {currentRFQ.contact_name}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Response Email</b> : {currentRFQ.response_email}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Contact Number</b> : {currentRFQ.contact_number}
                        </p>
                        {currentRFQ.location && currentRFQ.location != "" && (
                          <p className="sub-heading mb-0">
                            <b>Delivery Location</b> : {currentRFQ.location}
                          </p>
                        )}
                      </div>

                      <div className="col-md-6">
                        <p className="sub-heading mb-0">
                          <b>Reverse Auction</b> :{" "}
                          {currentRFQ.reverse_auction == 1
                            ? "Enabled"
                            : "Disabled"}
                        </p>
                        {currentRFQ.reverse_auction == 1 && (
                          <>
                            <p className="sub-heading mb-0">
                              <b>Auction Start Date</b> :{" "}
                              {currentRFQ.ra_start_date || "Not specified"}
                            </p>
                            <p className="sub-heading mb-0">
                              <b>Auction End Date</b> :{" "}
                              {currentRFQ.ra_end_date || "Not specified"}
                            </p>
                          </>
                        )}
                        {currentRFQ.rfq_type && currentRFQ.rfq_type != "" && (
                          <p className="sub-heading mb-0">
                          <b>{getEntityLabel(currentRFQ?.is_tender)} Type</b> : {currentRFQ.rfq_type}
                          </p>
                        )}
                        <p className="sub-heading mb-0">
                          <b>Quote Submission Deadline</b> : {currentRFQ.bid_end_date}
                        </p>
                        {currentRFQ.comment && currentRFQ.comment != "" && (
                          <p className="sub-heading mb-0">
                            <b>Comment</b> : {currentRFQ.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Negotiation read-only banner - only show if user CAN read negotiation but CANNOT write */}
                {currentRFQ && canReadNegotiation && !canWriteNegotiation && !permissionsLoading && (
                  <ReadOnlyBanner
                    title="Negotiation View Only"
                    message="You don't have edit permissions for negotiation rounds."
                  />
                )}
                {/* Only show NegotiationCompactBanner if user has negotiation read permission */}
                {"rfq" in router?.query && quotes && quotes.length > 0 && canReadNegotiation && (
                  <NegotiationCompactBanner
                    rfq_id={rfq}
                    products={quotes || []}
                    canWrite={canWriteNegotiation}
                    permissionsLoading={negotiationPermissionsLoading}
                    hospitalityCompanyId={currentRFQ?.hospitality_company_id}
                    hotelId={currentRFQ?.hotel_id}
                    departmentId={currentRFQ?.department_id}
                    onRoundChange={loadNegotiationData}
                  />
                )}
                {/* Show message if no quote-compare permission but has negotiation */}
                {"rfq" in router?.query && !canReadQuoteCompare && canReadNegotiation && !permissionsLoading && (
                  <div className="alert alert-info mt-3" role="alert">
                    You don't have permission to view quote comparisons.
                  </div>
                )}
                {/* Only show quote-compare section if user has quote-compare read permission */}
                {"rfq" in router?.query && canReadQuoteCompare && (
                  <>
                  {/* Quote-Compare read-only banner - only show if user CAN read quote-compare but CANNOT write */}
                  {currentRFQ && !canWriteQuoteCompare && !permissionsLoading && (
                    <ReadOnlyBanner
                      title="Quote Compare View Only"
                      message="You don't have edit permissions for quote comparison and finalization."
                      className="mt-3"
                    />
                  )}
                  <div
                    className="tabs-container quote-compare-tabs"
                    style={{
                      borderBottom: "1px solid #e0e0e0",
                      marginBottom: 16,
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "flex-end",
                      gap: "12px 8px",
                    }}
                  >
                    <div className="d-flex flex-shrink-0 gap-1 align-items-stretch" style={{ flexWrap: "nowrap" }}>
                      <Link
                        href="#"
                        className={`tab quote-compare-tab-link ${activeTab === "product" ? "active" : ""}`}
                        style={{
                          background: activeTab === "product" ? "#2d5ba7" : "#fff",
                          color: activeTab === "product" ? "#fff" : "#2d5ba7",
                          border: "1px solid #2d5ba7",
                          borderBottom: activeTab === "product" ? "none" : "1px solid #2d5ba7",
                          borderRadius: "8px 8px 0 0",
                          padding: "8px 20px",
                          fontWeight: 500,
                          position: "relative",
                          top: activeTab === "product" ? 2 : 0,
                          zIndex: activeTab === "product" ? 2 : 1,
                          transition: "background 0.2s, color 0.2s",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                        onClick={() => setActiveTab("product")}
                        id="product_tab-quote_tabs-quote_compare_page"
                      >
                        Product Wise Comparison
                      </Link>
                      <Link
                        href="#"
                        className={`tab quote-compare-tab-link ${activeTab === "category" ? "active" : ""}`}
                        style={{
                          background: activeTab === "category" ? "#2d5ba7" : "#fff",
                          color: activeTab === "category" ? "#fff" : "#2d5ba7",
                          border: "1px solid #2d5ba7",
                          borderBottom: activeTab === "category" ? "none" : "1px solid #2d5ba7",
                          borderRadius: "8px 8px 0 0",
                          padding: "8px 20px",
                          fontWeight: 500,
                          position: "relative",
                          top: activeTab === "category" ? 2 : 0,
                          zIndex: activeTab === "category" ? 2 : 1,
                          transition: "background 0.2s, color 0.2s",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                        onClick={() => setActiveTab("category")}
                        id="category_tab-quote_tabs-quote_compare_page"
                      >
                        Category wise Comparison
                      </Link>
                      <Link
                        href="#"
                        className={`tab quote-compare-tab-link ${activeTab === "cost" ? "active" : ""}`}
                        style={{
                          background: activeTab === "cost" ? "#2d5ba7" : "#fff",
                          color: activeTab === "cost" ? "#fff" : "#2d5ba7",
                          border: "1px solid #2d5ba7",
                          borderBottom: activeTab === "cost" ? "none" : "1px solid #2d5ba7",
                          borderRadius: "8px 8px 0 0",
                          padding: "8px 20px",
                          fontWeight: 500,
                          position: "relative",
                          top: activeTab === "cost" ? 2 : 0,
                          zIndex: activeTab === "cost" ? 2 : 1,
                          transition: "background 0.2s, color 0.2s",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                        onClick={() => setActiveTab("cost")}
                        id="overall_cost_tab-quote_tabs-quote_compare_page"
                      >
                        Overall Cost Comparison
                      </Link>
                    </div>
                    <div
                      className="d-flex flex-column gap-2 quote-compare-toggles"
                      style={{ flexBasis: "100%", minWidth: 0, marginTop: 4 }}
                    >
                      {TEavailable && (
                        <div className="form-check form-switch d-flex align-items-center gap-2 m-0">
                          <input
                            className="form-check-input border-dark-subtle flex-shrink-0"
                            type="checkbox"
                            role="switch"
                            checked={TA_Filter}
                            id="ta_filter_toggle-quote_tabs-quote_compare_page"
                            onChange={handleTAFilterChange}
                          />
                          <label className="form-check-label flex-grow-1 m-0" htmlFor="ta_filter_toggle-quote_tabs-quote_compare_page">
                            View Technically Accepted Vendors
                          </label>
                        </div>
                      )}

                      {!normalizeFilter && (
                        <div className="form-check form-switch d-flex align-items-center gap-2 m-0">
                          <input
                            className="form-check-input border-dark-subtle flex-shrink-0"
                            type="checkbox"
                            role="switch"
                            checked={freightFilter}
                            id="freight_filter_toggle-quote_tabs-quote_compare_page"
                            onChange={handleFreightFilterChange}
                          />
                          <label
                            className="form-check-label flex-grow-1 m-0"
                            htmlFor="freight_filter_toggle-quote_tabs-quote_compare_page"
                          >
                            View quotes without freight
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  </>
                )}

                {!rfq && canReadQuoteCompare && (
                  <div className="quote-sec-main">
                    <div className="quote-sec-table-sub">
                      <h4 className="text-center">
                        Please select a RFQ to view its quotes!
                      </h4>
                    </div>
                  </div>
                )}

                {rfq && canReadQuoteCompare && (
                  <div className="quote-sec-main">
                    {activeTab === "product" && (
                      <>
                        {quotesLoading && (
                          <div className="quote-sec-table-sub hasFullLoader">
                            <FullLoader />
                          </div>
                        )}
                        {!quotesLoading && quotes.length === 0 && (
                          <div className="quote-sec-table-sub hasFullLoader">
                            <h4>You don't have any quotes.</h4>
                          </div>
                        )}
                        {quotes &&
                          quotes.length > 0 &&
                          quotes.map((item, index) => {
                            const key = `${item.product_variant_id}_${item.variant}`;
                            const product_specs =
                              item?.product_details[0]?.rfq_details;
                            const spec = product_specs?.find(
                              (spec) => spec.title == "Spec"
                            )?.value;
                            const selling_price = product_specs?.find(
                              (spec) => spec.title == "total_price"
                            )?.value;
                            const product_name = item?.product_details.map(
                              (prod) => prod.product_name
                            );

                            return (
                              <div
                                className="quote-sec-table-sub"
                                key={`qq_${index}`}
                              >
                                <div className="row">
                                  <div className="d-flex justify-content-between">
                                    <div>
                                      <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <p className="sub-heading mb-0">
                                          <b>Product</b> :{" "}
                                          {item?.product_details[0]?.product_name}
                                        </p>
                                        <ProductNegotiationBadge 
                                          rfq_id={rfq} 
                                          rfq_product_id={item.id} 
                                        />
                                      </div>
                                      {spec && (
                                        <div className="sub-heading mb-0 d-flex align-items-start" style={{ gap: "0.5rem" }}>
                                          <b style={{ whiteSpace: "nowrap" }}>Spec: </b>
                                          <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                            <ReadMore
                                              content={spec}
                                              maxLines={3}
                                            />
                                          </div>
                                        </div>
                                      )}
                                      {selling_price && (
                                        <p className="sub-heading mb-0">
                                          <b>Selling Price</b> :{" "}
                                          {"₹" + addCommasToNumber(selling_price)}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <div className="d-flex gap-2">
                                        <Button
                                          id="view_lpr_button-quote_actions-quote_compare_page"
                                      variant="primary"
                                          size="sm"
                                          className="position-relative p-2 px-2"
                                          onClick={() =>
                                            openModalForVariant(key)
                                          }
                                        >
                                          View LPR History
                                        </Button>

                                        {/* <Button
                                          variant="success"
                                          size="sm"
                                          className="position-relative p-2 px-2"
                                          onClick={() => {
                                            getPricehistory(item.id),
                                              setOpenModalId(item.id);
                                          }}
                                        >
                                          Set Target Price
                                        </Button> */}
                                      </div>

                                      {/* <InputModal
                                        show={openModalId === item.id}
                                        onHide={() => setOpenModalId(null)}
                                        onSubmit={(targetPrice) =>
                                          handleSubmitTargetPrice(
                                            targetPrice,
                                            item.id
                                          )
                                        }
                                        productName={product_name}
                                        initialValue={item.latest_target_price}
                                        numericLabel="Target Price"
                                        modalTitle="Set Target Price"
                                        historyData={targetPriceHistory} // pass array directly
                                      /> */}
                                    </div>
                                  </div>
                                  {item?.last_purchase_rate != null && (
                                    <div className="col-12 bg-transparent border-0 m">
                                      <div className="d-flex justify-content-between align-items-center px-2 mb-2">
                                        <div className="flex-grow-1 text-center">
                                          <p className="sub-heading mb-0">
                                            <b>Last Purchase Details :</b>
                                          </p>
                                        </div>
                                      </div>
                                      <div className="sub-heading border rounded-3 p-2">
                                        <div className="row fw-medium mx-2">
                                          <div className="col-md-3 col-lg-2">
                                            <span>Base Price </span>
                                            {loading ? (
                                              <span className="d-block mt-1">
                                                <PlaceholderLoading
                                                  shape="rect"
                                                  width={80}
                                                  height={20}
                                                />
                                              </span>
                                            ) : (
                                              <span className="d-block fw-medium text-muted ">
                                                {formatPrice(
                                                  item?.last_purchase_rate
                                                    ?.unit_price
                                                ) || "---"}
                                              </span>
                                            )}
                                          </div>
                                          <div className="col-md-3 col-lg-2">
                                            <span>Freight Rate </span>
                                            {loading ? (
                                              <span className="d-block mt-1">
                                                <PlaceholderLoading
                                                  shape="rect"
                                                  width={80}
                                                  height={20}
                                                />
                                              </span>
                                            ) : (
                                              <span className="d-block fw-medium text-muted ">
                                                {item?.last_purchase_rate
                                                  ?.freight_price !== null
                                                  ? `${item?.last_purchase_rate?.freight_price}%`
                                                  : "0%"}
                                              </span>
                                            )}
                                          </div>
                                          <div className="col-md-3 col-lg-2">
                                            <span>Packaging Rate </span>
                                            {loading ? (
                                              <span className="d-block mt-1">
                                                <PlaceholderLoading
                                                  shape="rect"
                                                  width={80}
                                                  height={20}
                                                />
                                              </span>
                                            ) : (
                                              <span className="d-block fw-medium text-muted ">
                                                {item?.last_purchase_rate
                                                  ?.package_price !== null
                                                  ? `${item?.last_purchase_rate?.package_price}%`
                                                  : "0%"}
                                              </span>
                                            )}
                                          </div>
                                          <div className="col-md-3 col-lg-2">
                                            <span>Tax </span>
                                            {loading ? (
                                              <span className="d-block mt-1">
                                                <PlaceholderLoading
                                                  shape="rect"
                                                  width={80}
                                                  height={20}
                                                />
                                              </span>
                                            ) : (
                                              <span className="d-block fw-medium text-muted ">
                                                {item?.last_purchase_rate
                                                  ?.tax !== null
                                                  ? `${item?.last_purchase_rate?.tax}%`
                                                  : "0%"}
                                              </span>
                                            )}
                                          </div>
                                          <div className="col-md-3 col-lg-2">
                                            <span>Quantity </span>
                                            {loading ? (
                                              <span className="d-block mt-1">
                                                <PlaceholderLoading
                                                  shape="rect"
                                                  width={80}
                                                  height={20}
                                                />
                                              </span>
                                            ) : (
                                              <span className="d-block fw-medium text-muted ">
                                                {item?.last_purchase_rate
                                                  ?.quantity || "---"}
                                              </span>
                                            )}
                                          </div>
                                          <div className="col-md-3 col-lg-2">
                                            <span>Total Price </span>
                                            {loading ? (
                                              <span className="d-block mt-1">
                                                <PlaceholderLoading
                                                  shape="rect"
                                                  width={80}
                                                  height={20}
                                                />
                                              </span>
                                            ) : (
                                              <span className="d-block fw-medium text-muted ">
                                                {formatPrice(
                                                  item?.last_purchase_rate
                                                    ?.total_price
                                                ) || "---"}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {item?.last_purchase_rate == null &&
                                    item?.last_quote_rate != null && (
                                      <div className="col-12 bg-transparent border-0 m">
                                        <div className="d-flex justify-content-between align-items-center px-2 mb-2">
                                          <div className="flex-grow-1 text-center">
                                            <p className="sub-heading mb-0">
                                              <Badge
                                                bg={item?.last_quote_rate?.is_tender === 1 || item?.last_quote_rate?.is_tender === true ? "info" : "secondary"}
                                                className="me-2"
                                                style={{ fontSize: '0.7rem' }}
                                              >
                                                {item?.last_quote_rate?.is_tender === 1 || item?.last_quote_rate?.is_tender === true ? "Tender" : "RFQ"}
                                              </Badge>
                                              <b>Last Quoted Details :</b>
                                            </p>
                                          </div>
                                        </div>
                                        <div className="sub-heading border rounded-3 p-2">
                                          <div className="row fw-medium mx-2">
                                            <div className="col-md-3 col-lg-2">
                                              <span>Base Price </span>
                                              {loading ? (
                                                <span className="d-block mt-1">
                                                  <PlaceholderLoading
                                                    shape="rect"
                                                    width={80}
                                                    height={20}
                                                  />
                                                </span>
                                              ) : (
                                                <span className="d-block fw-medium text-muted ">
                                                  {formatPrice(
                                                    item?.last_quote_rate
                                                      ?.unit_price
                                                  ) || "---"}
                                                </span>
                                              )}
                                            </div>
                                            <div className="col-md-3 col-lg-2">
                                              <span>Freight Rate </span>
                                              {loading ? (
                                                <span className="d-block mt-1">
                                                  <PlaceholderLoading
                                                    shape="rect"
                                                    width={80}
                                                    height={20}
                                                  />
                                                </span>
                                              ) : (
                                                <span className="d-block fw-medium text-muted ">
                                                  {item?.last_quote_rate
                                                    ?.freight_price !== null
                                                    ? `${item?.last_quote_rate?.freight_price}%`
                                                    : "0%"}
                                                </span>
                                              )}
                                            </div>
                                            <div className="col-md-3 col-lg-2">
                                              <span>Packaging Rate </span>
                                              {loading ? (
                                                <span className="d-block mt-1">
                                                  <PlaceholderLoading
                                                    shape="rect"
                                                    width={80}
                                                    height={20}
                                                  />
                                                </span>
                                              ) : (
                                                <span className="d-block fw-medium text-muted ">
                                                  {item?.last_quote_rate
                                                    ?.package_price !== null
                                                    ? `${item?.last_quote_rate?.package_price}%`
                                                    : "0%"}
                                                </span>
                                              )}
                                            </div>
                                            <div className="col-md-3 col-lg-2">
                                              <span>Tax </span>
                                              {loading ? (
                                                <span className="d-block mt-1">
                                                  <PlaceholderLoading
                                                    shape="rect"
                                                    width={80}
                                                    height={20}
                                                  />
                                                </span>
                                              ) : (
                                                <span className="d-block fw-medium text-muted ">
                                                  {item?.last_quote_rate
                                                    ?.tax !== null
                                                    ? `${item?.last_quote_rate?.tax}%`
                                                    : "0%"}
                                                </span>
                                              )}
                                            </div>
                                            <div className="col-md-3 col-lg-2">
                                              <span>Quantity </span>
                                              {loading ? (
                                                <span className="d-block mt-1">
                                                  <PlaceholderLoading
                                                    shape="rect"
                                                    width={80}
                                                    height={20}
                                                  />
                                                </span>
                                              ) : (
                                                <span className="d-block fw-medium text-muted ">
                                                  {item?.last_quote_rate
                                                    ?.quantity || "---"}
                                                </span>
                                              )}
                                            </div>
                                            <div className="col-md-3 col-lg-2">
                                              <span>Total Price </span>
                                              {loading ? (
                                                <span className="d-block mt-1">
                                                  <PlaceholderLoading
                                                    shape="rect"
                                                    width={80}
                                                    height={20}
                                                  />
                                                </span>
                                              ) : (
                                                <span className="d-block fw-medium text-muted ">
                                                  {formatPrice(
                                                    item?.last_quote_rate
                                                      ?.total_price
                                                  ) || "---"}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  <LPRModal
                                    show={openModals[key] || false}
                                    onHide={() => closeModalForVariant(key)}
                                    variantId={item.product_variant_id}
                                  />
                                </div>
                                {item?.quotations &&
                                  item?.quotations.length === 0 && (
                                    <h4 className="mt-4 text-center">
                                      No Quotations yet!
                                    </h4>
                                  )}
                                {item?.quotations &&
                                  item?.quotations.length > 0 && (
                                    <>
                      <QuoteCompareTable
                                        proditem={item}
                                        handleFinalize={handleFinalize}
                                        quotations={item?.quotations}
                                        originalQuotations={originalQuotes.find(origItem => origItem.id === item.id)?.quotations || item?.quotations}
                                        quantity={
                                          item?.product_details[0]?.rfq_details
                                            ? item?.product_details[0]
                                                ?.rfq_details[2]?.value
                                            : "-"
                                        }
                                        alreadyFinalized={item?.quotations?.filter(
                                          (item) => item.finalization != null
                                        )}
                                        isRfqClosed={
                                          Array.isArray(item.rfq) &&
                                          item.rfq[0]?.status === 2
                                        }
                                        projectId={
                                          Array.isArray(item.rfq) &&
                                          item.rfq[0]?.project_id
                                        }
                                        availableBudget={availableBudget}
                                        targetPrice={item.latest_target_price}
                                        // targetHistory={targetPriceHistory}
                        normalizeFilter={normalizeFilter}
                        negotiationRoundQuotes={productNegotiationData[item.id]?.roundQuotes || []}
                        activeRound={productNegotiationData[item.id]?.activeRound || null}
                        freightFilter={freightFilter}
                        vendorCodeMap={vendorCodeMap}
                        onRoundEnded={loadNegotiationData}
                        canWrite={canWriteQuoteCompare}
                        permissionsLoading={quoteComparePermissionsLoading}
                        is_tender={currentRFQ?.is_tender === 1 || currentRFQ?.is_tender === true}
                        hospitalityCompanyId={currentRFQ?.hospitality_company_id}
                        hotelId={currentRFQ?.hotel_id}
                        departmentId={currentRFQ?.department_id}
                                      />
                                    </>
                                  )}
                              </div>
                            );
                          })}
                      </>
                    )}
                    {activeTab === "category" && (
                      <OverallComparison
                        rfq_id={rfq}
                        rfq_product_id={rfq_product_id}
                        source={source}
                        TA_Filter={TA_Filter}
                        normalizeFilter={normalizeFilter}
                        freightFilter={freightFilter}
                        RFQ_no={currentRFQ?.rfq_no}
                        productNegotiationData={productNegotiationData}
                      />
                    )}
                    {activeTab === "cost" && (
                      <OverallCostComparison
                        rfq_id={rfq}
                        rfq_product_id={rfq_product_id}
                        source={source}
                        TA_Filter={TA_Filter}
                        normalizeFilter={normalizeFilter}
                        freightFilter={freightFilter}
                        RFQ_no={currentRFQ?.rfq_no}
                        is_tender={currentRFQ?.is_tender === 1 || currentRFQ?.is_tender === true}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <NormalizeInfoModal
        show={showNormalizeModal}
        // secondsLeft={normSecondsLeft}
        onClose={handleCloseNormalizeModal}
        is_tender={currentRFQ?.is_tender}
      />

      {/* Close Tender / RFQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCloseConfirmModal}
        onClose={handleCloseCancel}
        onConfirm={handleCloseConfirm}
        title={`Close ${getEntityLabel(quotes[0]?.rfq[0]?.is_tender)}`}
        description={`Are you sure you want to close ${getEntityLabel(quotes[0]?.rfq[0]?.is_tender)} #${quotes[0]?.rfq[0]?.rfq_no || ''}?\nOnce closed, vendors will no longer be able to submit quotes.`}
        confirmButtonColor="warning"
        confirmButtonText={`Close ${getEntityLabel(quotes[0]?.rfq[0]?.is_tender)}`}
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default QuoteCompare;



