import React, { useEffect, useState, useMemo, useRef } from "react";
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
import Loader from "@/components/shared/Loader";
import {
  addCommasToNumber,
  calculateTotal,
  handleNormalize,
  normalizeFlatQuotationData,
  formatRFQNumber,
  getEntityLabel,
} from "@/utils/sharedFunctions";
import { toast } from "react-toastify";
import { getProjectAvailableBudget, getAllProjects as getAllProjectsService } from "@/services/project";
import { getUserMappings } from "@/services/hospitality";
import { Alert } from "react-bootstrap";
import { BsFileEarmarkText } from "react-icons/bs";
import NormalizeInfoModal from "@/components/modal/NormalizeInfoModal";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import NegotiationCompactBanner from "./negotiation/NegotiationCompactBanner";
import { getAllActiveNegotiationRounds, getRoundQuotes } from "@/services/negotiation";
import RFQListSidebar from "@/components/shared/RFQListSidebar";
import useQuoteCompareViewModel from "@/hooks/useQuoteCompareViewModel";
import { buildComparisonContextTables } from "@/utils/quoteCompareTableViewModel";
import QuoteCompareHeaderCard from "@/components/dashboard/buyer/quoteCompare/QuoteCompareHeaderCard";
import QuoteCompareKpiStrip from "@/components/dashboard/buyer/quoteCompare/QuoteCompareKpiStrip";
import ComparisonTabs from "@/components/dashboard/buyer/quoteCompare/ComparisonTabs";
import ProductComparisonTab from "@/components/dashboard/buyer/quoteCompare/ProductComparisonTab";
import CategoryComparisonTab from "@/components/dashboard/buyer/quoteCompare/CategoryComparisonTab";
import OverallCostTab from "@/components/dashboard/buyer/quoteCompare/OverallCostTab";
import revampStyles from "@/components/dashboard/buyer/quoteCompare/QuoteCompareRevamp.module.scss";

/**
 * @note We have left the View LPR button to be displayed even if the Previous quotes are not there which needs to be corrected later 
 * @Updated Ayush Singh 22 JUNE 2025
 * @updated by mukul 08-08-2025 - normilize total
 */


