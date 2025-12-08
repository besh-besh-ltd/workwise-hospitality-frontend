import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import FullLoader from "@/components/shared/FullLoader";
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
import { addCommasToNumber, calculateTotal, formatPrice, handleNormalize, normalizeFlatQuotationData } from "@/utils/sharedFunctions";
import PlaceholderLoading from "react-placeholder-loading";
import { toast } from "react-toastify";
import { getProjectAvailableBudget, getProjectList } from '@/services/project';
import Select from 'react-select';
import LPRModal from "@/components/shared/LPRModal";
import { Button } from "react-bootstrap";
import OverallCostComparison from './OverallCostComparison';
import ReadMore from "@/components/shared/ReadMore";
import InputModal from "@/components/shared/InputModal";
import NormalizeInfoModal from "@/components/modal/NormalizeInfoModal";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

/**
 * @note We have left the View LPR button to be displayed even if the Previous quotes are not there which needs to be corrected later 
 * @Updated Ayush Singh 22 JUNE 2025
 * @updated by mukul 08-08-2025 - normilize total
 */


const QuoteCompare = () => {
  const router = useRouter();
  const { rfq, rfq_product_id, source, tab = 'product' } = router.query;
  console.log("TAB:", tab);
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
  const [l1total, setl1total] = useState(0);
  const [hasMoreQuotes, sethasMoreQuotes] = useState(true);
  const [TA_Filter, setTA_Filter] = useState(false);
  const [TEavailable, setTEavailable] = useState(false);
  const [freightFilter, setFreightFilter] = useState(false);
  const [normalizeFilter, setNormalizeFilter] = useState(false);
  const [rfqNo, setRfqNo] =useState(null);
  const [projects, setProjects] = useState(null);
  const [selectedproject, setSelectedproject] = useState(null);
  const [openModals, setOpenModals] = useState({});
  const [availableBudget, setAvailableBudget] = useState(null);
  // Add new state for active tab
  const [activeTab, setActiveTab] = useState(tab);
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
 


  useEffect(() => {
    if (rfq) {
      getRespectiveQuotes();
    }
  }, [rfq, TA_Filter, freightFilter, normalizeFilter]);

  useEffect(() => {
    getAllRFQs();
  }, [page]);
  
  useEffect(() => {
    getAllProjects();
    // getPricehistory();
  }, [rfq]);

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
  }, [rfqNo,selectedproject]);


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
            res.data.map((item) => {
                d.push({ label: item.name, value: item.id });
            });
            setProjects(d);
        })
        .catch((error) => {
            console.error(error)
        })
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
    getRfqs({ tech_eval: false, page, limit, project_id: selectedproject ? selectedproject : -1, rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null, sort: "DESC" })
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
    heading_array[0].push(getVendorCode(item));
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

  const titleText = `RFQ #${currentRFQ?.rfq_no ?? "-"}`;
  const infoRow1 = padToCols([
    "Project",
    currentRFQ?.project_name ?? "-",
    "Bid End Date",
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

  const handleFinalize = (item, proditem, existingPOId) => {
    setfinalizeLoading(true);
    const specs = proditem.product_details[0].rfq_details;

    const poRequiredPayload = {
      project_id: proditem.rfq[0].project_id,
      total_value: item.total_price,
      existing_po_id: existingPOId,
      product_info: {
        rfq_product_id: proditem.id,
        quantity: specs.find(spec => spec.title == 'Quantity')?.value ?? -1,
        unit_price: item.unit_price,
        finalized_vendor_id: item.quote_details.created_by
      },
    }

    const payload = {
      rfq_id: proditem.rfq_id,
      rfq_no: proditem.rfq[0].rfq_no,
      product_variant_id: proditem.product_variant_id,
      vendor_id: item.quote_details.created_by,
      quote_id: item.quote_id,
      quote_item_id: item.quote_item_id,
      variant: proditem.variant,
      ...poRequiredPayload
    };

    finalizeQuotation(payload)
      .then((res) => {
        setfinalizeLoading(false);
        toast.success(res.message ?? "You've finalized vendor for this product!")
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
  }, [page]);
  
// useEffect(()=>{
//   if(quotes)
//     console.log("logging here best possible price",quotes[0]?.latest_target_price)
// },[])

// const handleTargetPriceSubmit = async ({ productId, vendorIds, targetPrice }) => {
//   console.log("Submitted Data:", { productId, vendorIds, targetPrice });
  
// };
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
                  {/*Negotiation Module Button*/}
                  <span
                    onClick={() => {
                      setOpenInputModal(true); // Make sure this matches the state variable name
                    }}
                    id="negotiation_button-top_actions-compare_quotes_page"
                  >
                    Negotiation
                  </span>
                  {openInputModal && (
                    <InputModal
                      show={openInputModal}
                      onHide={() => setOpenInputModal(false)}
                      onSubmit={handleSubmitTargetPrice}
                      products={transformData(quotes)} // directly passing API response
                      modalTitle="Set Target Price for Vendor"
                    />
                  )}

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
                          : "Mark RFQ as Closed"}
                      </span>
                    )}
                    {quotes[0]?.rfq[0]?.status == 2 && (
                      <span className="disabled-button">
                        RFQ has been closed
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
                  <label>Search RFQ No.</label>
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
                {!loading && myRFQs && myRFQs.length === 0 ? (
                  <p style={{ textAlign: "center" }}>No RFQs yet!</p>
                ) : !loading && myRFQs && myRFQs.length > 0 ? (
                  <ul
                    className="overflow-y-auto mt-1"
                    style={{ maxHeight: "70vh" }}
                  >
                    {myRFQs.map((item) => {
                      return (
                        <li
                          key={item.id}
                          className={`${
                            item.id == rfq ? "active rounded" : ""
                          }`}
                        >
                          <Link
                            href={`/dashboard/buyer/quote-compare/?rfq=${item?.id}`}
                            className={`${
                              item.id == rfq ? "text-white" : "text-dark"
                            }`}
                            id={`rfq_item_${item.rfq_no}-quotes_received-compare_quotes_page`}
                          >
                            RFQ #{item?.rfq_no}
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
                    <h3 className="fs-5 mb-1">
                      <span className="fw-semibold">RFQ No : </span>
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
                            <b>RFQ Type</b> : {currentRFQ.rfq_type}
                          </p>
                        )}
                        <p className="sub-heading mb-0">
                          <b>Bid End Date</b> : {currentRFQ.bid_end_date}
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
                {"rfq" in router?.query && (
                  <div
                    className="tabs-container"
                    style={{
                      borderBottom: "1px solid #e0e0e0",
                      marginBottom: 16,
                    }}
                  >
                    <Link
                      href="#"
                      className={`tab ${
                        activeTab === "product" ? "active" : ""
                      }`}
                      style={{
                        background:
                          activeTab === "product" ? "#2d5ba7" : "#fff",
                        color: activeTab === "product" ? "#fff" : "#2d5ba7",
                        border: "1px solid #2d5ba7",
                        borderBottom:
                          activeTab === "product"
                            ? "none"
                            : "1px solid #2d5ba7",
                        borderRadius: "8px 8px 0 0",
                        marginRight: 4,
                        padding: "8px 20px",
                        fontWeight: 500,
                        position: "relative",
                        top: activeTab === "product" ? 2 : 0,
                        zIndex: activeTab === "product" ? 2 : 1,
                        transition: "background 0.2s, color 0.2s",
                      }}
                    onClick={() => setActiveTab('product')}
                    id="product_tab-quote_tabs-quote_compare_page"
                    >
                      Product Wise Comparison
                    </Link>
                    <Link
                      href="#"
                      className={`tab ${
                        activeTab === "category" ? "active" : ""
                      }`}
                      style={{
                        background:
                          activeTab === "category" ? "#2d5ba7" : "#fff",
                        color: activeTab === "category" ? "#fff" : "#2d5ba7",
                        border: "1px solid #2d5ba7",
                        borderBottom:
                          activeTab === "category"
                            ? "none"
                            : "1px solid #2d5ba7",
                        borderRadius: "8px 8px 0 0",
                        marginRight: 4,
                        padding: "8px 20px",
                        fontWeight: 500,
                        position: "relative",
                        top: activeTab === "category" ? 2 : 0,
                        zIndex: activeTab === "category" ? 2 : 1,
                        transition: "background 0.2s, color 0.2s",
                      }}
                    onClick={() => setActiveTab('category')}
                    id="category_tab-quote_tabs-quote_compare_page"
                    >
                      Category wise Comparison
                    </Link>
                    <Link
                      href="#"
                      className={`tab ${activeTab === "cost" ? "active" : ""}`}
                      style={{
                        background: activeTab === "cost" ? "#2d5ba7" : "#fff",
                        color: activeTab === "cost" ? "#fff" : "#2d5ba7",
                        border: "1px solid #2d5ba7",
                        borderBottom:
                          activeTab === "cost" ? "none" : "1px solid #2d5ba7",
                        borderRadius: "8px 8px 0 0",
                        marginRight: 4,
                        padding: "8px 20px",
                        fontWeight: 500,
                        position: "relative",
                        top: activeTab === "cost" ? 2 : 0,
                        zIndex: activeTab === "cost" ? 2 : 1,
                        transition: "background 0.2s, color 0.2s",
                      }}
                    onClick={() => setActiveTab('cost')}
                    id="overall_cost_tab-quote_tabs-quote_compare_page"
                    >
                      Overall Cost Comparison
                    </Link>
                    <div className="d-flex flex-column gap-2 ms-auto">
                      {TEavailable && (
                        <div className="form-check form-switch page-link fs-6">
                          <input
                            className="form-check-input border-dark-subtle"
                            type="checkbox"
                            role="switch"
                            checked={TA_Filter}
                            id="ta_filter_toggle-quote_tabs-quote_compare_page"
                            onChange={handleTAFilterChange}
                          />
                          <label className="form-check-label" for="ta_filter_toggle-quote_tabs-quote_compare_page">
                            View Technically Accepted Vendors
                          </label>
                        </div>
                      )}

                      {!normalizeFilter && (
                        <div className="form-check form-switch page-link fs-6">
                          <input
                            className="form-check-input border-dark-subtle"
                            type="checkbox"
                            role="switch"
                            checked={freightFilter}
                            id="freight_filter_toggle-quote_tabs-quote_compare_page"
                            onChange={handleFreightFilterChange}
                          />
                          <label
                            className="form-check-label"
                            for="freight_filter_toggle-quote_tabs-quote_compare_page"
                          >
                            View quotes without freight
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!rfq && (
                  <div className="quote-sec-main">
                    <div className="quote-sec-table-sub">
                      <h4 className="text-center">
                        Please select a RFQ to view its quotes!
                      </h4>
                    </div>
                  </div>
                )}

                {rfq && (
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
                                      <p className="sub-heading mb-0">
                                        <b>Product</b> :{" "}
                                        {item?.product_details[0]?.product_name}
                                      </p>
                                      <div className="sub-heading mb-0 d-flex gap-1">
                                        <b>Product Specification</b> :{" "}
                                        {spec ? (
                                          <ReadMore
                                            content={spec}
                                            maxLength={30}
                                            maxLines={2}
                                          />
                                        ) : (
                                          "N/A"
                                        )}
                                      </div>
                                      <p className="sub-heading mb-0">
                                        <b>Selling Price</b> :{" "}
                                        {selling_price
                                          ? "₹" +
                                            addCommasToNumber(selling_price)
                                          : "N/A"}
                                      </p>
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
                                        availableBudget={availableBudget}
                                        targetPrice={item.latest_target_price}
                                        // targetHistory={targetPriceHistory}
                                        normalizeFilter={normalizeFilter}
                                        freightFilter={freightFilter}
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
      />

      {/* Close RFQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCloseConfirmModal}
        onClose={handleCloseCancel}
        onConfirm={handleCloseConfirm}
        title="Close RFQ"
        description={`Are you sure you want to close RFQ #${quotes[0]?.rfq[0]?.rfq_no || 'this RFQ'}?\nOnce closed, vendors will no longer be able to submit quotes.`}
        confirmButtonColor="warning"
        confirmButtonText="Close RFQ"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default QuoteCompare;