const QuoteCompare = () => {
  const router = useRouter();
  const { rfq_product_id, source, tab = "product" } = router.query;
  const [rfq, setRfq] = useState(router.query.rfq || null);
  const tabOptions = ["product", "category", "cost"];
  const safeTab = tabOptions.includes(String(tab)) ? String(tab) : "product";
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
  const [activeTab, setActiveTab] = useState(safeTab);
  const [isTenderFilter, setIsTenderFilter] = useState(null);
  // const [targetPrice , setTargetPrice] = useState(null);
  // const [targetPriceHistory ,  settargetPriceHistory] = useState([]);

  useEffect(() => {
    if (safeTab !== activeTab) {
      setActiveTab(safeTab);
    }
  }, [safeTab, activeTab]);

  const [showNormalizeModal, setShowNormalizeModal] = useState(false);
  const [productNegotiationData, setProductNegotiationData] = useState({}); // { productId: { activeRound, roundQuotes } }

  // Sync rfq from URL on initial load / browser back-forward
  useEffect(() => {
    const queryRfq = router.query.rfq || null;
    if (queryRfq && queryRfq !== rfq) {
      setRfq(queryRfq);
    }
  }, [router.query.rfq]);

  // Handle sidebar RFQ click — update state + URL silently (no route events)
  const handleRfqSelect = (id) => {
    const newId = String(id);
    if (newId === String(rfq)) return;
    setRfq(newId);
    const params = new URLSearchParams({ rfq: newId, tab: activeTab });
    const url = `/dashboard/buyer/quote-compare?${params.toString()}`;
    window.history.replaceState({ ...window.history.state, url, as: url }, '', url);
  };

  // Ref to track the latest rfq for stale response detection in async calls
  const latestRfqRef = useRef(rfq ? String(rfq) : null);
  latestRfqRef.current = rfq ? String(rfq) : null;

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
  const rfqMetadataReady = rfq && String(metadataLoadedForRfq) === String(rfq);

  // Stage 1: Fetch RFQ metadata first to get hotel context for permission check
  // This is a lightweight call that doesn't expose sensitive quote data
  useEffect(() => {
    let cancelled = false;
    setMetadataLoadedForRfq(null);

    const fetchRFQMetadata = async () => {
      if (!rfq || rfq === 'undefined' || rfq === 'null') {
        setcurrentRFQ(null);
        return;
      }

      try {
        // Get RFQ metadata for permission context
        const response = await getRfqs({ rfq_id: String(rfq), page: 1, limit: 1, tech_eval: false });
        // Guard against stale response when user switched RFQs quickly
        if (cancelled) return;
        const rfqData = Array.isArray(response) ? response[0] : response?.data?.[0];
        if (rfqData) {
          // IMPORTANT: Don't spread prev to avoid stale state when switching between tender/RFQ
          setcurrentRFQ({
            id: rfqData.id,
            hotel_id: rfqData.hotel_id,
            hotel_ids: rfqData.hotel_ids,
            is_tender: rfqData.is_tender,
            hospitality_company_id: rfqData.hospitality_company_id,
            department_id: rfqData.department_id,
            department_name: rfqData.department_name,
            rfq_no: rfqData.rfq_no,
            project_name: rfqData.project_name,
            company_name: rfqData.company_name,
            hotel_name: rfqData.hotel_name,
            contact_name: rfqData.contact_name,
            response_email: rfqData.response_email,
            contact_number: rfqData.contact_number,
            location: rfqData.location,
            reverse_auction: rfqData.reverse_auction,
            bid_end_date: rfqData.bid_end_date,
            comment: rfqData.comment,
            title: rfqData.title,
            rfq_type: rfqData.rfq_type,
            reverse_auction_date: rfqData.reverse_auction_date,
            status: rfqData.status,
          });
          setMetadataLoadedForRfq(rfq);
          setquotesLoading(true); // Pre-set so there's no gap between permissions check and quotes fetch
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching RFQ metadata:", error);
        }
      }
    };

    fetchRFQMetadata();
    return () => { cancelled = true; };
  }, [rfq]);

  // Stage 2: Once permissions are verified, check TE first, then fetch quotes with correct filter
  const dataInitializedForRfq = useRef(null);
  const initializingRef = useRef(false); // Prevent filter-change re-fetch during initialization

  // Trigger initialization for new RFQ
  useEffect(() => {
    if (!rfq || !rfqMetadataReady || permissionsLoading || (!canReadNegotiation && !canReadQuoteCompare)) return;
    if (String(dataInitializedForRfq.current) !== String(rfq)) {
      dataInitializedForRfq.current = String(rfq);
      initializeRfqData();
    }
  }, [rfq, rfqMetadataReady, permissionsLoading, canReadNegotiation, canReadQuoteCompare]);

  // Re-fetch quotes on filter change (TA, freight, normalize) — only for already-initialized RFQ
  const filterInitialized = useRef(false);
  useEffect(() => {
    // Skip on mount — initialization handles the first fetch
    if (!filterInitialized.current) { filterInitialized.current = true; return; }
    if (!rfq || !rfqMetadataReady || permissionsLoading || (!canReadNegotiation && !canReadQuoteCompare)) return;
    if (String(dataInitializedForRfq.current) !== String(rfq)) return; // Not initialized yet
    if (initializingRef.current) return; // Skip — initialization handles the first fetch
    getRespectiveQuotes();
  }, [TA_Filter, freightFilter, normalizeFilter]);

  // Check TE availability first, then fetch quotes with the correct TA filter in one pass
  // Negotiation data loads independently — does NOT block quotes
  const initializeRfqData = async () => {
    if (!rfq) return;
    const fetchRfq = String(rfq);
    initializingRef.current = true;
    setquotesLoading(true);
    setquotes([]);
    setTEavailable(false);

    // Fire negotiation data load independently (non-blocking)
    loadNegotiationData();

    try {
      // Step 1: Check if tech evaluation exists
      const clauseRes = await getAllClauses(rfq);
      if (latestRfqRef.current !== fetchRfq) return;

      let hasTechEval = false;
      if (clauseRes.data && clauseRes.data.length > 0) {
        hasTechEval = true;
        setTEavailable(true);
        setTA_Filter(true);
      }

      // Step 2: Fetch quotes with the correct TA filter (no double call)
      const quotesRes = await getQuotes(rfq, hasTechEval, freightFilter, rfq_product_id, source, 'quote_compare');
      if (latestRfqRef.current !== fetchRfq) return;

      setOriginalQuotes(quotesRes.data);
      const data = normalizeFilter ? normalizeFlatQuotationData(quotesRes.data) : quotesRes.data;
      setquotes(data);

      // Build vendorCodeMap
      const codeMap = {};
      const setCode = (id, val) => { if (id && val) { codeMap[id] = val; codeMap[String(id)] = val; } };
      data.forEach((product) => {
        (product.all_vendors || []).forEach((v) => {
          if (v.id && v.rfq_product_vendor_id) setCode(v.id, v.rfq_product_vendor_id);
        });
        (product.quotations || []).forEach((q) => {
          const vdRaw = q.vendor_details || (q.quote_details && q.quote_details.vendor_details);
          const vd = Array.isArray(vdRaw) ? vdRaw[0] : vdRaw;
          if (vd?.id && vd.rfq_product_vendor_id) setCode(vd.id, vd.rfq_product_vendor_id);
        });
      });
      setVendorCodeMap(codeMap);
    } catch (error) {
      if (latestRfqRef.current !== fetchRfq) return;
      console.error("Error initializing RFQ data:", error);
    } finally {
      if (latestRfqRef.current === fetchRfq) {
        setquotesLoading(false);
        initializingRef.current = false;
      }
    }
  };

  const loadNegotiationData = async () => {
    if (!rfq) return;
    const fetchRfq = String(rfq); // capture for stale detection

    try {
      // Load all active rounds for this RFQ
      const response = await getAllActiveNegotiationRounds(rfq);
      if (latestRfqRef.current !== fetchRfq) return; // stale
      let activeRounds = [];

      if (response) {
        if (response.status === 1 && response.data) {
          activeRounds = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
          activeRounds = response;
        }
      }

      // For each active round, load quotes and organize by product
      // Rounds are ordered by rfq_product_id, round_number DESC so the first
      // round we encounter per product is the most recent one — skip older rounds.
      const negotiationData = {};

      for (const round of activeRounds) {
        if (latestRfqRef.current !== fetchRfq) return; // stale
        if (round.rfq_product_id) {
          // Only keep the most recent round per product (first encountered due to DESC order)
          if (negotiationData[round.rfq_product_id]) continue;

          try {
            const quotesResponse = await getRoundQuotes(round.id);
            if (latestRfqRef.current !== fetchRfq) return; // stale
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

      if (latestRfqRef.current !== fetchRfq) return; // stale
      setProductNegotiationData(negotiationData);
    } catch (error) {
      if (latestRfqRef.current !== fetchRfq) return; // stale
      console.error('Error loading negotiation data:', error);
      setProductNegotiationData({});
    }
  };

  // Initial load: fetch sidebar RFQs, projects, hotel mappings (once)
  useEffect(() => {
    getAllRFQs();
    getAllProjects();
    fetchUserHotelMappings();
  }, []);

  // Re-fetch when pagination changes (not on mount — handled above)
  const pageInitialized = useRef(false);
  useEffect(() => {
    if (!pageInitialized.current) { pageInitialized.current = true; return; }
    getAllRFQs();
  }, [page]);


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

  const filtersInitialized = useRef(false);
  useEffect(() => {
    if (!filtersInitialized.current) { filtersInitialized.current = true; return; }
    const handler = setTimeout(() => {
        getAllRFQs(true);
    }, 500);
    return () => clearTimeout(handler);
  }, [rfqNo, selectedproject, isTenderFilter]);


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
    getAllProjectsService()
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
      const mappings = (response?.data || []).filter(m => m.hospitality_hotel_id != null);
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
    getRfqs({ tech_eval: false, page, limit, project_id: selectedproject ? selectedproject : -1, rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null, sort: "DESC", is_tender: isTenderFilter !== null ? (isTenderFilter === '1' || isTenderFilter === 1) : null, module_keys: "negotiation,negotiation_quote" })
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
    const fetchRfq = String(rfq); // capture current rfq for stale detection
    setquotesLoading(true);
    setquotes([]);
    setTEavailable(false);

    let loadedData = [];
    getQuotes(rfq, TA_Filter, freightFilter, rfq_product_id, source , 'quote_compare')
      .then((res) => {
        // Ignore stale response if user has already switched to a different RFQ
        if (latestRfqRef.current !== fetchRfq) return;

        // Store original data before normalization for highlighting logic
        setOriginalQuotes(res.data);

        const data = normalizeFilter ? normalizeFlatQuotationData(res.data) : res.data;
        loadedData = data;

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
        // Ignore errors from stale requests
        if (latestRfqRef.current !== fetchRfq) return;
      })
      .finally(() => {
        // Ignore completion of stale requests
        if (latestRfqRef.current !== fetchRfq) return;
        setquotesLoading(false);
      })
  };

  const getRFQClauses = async (quotesData = []) => {
    const fetchRfq = rfq; // capture for stale detection
    try {
      const res = await getAllClauses(rfq);
      if (latestRfqRef.current !== fetchRfq) return; // stale
      if(res.data && res.data.length > 0) {
        setTEavailable(true);
        // Always filter to show only technically accepted vendors when tech eval exists
        setTA_Filter(true);
      }
    } catch (error) {
      if (latestRfqRef.current !== fetchRfq) return; // stale
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
    `POC For ${getEntityLabel(currentRFQ?.is_tender)}`,
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
    const entityLabel = getEntityLabel(currentRFQ?.is_tender);
    const filename = `${entityLabel}_${currentRFQ?.rfq_no}_quotes.xlsx`.replace(/\s+/g, "_");
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
        const data = res?.data || res;
        const defaultMsg = routeType === 'ARC'
          ? "Vendor finalized! ARC approval will be triggered when all products are finalized."
          : data?.approvalPending
            ? "Vendor finalized! Approval is required before Purchase Order can be created."
            : "Vendor finalized! Purchase Order created.";
        toast.success(res.message ?? defaultMsg);
        getRespectiveQuotes();
      })
      .catch((err) => {
        setfinalizeLoading(false);
        toast.error(err?.message?.response?.data?.message ?? err.message ?? "Something went wrong in finalizing a vendor!")
      });
  };

  // Reset all stale state when switching between RFQs/tenders
  useEffect(() => {
    if (rfq) {
      setTA_Filter(false);
      setFreightFilter(false);
      setNormalizeFilter(false);
      setProductNegotiationData({}); // Clear negotiation data to prevent stale state
      setAvailableBudget(null); // Clear budget to prevent showing wrong budget
      setquotes([]); // Clear stale quotes immediately
      setOriginalQuotes([]); // Clear original quotes
      setVendorCodeMap({}); // Clear vendor code map
      setTEavailable(false); // Clear tech eval state
    }
  }, [rfq]);

  const { metrics, categoryGroups, productSummaries } = useQuoteCompareViewModel({
    quotes,
    normalizeFilter,
  });

  const productSummaryMap = useMemo(() => {
    const mapped = {};
    (productSummaries || []).forEach((item) => {
      mapped[item.productId] = item;
    });
    return mapped;
  }, [productSummaries]);

  const comparisonTables = useMemo(
    () =>
      buildComparisonContextTables({
        quotes,
        originalQuotes,
        normalizeFilter,
        freightFilter,
        productNegotiationData,
      }),
    [quotes, originalQuotes, normalizeFilter, freightFilter, productNegotiationData]
  );

  const comparisonContext = useMemo(
    () => ({
      rfq,
      currentRFQ,
      filters: {
        TA_Filter,
        freightFilter,
        normalizeFilter,
      },
      permissions: {
        canReadQuoteCompare,
        canWriteQuoteCompare,
        canReadNegotiation,
        canWriteNegotiation,
      },
      maps: {
        vendorCodeMap,
        productNegotiationData,
      },
      metrics,
      tables: comparisonTables,
    }),
    [
      rfq,
      currentRFQ,
      TA_Filter,
      freightFilter,
      normalizeFilter,
      canReadQuoteCompare,
      canWriteQuoteCompare,
      canReadNegotiation,
      canWriteNegotiation,
      vendorCodeMap,
      productNegotiationData,
      metrics,
      comparisonTables,
    ]
  );

  const handleTabChange = (nextTab) => {
    if (!tabOptions.includes(nextTab)) return;
    setActiveTab(nextTab);
    router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          tab: nextTab,
        },
      },
      undefined,
      { shallow: true }
    );
  };

  const hasRfqSelected = !!rfq;
  const showNegotiationZone = hasRfqSelected && quotes && quotes.length > 0 && canReadNegotiation;
  const showComparisonZone = hasRfqSelected && canReadQuoteCompare;

  // Note: currentRFQ is now set exclusively by Stage 1 (fetchRFQMetadata).
  // The previous [rfq, myRFQs] effect was removed because it competed with Stage 1
  // and could overwrite fresh API data with stale sidebar list data whenever myRFQs
  // changed (debounce refetch, pagination, filter changes).

// const handleTargetPriceSubmit = async ({ productId, vendorIds, targetPrice }) => {
//   console.log("Submitted Data:", { productId, vendorIds, targetPrice });

// };

  // Access denied check - show only if user has NO permissions for EITHER section
  const isAccessDenied = currentRFQ && !permissionsLoading && !canReadNegotiation && !canReadQuoteCompare;

  // Inline loading — single loader for the entire right section
  const isContentLoading = !!rfq && (permissionsLoading || !rfqMetadataReady || quotesLoading);

  return (
    <>
      {finalizeLoading && <Loader />}
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="heading">Quote Comparison</h3>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className={`row ${revampStyles.layoutRow}`}>
              <RFQListSidebar
                title="Quote Comparison"
                rfqList={myRFQs}
                loading={loading}
                selectedRfqId={rfq}
                onItemClick={handleRfqSelect}
                linkPrefix="/dashboard/buyer/quote-compare"
                linkQueryKey="rfq"
                extraQueryParams={{ tab: activeTab }}
                tabs={[
                  {
                    key: 'negotiation_pending',
                    label: 'Negotiation',
                    filter: (item) => !item.is_finalized && !item.has_finalization && !item.approval_required && parseInt(item.active_quote_count || 0) > 0,
                  },
                  {
                    key: 'finalization_pending',
                    label: 'Finalization',
                    filter: (item) => item.approval_required === true || item.is_finalized || item.has_finalization,
                  },
                  {
                    key: 'all',
                    label: 'All',
                    filter: null,
                  },
                ]}
                defaultTab="all"
                rfqNo={rfqNo}
                onRfqNoChange={(val) => setRfqNo(val)}
                searchPlaceholder="Search by number..."
                userHotelMappings={userHotelMappings}
                selectedHotelIds={selectedHotelIds}
                onHotelSelectionChange={handleHotelSelectionChange}
                projects={projects || []}
                onProjectChange={(val) => setSelectedproject(val)}
                showTypeFilter={true}
                isTenderFilter={isTenderFilter}
                onTenderFilterChange={(val) => {
                  setIsTenderFilter(val);
                  setpage(1);
                }}
                getItemTags={(item, isSelected) => {
                  if (isSelected) return [];
                  const tags = [];
                  if (item.approval_required) {
                    tags.push({ label: 'Approval Pending', variant: 'warning' });
                  }
                  if (item.is_finalized) {
                    tags.push({ label: 'Finalized', variant: 'success' });
                  } else if (item.has_finalization) {
                    tags.push({ label: 'Partially Finalized', variant: 'warning' });
                  } else {
                    tags.push({ label: 'In Negotiation', variant: 'info' });
                  }
                  return tags;
                }}
                showLoadMore={true}
                hasMore={hasMoreQuotes}
                onLoadMore={loadMoreRFQs}
                pageId="quote_compare"
              />

            <div className={revampStyles.contentColumn}>
              <div className="quote-sec-table quote-sec-tab">

                {/* Empty State - when no RFQ selected */}
                {!rfq && !isContentLoading && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '50vh', textAlign: 'center',
                    padding: '40px 20px', background: '#fff', borderRadius: 12
                  }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f0f4fa 0%, #e3ecf9 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20, color: '#2E5BA8'
                    }}>
                      <BsFileEarmarkText size={36} />
                    </div>
                    <h4 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                      Select an RFQ to Compare Quotes
                    </h4>
                    <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 400, lineHeight: 1.6, margin: 0 }}>
                      Choose an RFQ or Tender from the sidebar to view and compare vendor quotes.
                    </p>
                  </div>
                )}

                {/* Inline loader — shows inside content area while loading/verifying */}
                {isContentLoading && (
                  <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px', background: '#fff', borderRadius: 12 }}>
                    <div className="text-center">
                      <div className="d-flex align-items-center justify-content-center mb-3" style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(46, 91, 168, 0.08)', margin: '0 auto'
                      }}>
                        <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2px' }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a2730', marginBottom: 4 }}>
                        Loading Quote Comparison
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#6c757d', margin: 0 }}>
                        {permissionsLoading || !rfqMetadataReady ? 'Verifying access permissions...' : 'Fetching quotes and vendor data...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Access Denied */}
                {!isContentLoading && isAccessDenied ? (
                  <AccessDeniedPage showBackButton={false} />
                ) : !isContentLoading ? (
                <div className={revampStyles.workspaceStack}>
                {!quotesLoading && currentRFQ && (
                  <section className={revampStyles.surfaceBlock}>
                    <QuoteCompareHeaderCard
                      currentRFQ={currentRFQ}
                      actions={
                        rfq && quotes && quotes.length > 0 ? (
                          <>
                            <button
                              type="button"
                              id="download_quote_actions-quote_compare_page"
                              onClick={handleDownloadQuote}
                              className={revampStyles.actionBtn}
                            >
                              {downloadLoading ? "Generating Excel..." : "Download Excel"}
                            </button>
                            {quotes[0]?.rfq[0]?.status == 1 ? (
                              <button
                                type="button"
                                id="close_rfq_actions-quote_compare_page"
                                onClick={handleRFqClose}
                                className={revampStyles.actionBtn}
                              >
                                {closeRFqLoading
                                  ? "Processing..."
                                  : `Mark ${getEntityLabel(currentRFQ?.is_tender)} Closed`}
                              </button>
                            ) : (
                              <button type="button" disabled className={revampStyles.actionBtn}>
                                {getEntityLabel(currentRFQ?.is_tender)} closed
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleNormalizeClick}
                              id="normalize_quotes_button-top_actions-compare_quotes_page"
                              className={revampStyles.actionBtn}
                            >
                              {normalizeFilter ? "Remove Normalization" : "Normalize Quotes"}
                            </button>
                          </>
                        ) : null
                      }
                    />
                  </section>
                )}

                {showNegotiationZone && (
                  <section className={revampStyles.zoneBlock}>
                    <div className={revampStyles.zoneHeader}>
                      <p className={revampStyles.zoneTitle}>Negotiation Workspace</p>
                      <p className={revampStyles.zoneSub}>Round creation, approvals, and negotiation history</p>
                    </div>
                    {currentRFQ && canReadNegotiation && !canWriteNegotiation && !permissionsLoading && (
                      <ReadOnlyBanner
                        title="Negotiation View Only"
                        message="You don't have edit permissions for negotiation rounds."
                      />
                    )}
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
                  </section>
                )}

                {/* Show message if no quote-compare permission but has negotiation */}
                {hasRfqSelected && !canReadQuoteCompare && canReadNegotiation && !permissionsLoading && (
                  <div className={`alert alert-info ${revampStyles.inlineAlert}`} role="alert">
                    You don't have permission to view quote comparisons.
                  </div>
                )}
                {/* Only show quote-compare section if user has quote-compare read permission */}
                {showComparisonZone && (
                  <section className={revampStyles.zoneBlock}>
                    <div className={revampStyles.zoneHeader}>
                      <p className={revampStyles.zoneTitle}>Comparison Workspace</p>
                      <p className={revampStyles.zoneSub}>Compare vendor responses and finalize decisions</p>
                    </div>
                    {/* Quote-Compare read-only banner - only show if user CAN read quote-compare but CANNOT write */}
                    {currentRFQ && !canWriteQuoteCompare && !permissionsLoading && (
                      <ReadOnlyBanner
                        title="Quote Compare View Only"
                        message="You don't have edit permissions for quote comparison and finalization."
                        className="mt-3"
                      />
                    )}
                    <div className={revampStyles.compareControls}>
                      <QuoteCompareKpiStrip metrics={metrics} />
                      <ComparisonTabs activeTab={activeTab} onChange={handleTabChange} />
                      {!normalizeFilter && (
                        <div className={revampStyles.filterRail}>
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
                        </div>
                      )}
                    </div>

                    <div className={revampStyles.compareViewport}>

                      {rfq && (
                        <div className="quote-sec-main">
                          {activeTab === "product" && (
                            <ProductComparisonTab
                              context={comparisonContext}
                              quotesLoading={quotesLoading}
                              quotes={quotes}
                              rfq={rfq}
                              openModals={openModals}
                              openModalForVariant={openModalForVariant}
                              closeModalForVariant={closeModalForVariant}
                              handleFinalize={handleFinalize}
                              originalQuotes={originalQuotes}
                              availableBudget={availableBudget}
                              normalizeFilter={normalizeFilter}
                              freightFilter={freightFilter}
                              productNegotiationData={productNegotiationData}
                              loadNegotiationData={loadNegotiationData}
                              canWriteQuoteCompare={canWriteQuoteCompare}
                              quoteComparePermissionsLoading={quoteComparePermissionsLoading}
                              currentRFQ={currentRFQ}
                              vendorCodeMap={vendorCodeMap}
                              productSummaryMap={productSummaryMap}
                            />
                          )}
                          {activeTab === "category" && (
                            <CategoryComparisonTab
                              context={comparisonContext}
                              rfq={rfq}
                              rfq_id={rfq}
                              rfq_product_id={rfq_product_id}
                              source={source}
                              TA_Filter={TA_Filter}
                              normalizeFilter={normalizeFilter}
                              freightFilter={freightFilter}
                              currentRFQ={currentRFQ}
                              productNegotiationData={productNegotiationData}
                              categoryGroups={categoryGroups}
                            />
                          )}
                          {activeTab === "cost" && (
                            <OverallCostTab
                              context={comparisonContext}
                              rfq={rfq}
                              rfq_id={rfq}
                              rfq_product_id={rfq_product_id}
                              source={source}
                              TA_Filter={TA_Filter}
                              normalizeFilter={normalizeFilter}
                              freightFilter={freightFilter}
                              currentRFQ={currentRFQ}
                              metrics={metrics}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                )}
                </div>
                ) : null}
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
        title={`Close ${getEntityLabel(currentRFQ?.is_tender)}`}
        description={`Are you sure you want to close ${getEntityLabel(currentRFQ?.is_tender)} #${quotes[0]?.rfq[0]?.rfq_no || ''}?\nOnce closed, vendors will no longer be able to submit quotes.`}
        confirmButtonColor="warning"
        confirmButtonText={`Close ${getEntityLabel(currentRFQ?.is_tender)}`}
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default QuoteCompare;
