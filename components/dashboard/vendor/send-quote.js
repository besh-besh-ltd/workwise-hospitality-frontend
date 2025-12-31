import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { extractQuotation, fetchQuoteHistory, getRFQById, sendQuotation, updateQuotation, createTenderPaymentOrder, verifyTenderPayment } from "@/services/rfq";
import PlaceholderLoading from "react-placeholder-loading";
import Loader from "@/components/shared/Loader";
import { toast } from "react-toastify";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";
import ReadMore from "@/components/shared/ReadMore";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { extractfileName, extractParsedNumber, handleFileUpload, moneyOrPercent, toNumber } from "@/utils/sharedFunctions";
import { faDeleteLeft, faDownload, faMinus, faPlus, faRemove } from "@fortawesome/free-solid-svg-icons";
import { renderFileLink } from "@/utils/elementFunctions";
import SmartButton from "@/components/shared/SmartButton";
import { calculateTotal as sharedCalculateTotal } from "@/utils/sharedFunctions";
import { QuotesOverrideModal } from "@/components/modal/ExtractedQuotesModal";
import { IoMdInformationCircleOutline } from "react-icons/io";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import QuoteHistoryModal from "@/components/modal/QuoteHistoryModal";
import VendorQuoteHistoryModal from "@/components/modal/VendorQuoteHistoryModal";
import VendorNegotiationRoundBanner from "./NegotiationRoundBanner";

const PercentageAbsoluteToggle = ({ currentMode, onToggle, size = "sm" }) => {
  return (
    <div className="mt-2 d-flex " role="group" style={{marginBottom : "16px"}} >
      <SmartButton
        onClick={() => onToggle('percentage')}
        theme={currentMode === 'percentage' ? 'primary' : 'light'}
        style={{ 
          paddingLeft: "0.6rem", 
          paddingRight: "0.6rem",
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          minHeight : "40px",
          marginBottom: "10px"
        }}
        label="%"
        id="percentage_toggle-percentage_absolute_toggle-send_quote_page"
      />
      <SmartButton
        onClick={() => onToggle('absolute')}
        theme={currentMode === 'absolute' ? 'primary' : 'light'}
        style={{ 
          paddingLeft: "0.6rem", 
          paddingRight: "0.6rem",
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          minHeight : "40px",
          marginBottom: "10px"
        }}
        label="₹"
        id="absolute_toggle-percentage_absolute_toggle-send_quote_page"
      />
    </div>
  );
};


const SendQuotePageComp = () => {
  const router = useRouter();
  const { id, token, type: pageType } = router.query;
  const showTechEvalRestrictionsParam = router.query.showTechEvalRestrictions === 'true';
  const [regretModal, setregretModal] = useState(false);
  const [rfqDetails, setrfqDetails] = useState(null);
  const [loading, setloading] = useState(false);
  const [quoteProducts, setquoteProducts] = useState([]);
  const [submitLoading, setsubmitLoading] = useState(false);
  const [showSubmitQuoteConfirmModal, setShowSubmitQuoteConfirmModal] = useState(false);


  const [chargesMode, setChargesMode] = useState({
    freight: { global: "percentage" },
    package: { global: "percentage" },
    tax: { global: "percentage" }
  })
  
  const [globalFreight, setglobalFreight] = useState(0);
  const [globalPackaging, setglobalPackaging] = useState(0);
  const [globalTax, setglobalTax] = useState(0);
  const [globalPaymentTerms, setglobalPaymentTerms] = useState("");
  const [globalComment, setglobalComment] = useState("");
  const [vendorGSTIN, setVendorGSTIN] = useState(null);
  const [previousGlobalFiles, setPreviousGlobalFiles] = useState([]);
  const [globalDocumentFiles, setGlobalDocumentFiles] = useState([]);
  const [alreadyQuoted, setalreadyQuoted] = useState(null);
  const [currentLowest, setCurrentLowest] = useState(null);
  const [techEvalStatuses, setTechEvalStatuses] = useState({});
  const [showTechEvalRestrictions, setShowTechEvalRestrictions] = useState(false);
  const [extractedQuotes, setExtractedQuotes] = useState({
    show: false,
    data: null,
  })
  const [extractingQuotes, setExtractingQuotes] = useState(false);
const [quoteHistory, setQuoteHistory] = useState(null);
const [showQuoteHistoryModal, setShowQuoteHistoryModal] = useState(false); //to fetch the quote hitory for a product for vendor page
const [tenderPaymentPaid, setTenderPaymentPaid] = useState(false);
const [tenderFees, setTenderFees] = useState(0);
const [tenderPaymentLoading, setTenderPaymentLoading] = useState(false);
// Changes by Agnij [Preserve form state when Razorpay modal opens]
const formStateRef = useRef(null);
const shouldAutoSendQuoteRef = useRef(false);

  // structured payment terms rows
const [paymentTermsRows, setPaymentTermsRows] = useState([
  // {id:null, value: "", type: "advance", days: "", comment: ""},
]);

// Save the initial payment terms list from backend
const originalPaymentTermsListRef = useRef(null);

  /**
   * Main transformer
   * @param {Array<object>} items
   * @returns {Array<object>}
   */
  function normalizeExtractedItems(items) {
    const seen = new Set();
    const unique = (items || []).filter((it) => {
      if (it.id === 0) return false;
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
    
    return unique.map((it) => {
      const quantityNum = it.quantity.value;
      const unit = (it.quantity && it.quantity.unit) || "";

      const basePriceNum = it.base_price.value;

      const freight = moneyOrPercent(it.freight);
      const packaging = moneyOrPercent(it.packaging);

      // Taxes are typically percentage
      const tax = moneyOrPercent(it.taxes, true);
      if (typeof tax.value === "number" && it.taxes && it.taxes.unit === "%") {
        tax.mode = "%";
      }

      const deliveryPeriod =
        typeof it.delivery_period === "number"
          ? it.delivery_period
          : toNumber(it.delivery_period);

      return {
        id: it.id,
        rfq_product_name: rfqDetails.products?.find(product => product.id == it.id)?.name || it.item_name,
        raw_product_name: it.item_name,
        quantity: quantityNum,
        unit,
        base_price: basePriceNum,
        freight,
        packaging,
        tax,
        delivery_period: deliveryPeriod ?? null,
      };
    });
  }

const openQuoteHistoryModal = async (product_variant_id, index) => {
  try {
    const response = await fetchQuoteHistory(product_variant_id);
    setQuoteHistory(response); // load data
    setShowQuoteHistoryModal(true); // open modal
  } catch (error) {
    console.error("Error fetching quote history:", error);
  }
};


  // Changes by Agnij 2024-07-30 [Add function to check if fields are filled]
  const isAnyFieldFilled = () => {
    // Check global fields
    if (globalFreight > 0 || 
        globalPackaging > 0 || 
        globalTax > 0 || 
        globalPaymentTerms.trim() !== "" || 
        globalComment.trim() !== "" || 
        globalDocumentFiles.length > 0) {
      return true;
    }
    
    // Check product fields
    for (const product of quoteProducts) {
      if (product.unit_price > 0 || 
          product.freight_price > 0 || 
          product.package_price > 0 || 
          product.tax > 0 || 
          product.comment.trim() !== "" || 
          (product.delivery_period.toString().trim() !== "" && !isNaN(parseInt(product.delivery_period)) && parseInt(product.delivery_period) > 0) || 
          (product.document_files && product.document_files.length > 0)) {
        return true;
      }
    }
    
    return false;
  };

  useEffect(() => {
    if (id) {
      getRFQdetails();
    }
    

    
    // Update the tech evaluation restriction flag
    const restrictionsEnabled = router.query.showTechEvalRestrictions === 'true';
    setShowTechEvalRestrictions(restrictionsEnabled);
  }, [router, router.query]);

  // Changes by Agnij <2024-07-30> [Add debug logging for reverse auction status]
  useEffect(() => {
    if (rfqDetails) {
      const now = new Date();
      let raStartDate = null;
      let raStartDateString = "Not set";

      if (rfqDetails.ra_start_date) {
        raStartDateString = rfqDetails.ra_start_date;
        if (rfqDetails.ra_start_date.includes('T')) {
          raStartDate = new Date(rfqDetails.ra_start_date);
        } else if (rfqDetails.ra_start_date.includes(' ')) {
          const [datePart, timePart] = rfqDetails.ra_start_date.split(' ');
          raStartDate = new Date(`${datePart}T${timePart}`);
        } else {
          raStartDate = new Date(rfqDetails.ra_start_date);
        }
      }

      const isAuctionActive = currentLowest; // Reflects the outcome of updatecurrentLowest

    }
  }, [rfqDetails, currentLowest]);

  const getProductSpecValueByTitle = (productSpecs, title) => {
    const spec = productSpecs.find(spec => spec.title === title);
    return spec ? spec.value : "";
  }

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

  const updatecurrentLowest = (products, rfqData) => {
    if (products && Array.isArray(products)) {
      // Extract technical evaluation status for each product
      const techStatuses = {};
      products.forEach(product => {
        // Changes by Agnij 2024-07-29 [Fix tech eval status tracking]
        if (product.tech_evaluation_status) {
          techStatuses[product.id] = {
            has_tech_eval: product.tech_evaluation_status.has_tech_eval === true,
            is_accepted: product.tech_evaluation_status.is_accepted === true
          };
        }
      });
      setTechEvalStatuses(techStatuses);

      // Changes by Agnij 2024-07-29 [Fix reverse auction display]
      // Only show current lowest if reverse auction is active (after start date)
      const hasLowestQuotation = products.some(product => product.lowest_quotation !== null);

      // Check if reverse auction is active
      const isReverseAuctionActive = () => {
        // If rfqData isn't available, return false
        if (!rfqData) return false;

        // Check if reverse auction is enabled
        if (rfqData.reverse_auction !== 1) return false;

        // If no start date is defined, return false
        if (!rfqData.ra_start_date) return false;

        // Get current time and auction start time
        const now = new Date();
        let raStartDate;

        // Parse the ra_start_date based on its format
        if (rfqData.ra_start_date.includes('T')) {
          raStartDate = new Date(rfqData.ra_start_date);
        } else if (rfqData.ra_start_date.includes(' ')) {
          // Format: "YYYY-MM-DD HH:MM:SS"
          const [datePart, timePart] = rfqData.ra_start_date.split(' ');
          raStartDate = new Date(`${datePart}T${timePart}`);
        } else {
          // Try to parse as-is
          raStartDate = new Date(rfqData.ra_start_date);
        }

        // Check if auction has started
        return raStartDate <= now;
      };

      // Determine if reverse auction is active
      const isAuctionActive = isReverseAuctionActive();

      // Only set currentLowest to true if auction is active AND there are lowest quotations
      setCurrentLowest(hasLowestQuotation && isAuctionActive);

      // Set technical evaluation restrictions based on whether reverse auction is active
      // This ensures restrictions are applied during reverse auction regardless of URL parameters
      setShowTechEvalRestrictions(isAuctionActive);
    } else {
      setCurrentLowest(null);
    }
  };

  const getRFQdetails = () => {
    setloading(true);
    getRFQById(id, token)
      .then((res) => {
        setloading(false);

        setTenderFees(res.data?.tender_fees || 0);
        setTenderPaymentPaid(res.data?.has_paid_tender_fees === true);

        if (res.data.quote_details) {
          setglobalComment(res.data.quote_details.global_comment || ""); // Set globalComment from API or fallback to empty string
          setglobalPaymentTerms(res.data.quote_details.global_payment_term || ""); // Set globalPaymentTerms from API or fallback to empty string

          //  one state and useRef for payment terms to track newly added, updated, and deleted terms
          const paymetTermData = res.data.quotations[0]?.payment_terms || []
          setPaymentTermsRows(paymetTermData); // Set structured payment terms rows
          originalPaymentTermsListRef.current  = paymetTermData

          const currentGSTIN = res.data.quote_details.gstin;
          setVendorGSTIN(currentGSTIN ?? null);
        }

        if (res.data.terms_and_conditions_files) {
          setPreviousGlobalFiles(res.data?.terms_and_conditions_files?.map((item) => { return item.file_url }))
        }
        // Array to store each quote
        let bidProducts = [];

        // Map to store already quoted data if exists
        const quotationsMap = new Map();
        res.data.quotations[0]?.products?.forEach((quoteItem) => {
          const key = `${quoteItem.product_id}_${quoteItem.variant}`;
          quotationsMap[key] = quoteItem;
        });

        if (res.data.products.length > 0) {
          res.data.products.map((productItem) => {
            const key = `${productItem.product_id}_${productItem.variant}`;
            const quoteItem = quotationsMap[key] || {}; // Fallback to empty if not found

            bidProducts.push({
              id: productItem.id,
              product_id: productItem.product_id,
              variant: productItem.variant,
              quantity: getProductSpecValueByTitle(
                productItem?.product_specs,
                "Quantity"
              ),
              // quantity: productItem?.product_specs[2]?.value || "",
              product_name: productItem.product_details
                ? productItem.product_details[0].name
                : "",
              unit_price: quoteItem.unit_price || "",
              package_price: quoteItem.package_price || globalPackaging || null,
              tax: quoteItem.tax || globalTax || null,
              freight_price: quoteItem.freight_price || globalFreight || null,
              total_price: sharedCalculateTotal(
                quoteItem,
                getProductSpecValueByTitle(
                  productItem?.product_specs,
                  "Quantity"
                )
              ),
              comment: quoteItem.comment || "",
              delivery_period: quoteItem.delivery_period || "",
              previous_document_files:
                quoteItem?.previous_document_files?.map((item) => {
                  return item.file_url;
                }) || [],
              document_files: [],
              freight_mode: quoteItem?.freight_mode || "percentage",
              package_mode: quoteItem?.package_mode || "percentage",
              tax_mode: quoteItem?.tax_mode || "percentage",
            });
          });
          setquoteProducts(bidProducts);

          const freightProductObj = { global: "percentage" };
          bidProducts.forEach(product => { freightProductObj[product.id] = product.freight_mode})

          const packageProductObj = { global: "percentage" };
          bidProducts.forEach(product => { packageProductObj[product.id] = product.package_mode})

          const taxProductObj = { global: "percentage" };
          bidProducts.forEach(product => { taxProductObj[product.id] = product.tax_mode})

          setChargesMode({ freight: freightProductObj, package: packageProductObj, tax: taxProductObj });
          if (res.data.quotations.length > 0)
            setalreadyQuoted(res.data.quotations)
        }
        // Changes by Agnij <2024-07-30> [Pass RFQ data directly to avoid state timing issues]
        updatecurrentLowest(res.data.products, res.data);
        setrfqDetails(res.data);
      })
      .catch((error) => {
        setloading(false);
      });
  };

  const handleUpdateData = (
    item_id,
    e,
    product_id,
    variant,
    type,
    valueType = "integer",
    total_qty = parseFloat(total_qty),
    file,
    fileOperation,
    freightMode = chargesMode.freight[item_id],
    packageMode = chargesMode.package[item_id],
    taxMode = chargesMode.tax[item_id],
  ) => {
    let value = e.target.value;
    let d = quoteProducts.map((item) => {
      if (item.id == item_id && item.product_id == product_id && item.variant == variant) {
        if (valueType == "integer") {
          item[type] = parseFloat(value);
        } else if (valueType == "array") {
          let doc_list = item[type];
          if (fileOperation && fileOperation == "remove") {
            let newFileList = doc_list.filter((fileItem) => fileItem !== file);
            item[type] = newFileList;
          }
          else
            item[type].push(file)

        } else {
          item[type] = value;
        }

        const totalWithoutFPT = item.unit_price * total_qty;
        const freightPrice = freightMode == "percentage" ? ((totalWithoutFPT * parseFloat(item.freight_price || 0)) / 100) : parseFloat(item.freight_price || 0);
        const packagePrice = packageMode == "percentage" ? ((totalWithoutFPT * parseFloat(item.package_price || 0)) / 100) : parseFloat(item.package_price || 0);

        // Subtotal before Tax
        const subtotalBeforeTax = totalWithoutFPT + freightPrice + packagePrice;

        // Calculate Tax (percentage of subtotalBeforeTax)
        const tax = taxMode == "percentage" ? ((subtotalBeforeTax * parseFloat(item.tax || 0)) / 100) : parseFloat(item.tax || 0);

        // Final total price
        const getTotalPrice = subtotalBeforeTax + tax;
        item.total_price = getTotalPrice ? Math.round(getTotalPrice) : 0;
      }
      return item;
    });
    setquoteProducts(d);
  };

  const calculateTotal = (products, is_global = false, charge) => {
    const d = products.map((item) => {

      let prod = rfqDetails.products.find((pi) => pi.id == item.id);

      let unit_price = parseFloat(item.unit_price) || 0;
      let freight_price = parseFloat(item.freight_price) || 0;
      let package_price = parseFloat(item.package_price) || 0;
      let item_tax = parseFloat(item.tax) || 0;
      let total_qty = parseFloat(getProductSpecValueByTitle(prod.product_specs, "Quantity")) || 0;

      const totalWithoutFPT = unit_price * total_qty;
      const freightPrice = (charge == 'freight' ? chargesMode.freight.global : chargesMode.freight[item.id]) == "percentage" ? ((totalWithoutFPT * freight_price) / 100) : freight_price;
      const packagePrice = (charge == 'package' ? chargesMode.package.global : chargesMode.package[item.id]) == "percentage" ? ((totalWithoutFPT * package_price) / 100) : package_price;

      // Subtotal before Tax
      const subtotalBeforeTax = totalWithoutFPT + freightPrice + packagePrice;

      // Calculate Tax (percentage of subtotalBeforeTax)
      const tax = (charge == 'tax' ? chargesMode.tax.global : chargesMode.tax[item.id]) == "percentage" ? ((subtotalBeforeTax * item_tax) / 100) : item_tax;

      // Final total price
      const totalPrice = subtotalBeforeTax + tax;

      const total = Math.round(totalPrice) || 0;
      item.total_price = total;

      return item;
    });

    setquoteProducts(d);
  }



  // 
  const getPaymentTermsChanges = () => {
  
  // newly added term, no id in objects
const createdTerms = 
  paymentTermsRows
    .filter(t => !t.id && t.action !== "delete")
    .map(({ id, action, ...rest }) => rest)


// DELETE: only ids
const deletedTerms = paymentTermsRows
  .filter(t => t.id && t.action === "delete")
  .map(t => t.id);

// UPDATE: full object incl. id, exclude action
const updatedTerms = 
  paymentTermsRows
    .filter(c => {
      const o = originalPaymentTermsListRef.current.find(x => x.id === c.id);
      return (
        c.id &&
        c.action !== "delete" &&
        o && (
          c.type !== o.type ||
          c.value !== o.value ||
          (c.days ?? null) !== (o.days ?? null) ||
          (c.comment ?? "") !== (o.comment ?? "")
        )
      );
    })
    .map(({ action, ...rest }) => rest)


return { deletedTerms, createdTerms, updatedTerms };
};


  // Changes by Agnij [Save form state before opening payment modal]
  const saveFormState = () => {
    formStateRef.current = {
      quoteProducts: JSON.parse(JSON.stringify(quoteProducts)),
      globalFreight,
      globalPackaging,
      globalTax,
      globalPaymentTerms,
      globalComment,
      globalDocumentFiles: [...globalDocumentFiles],
      paymentTermsRows: JSON.parse(JSON.stringify(paymentTermsRows)),
      vendorGSTIN,
      chargesMode: JSON.parse(JSON.stringify(chargesMode))
    };
  };

  // Changes by Agnij [Restore form state after payment modal closes]
  const restoreFormState = () => {
    if (formStateRef.current) {
      setquoteProducts(formStateRef.current.quoteProducts);
      setglobalFreight(formStateRef.current.globalFreight);
      setglobalPackaging(formStateRef.current.globalPackaging);
      setglobalTax(formStateRef.current.globalTax);
      setglobalPaymentTerms(formStateRef.current.globalPaymentTerms);
      setglobalComment(formStateRef.current.globalComment);
      setGlobalDocumentFiles(formStateRef.current.globalDocumentFiles);
      setPaymentTermsRows(formStateRef.current.paymentTermsRows);
      setVendorGSTIN(formStateRef.current.vendorGSTIN);
      setChargesMode(formStateRef.current.chargesMode);
      formStateRef.current = null;
    }
  };

  const initiateTenderPayment = async () => {
    try {
      setTenderPaymentLoading(true);
      
      // Changes by Agnij [Save form state before opening payment modal]
      saveFormState();
      shouldAutoSendQuoteRef.current = true;

      const orderRes = await createTenderPaymentOrder(id, token);
      
      // Changes by Agnij [Axios interceptor returns response.data, so orderRes is already the data object]
      // Backend returns: { status: 1, data: { order: {...}, payment_id: 20 } }
      // After axios interceptor: orderRes = { status: 1, data: { order: {...}, payment_id: 20 } }
      // So orderData = orderRes.data.order (not orderRes.data.data.order)
      console.log('=== Razorpay Order Data Debug ===');
      console.log('Full API response (after axios interceptor):', orderRes);
      console.log('Response.data:', orderRes?.data);
      
      const orderData = orderRes?.data?.order;
      console.log('Order data extracted:', orderData);
      console.log('Order ID:', orderData?.id);
      console.log('Order amount (paise):', orderData?.amount);
      console.log('Order amount (rupees):', orderData?.amount ? orderData.amount / 100 : 0);
      console.log('Order currency:', orderData?.currency);
      console.log('===================================');

      if (orderRes?.data?.already_paid) {
        setTenderPaymentPaid(true);
        toast.success("Tender fees already paid.");
        shouldAutoSendQuoteRef.current = false;
        setTenderPaymentLoading(false);
        // Changes by Agnij [Allow quote update even if tender fees are already paid]
        // Continue to show the submit confirmation modal so user can update quote
        setShowSubmitQuoteConfirmModal(true);
        return;
      }

      if (!orderData || !orderData.id) {
        console.error('Order data validation failed:', { orderData, orderRes });
        toast.error("Failed to create payment order. Please try again.");
        shouldAutoSendQuoteRef.current = false;
        restoreFormState();
        setTenderPaymentLoading(false);
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        toast.error("Razorpay SDK failed to load. Please try again.");
        shouldAutoSendQuoteRef.current = false;
        restoreFormState();
        setTenderPaymentLoading(false);
        return;
      }

      // Changes by Agnij [When using order_id, Razorpay fetches order details automatically]
      // Don't pass amount field - Razorpay will use the amount from the order
      // This matches the pattern used in subscription payments
      console.log('=== Razorpay Options Debug ===');
      console.log('Order ID being used:', orderData.id);
      console.log('Order amount from backend (paise):', orderData.amount);
      console.log('Order amount from backend (rupees):', orderData.amount / 100);
      console.log('Note: Not passing amount field - Razorpay will fetch from order');
      console.log('===================================');
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        order_id: orderData?.id,
        // Changes by Agnij [Don't pass amount - Razorpay fetches it from the order when order_id is provided]
        // This matches the subscription payment pattern
        currency: orderData?.currency || "INR",
        name: "Workwise",
        description: "Tender Fees",
        handler: async function (response) {
          try {
            await verifyTenderPayment(
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                rfq_id: id
              },
              token
            );
            setTenderPaymentPaid(true);
            toast.success("Tender fees paid successfully.");
            
            // Changes by Agnij [Auto-send quote after successful payment]
            // Don't restore state on success - we want to submit with current form data
            if (shouldAutoSendQuoteRef.current) {
              shouldAutoSendQuoteRef.current = false;
              // Clear the saved state since payment was successful
              formStateRef.current = null;
              // Small delay to ensure payment status is updated
              setTimeout(() => {
                handleSubmitQuoteConfirm();
              }, 300);
            } else {
              // If auto-send wasn't intended, just refresh RFQ details
              await getRFQdetails();
            }
          } catch (err) {
            toast.error("Payment verification failed.");
            shouldAutoSendQuoteRef.current = false;
            restoreFormState();
            setTenderPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: function() {
            // Changes by Agnij [Restore form state when payment modal is closed without payment]
            shouldAutoSendQuoteRef.current = false;
            restoreFormState();
            setTenderPaymentLoading(false);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: ""
        },
        notes: {
          rfq: id
        },
        theme: {
          color: "#158993"
        }
      };

      const paymentObject = new window.Razorpay(options);
      
      // Changes by Agnij [Handle payment failure]
      paymentObject.on('payment.failed', function(response) {
        toast.error("Payment failed. Please try again.");
        shouldAutoSendQuoteRef.current = false;
        restoreFormState();
        setTenderPaymentLoading(false);
      });

      paymentObject.open();
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to initiate payment";
      toast.error(msg);
      shouldAutoSendQuoteRef.current = false;
      restoreFormState();
      setTenderPaymentLoading(false);
    }
  };

  const handleSendQuote = async () => {
    // Changes by Agnij [Only check payment if not already paid - payment should only be asked once]
    if (rfqDetails?.is_tender === 1 && (tenderFees || 0) > 0 && !tenderPaymentPaid) {
      await initiateTenderPayment();
      return;
    }
    setShowSubmitQuoteConfirmModal(true);
  };

  const handleSubmitQuoteConfirm = () => {

    
    setShowSubmitQuoteConfirmModal(false);

    // Validate payment terms - at least one valid row should exist
    const validPaymentTerms = paymentTermsRows.filter(row => 
      row && 
      row.action !== "delete" && 
      row.type && 
      row.value != null && 
      row.value > 0
    );
    
    if (validPaymentTerms.length === 0) {
      return toast.error("At least one valid payment term is required. Please add your payment terms.");
    }

    if(!vendorGSTIN || vendorGSTIN.length != 15) {
      return toast.error("Please enter a valid GSTIN.")
    }

    // return 0
    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: [],
      globalPaymentTerms,
      global_payment_term_list: paymentTermsRows,    // NEW structured array
      globalComment,
      term_and_condition_files: globalDocumentFiles,
      vendorGSTIN
    };

    if (alreadyQuoted) {
      // Validate payment terms for update scenario
      const paymentTermsUpdate = getPaymentTermsChanges(paymentTermsRows, originalPaymentTermsListRef.current);
      const validCreatedTerms = paymentTermsUpdate.createdTerms.filter(row => 
        row && 
        row.type && 
        row.value != null && 
        row.value > 0
      );
      const validUpdatedTerms = paymentTermsUpdate.updatedTerms.filter(row => 
        row && 
        row.type && 
        row.value != null && 
        row.value > 0
      );
      
      // Check if there are any valid terms after considering deletions
      const remainingValidTerms = validCreatedTerms.length + validUpdatedTerms.length;
      const originalValidTerms = originalPaymentTermsListRef.current ? 
        originalPaymentTermsListRef.current.filter(row => 
          row && 
          row.type && 
          row.value != null && 
          row.value > 0 &&
          !paymentTermsUpdate.deletedTerms.includes(row.id)
        ).length : 0;
      
      if (remainingValidTerms + originalValidTerms === 0) {
        // setShowSubmitQuoteConfirmModal(false);
        return toast.error("At least one valid payment term is required. Please add your payment terms.");
      }

      payload.global_payment_term_list = paymentTermsUpdate;

      let quote_id = rfqDetails.quotations[0].id;
      const updatedProducts = quoteProducts.map(product => {
        if(product.unit_price == 0) {
          product.tax = 0;
          product.freight_price = 0;
          product.package_price = 0;
          product.total_price = 0;
        }

        product.freight_price = parseFloat(product.freight_price) || 0;
        product.tax = parseFloat(product.tax) || 0;
        product.package_price = parseFloat(product.package_price) || 0;
        product.total_price = parseFloat(product.total_price) || 0;

        product.freight_mode = chargesMode.freight[product.id] || product.freight_mode;
        product.package_mode = chargesMode.package[product.id] || product.package_mode;
        product.tax_mode = chargesMode.tax[product.id] || product.tax_mode;

        return product;
      })
      payload = { ...payload, products: updatedProducts };

      setsubmitLoading(true);
      updateQuotation(quote_id, payload, token)
        .then((res) => {
          setsubmitLoading(false);
          toast.success("Quote updated Successfully...!");
          // setShowSubmitQuoteConfirmModal(false);
          router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        })
        .catch((error) => {
          setsubmitLoading(false);
          // setShowSubmitQuoteConfirmModal(false);
          // Display error message from backend
          const errorMessage = error.response?.data?.message || "Unable to update quote. Please try again.";
          toast.error(errorMessage);
        })
    }
    else {
      let isEmpty = false;
      let allFinalizedProducts = [];
      rfqDetails?.finalizations?.map((item) =>
        allFinalizedProducts.push(item.product_id)
      );
      let filteredquoteProducts = quoteProducts.filter((item) => {
        if (!allFinalizedProducts.includes(item.product_id)) {
          return item;
        }
      });

      const updatedProducts = filteredquoteProducts.map(product => {
        if(product.unit_price == 0) {
          product.tax = 0;
          product.freight_price = 0;
          product.package_price = 0;
          product.total_price = 0;
        } else {
          product.freight_price = parseFloat(product.freight_price) || 0;
          product.tax = parseFloat(product.tax) || 0;
          product.package_price = parseFloat(product.package_price) || 0;
          product.total_price = parseFloat(product.total_price) || 0;
        }

        product.freight_mode = chargesMode.freight[product.id] || chargesMode.freight.global;
        product.package_mode = chargesMode.package[product.id] || chargesMode.package.global;
        product.tax_mode = chargesMode.tax[product.id] || chargesMode.tax.global;
        return product;
      })

      if (
        updatedProducts.some(
          (product) =>
            (!!product.unit_price && (parseInt(product.unit_price) || 0) <= 0) ||
            (!!product.delivery_period && (parseInt(product.delivery_period) || 0) <= 0)
        )
      ) {
        // setShowSubmitQuoteConfirmModal(false);
        return toast.error("Some required fields may be missing or in negative")
      }
        
      payload = { ...payload, products: updatedProducts };

      setsubmitLoading(true);
      sendQuotation(payload, token)
        .then((res) => {
          setsubmitLoading(false);
          toast.success("Quote sent Successfully...!");
          // setShowSubmitQuoteConfirmModal(false);
          router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        })
        .catch((err) => {
          setsubmitLoading(false);
          // setShowSubmitQuoteConfirmModal(false);
          // Display error message from backend
          const errorMessage = err.response?.data?.message || "Unable to send quote. Please try again.";
          toast.error(errorMessage);
        });
    }
  };

  const handleSubmitQuoteCancel = () => {
    setShowSubmitQuoteConfirmModal(false);
  };

  const isAvailableForQuote = (item) => {
    if (rfqDetails.finalizations && rfqDetails.finalizations.length > 0) {
      let itemFound = rfqDetails.finalizations.find((f_item) => f_item.product_id == item.product_id && f_item.variant == item.variant);
      return itemFound ? false : true;
    } else {
      return true;
    }
  };

  const handleRegretQuote = ({ reqret_reason }, resetForm) => {
    let isEmpty = false;
    let allFinalizedProducts = [];
    rfqDetails?.finalizations?.map((item) =>
      allFinalizedProducts.push(item.product_id)
    );
    let filteredquoteProducts = quoteProducts.filter((item) => {
      if (!allFinalizedProducts.includes(item.product_id)) {
        return item;
      }
    });

    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: filteredquoteProducts,
      is_regret: 1,
      regret_reason: reqret_reason,
      globalPaymentTerms,
      globalComment,
    };
    setsubmitLoading(true);
    sendQuotation(payload, token)
      .then((res) => {
        setsubmitLoading(false);
        toast.success("Quote regretted successfully!");
        router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
      })
      .catch((err) => {
        setsubmitLoading(false);
        // Display error message from backend
        const errorMessage = err.response?.data?.message || "Failed to submit regret. Please try again.";
        toast.error(errorMessage);
      });
  };

  const uploadQuoteItemFiles = async (e, item) => {
    try {
      const filePath = await handleFileUpload(e, token);
      handleUpdateData(
        item.id,
        e,
        item.product_id,
        item.variant,
        "document_files",
        "array",
        getProductSpecValueByTitle(item?.product_specs, "Quantity"),
        // item?.product_specs[2]?.value,
        filePath
      )
    } catch (error) {
      console.error(error)
      let message = error.message?.response?.data?.errors?.file?.message;
      toast.error(message);
    }
  };

  const uploadGlobalDocumentFiles = async (e) => {
    try {
      const filePath = await handleFileUpload(e, token);

      setGlobalDocumentFiles((prevGlobalDocumentFiles) => [
        ...prevGlobalDocumentFiles,
        filePath
      ]);

    } catch (error) {
      let message = error.message;
      toast.error(message);
    }
  };

  const uploadExtractionDocument = async (e) => {
    try {
      setExtractingQuotes(true);
      await handleQuotationDocumentUpload(e.target?.files?.[0]);
    } catch (error) {
      let message = typeof error.message == 'string' ? error.message : "Something went wrong in extracting Quotes from uploaded document";
      toast.error(message);
    } finally { 
      setExtractingQuotes(false); 
    }
  }

  const handleQuotationDocumentUpload = async (file) => {
    try {
      const response = await extractQuotation(file, rfqDetails)
      const extracted = response.data?.result?.extracted?.Details;

      if(extracted) {
        setExtractedQuotes((prev) => ({
          ...prev,
          data: normalizeExtractedItems(extracted),
          show: true,
        }));
      } else {
        toast.info("No Quotations found in given document. If you think this is wrong, please contact our support team!")
      }
    } catch (error) {
      console.error("QUOTE EXTRACTION ERROR:", error);
      toast.error("Something went wrong while extraction details from quotation document, please try again later!");
    }
  }

  const removeGlobalFiles = (file_url) => {
    const newFileLinks = globalDocumentFiles.filter((fileItem) => fileItem !== file_url);
    setGlobalDocumentFiles(newFileLinks);
  }
  
  const updateChargesByGlobal = (chargeType) => {
    if(chargeType == "freight") {
      const freightGlobalValues = { global: chargesMode.freight.global };
      Object.keys(chargesMode.freight).forEach((key) => {
        if (key == "global") return;
        freightGlobalValues[key] = chargesMode.freight.global;
      });

      setChargesMode((prev) => ({
        ...prev,
        freight: freightGlobalValues,
      }));
    } else if (chargeType == "package") {
      const packageGlobalValues = { global: chargesMode.package.global };
      Object.keys(chargesMode.package).forEach(key => {
        if(key == "global") return;
        packageGlobalValues[key] = chargesMode.package.global;
      })

      setChargesMode(prev => ({
        ...prev,
        package: packageGlobalValues,
      }))
    } else if (chargeType == "tax") {
      const taxGlobalValues = { global: chargesMode.tax.global };
      Object.keys(chargesMode.tax).forEach(key => {
        if(key == "global") return;
        taxGlobalValues[key] = chargesMode.tax.global;
      })

      setChargesMode(prev => ({
        ...prev,
        tax: taxGlobalValues,
      }))
    }
  }

  const overrideQuote = (overrideQuotes) => {
    if (overrideQuotes && Array.isArray(overrideQuotes)) {
      const overrideQuoteIds = overrideQuotes.map(quote => quote.id);
      const updatedProduts = quoteProducts
        .map((product) => {
          if (overrideQuoteIds.includes(product.id)) {
            const quote = overrideQuotes.find(quote => product.id === quote.id);
            if(quote) {
              if (typeof quote.base_price === "number") {
                product.unit_price = quote.base_price;
              }
              if (typeof quote.freight.value === "number") {
                product.freight_price = quote.freight.value;
                product.freight_mode = quote.freight.unit;
              }
              if (typeof quote.packaging.value === "number") {
                product.package_price = quote.packaging.value;
                product.package_mode = quote.packaging.unit;
              }
              if (typeof quote.tax.value === "number") {
                product.tax = quote.tax.value;
                product.tax_mode = quote.tax.unit;
              }
              product.delivery_period = String(quote.delivery_period);
            }
          }

          return product;
        });

      calculateTotal(updatedProduts);

      setExtractedQuotes(prev => ({...prev, show: false}));
      toast.info("Quoted has been overrided to respective products")
    }
  };

  useEffect(() => {
    updateChargesByGlobal("freight");
    calculateTotal(quoteProducts, true, 'freight');
  }, [chargesMode.freight.global])

  useEffect(() => {
    updateChargesByGlobal("package");
    calculateTotal(quoteProducts, true, 'package');
  }, [chargesMode.package.global, chargesMode.tax.global])

  useEffect(() => {
    updateChargesByGlobal("tax");
    calculateTotal(quoteProducts, true, 'tax');
  }, [chargesMode.tax.global])

  useEffect(() => {
    const updated = quoteProducts.map((item) => ({
      ...item,
      freight_price:
        globalFreight === "" ? 0 : globalFreight ?? item.freight_price ?? 0,
    }));
    updateChargesByGlobal("freight");
    calculateTotal(updated, true, 'freight');
  }, [globalFreight]);

  useEffect(() => {
    const updated = quoteProducts.map((item) => ({
      ...item,
      package_price:
        globalPackaging === ""
          ? 0
          : globalPackaging ?? item.package_price ?? 0,
    }));
    updateChargesByGlobal("package");
    calculateTotal(updated, true, 'package');
  }, [globalPackaging]);

  useEffect(() => {
    const updated = quoteProducts.map((item) => ({
      ...item,
      tax: globalTax === "" ? 0 : globalTax ?? item.tax ?? 0,
    }));
    updateChargesByGlobal("tax");
    calculateTotal(updated, true, 'tax');
  }, [globalTax]);

  useEffect(() => {
    console.log("EXTRACTED DATA:", extractedQuotes.data)
  }, [extractedQuotes.data])

  return (
    <>
      {submitLoading && <Loader />}
      <section className="quote-common-header sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Send Quotation</h3>
            </div>
            <div className="col-md-6"></div>
          </div>
        </div>
      </section>

      {/* Table Placeholder */}
      {loading && (
        <section className="quote-send-sec-1">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                <div className="quote-sec-table">
                  <div className="quote-sec-table-top">
                    <h3 className="title">
                      <PlaceholderLoading
                        shape="rect"
                        width={600}
                        height={50}
                      />
                    </h3>

                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                  </div>

                  <div className="table-responsive">
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Sl No.</th>
                            <th>Item</th>
                            <th>Qty</th>
                            {/* <th>Unit</th> */}
                            <th>Pricing</th>
                            {/* <th>Freight</th> */}
                            <th>Package</th>
                            <th>Taxes</th>
                            <th>Total</th>
                            <th>Vendor Comments</th>
                            <th style={{ maxWidth: "100px" }}>
                              Delivery Period
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={100}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={300}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            <td>
                              <div className="comment">
                                <div className="comment-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={200}
                                    height={20}
                                  />
                                </div>

                                <PlaceholderLoading
                                  shape="rect"
                                  width={150}
                                  height={40}
                                />
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="quote-sec-btm">
                    <div className="row">
                      <div className="col-md-6">
                        <PlaceholderLoading
                          shape="rect"
                          width={150}
                          height={40}
                        />
                      </div>
                      <div className="col-md-6">
                        <div className="float-end">
                          <PlaceholderLoading
                            shape="rect"
                            width={150}
                            height={40}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* // Actual Data area */}

      {!loading && rfqDetails && (
        <section className="quote-send-sec-1">
          <div className="container-fluid ">
            {/* Negotiation Round Banner */}
            {rfqDetails.id && (
              <div className="row mb-3">
                <div className="col-12">
                  <VendorNegotiationRoundBanner rfq_id={rfqDetails.id} />
                </div>
              </div>
            )}
            <div className="row">
              <div className="col-md-12">
                <div className="quote-sec-table">
                  <div className="quote-sec-table-top">

                      {/* RFQ Details Section */}
                                      <div className="d-flex flex-wrap justify-content-between gap-4 mb-3 bg-light p-3 rounded-2">
                    {rfqDetails?.company_name && (
                      <div className="text-start">
                        <strong>RFQ No:</strong>
                        <div>#{rfqDetails.rfq_no}</div>
                      </div>
                    )}
                    {rfqDetails?.contact_name && (
                      <div className="text-start">
                        <strong>Company Name:</strong>
                        <div>{rfqDetails?.company_name || ''}</div>
                      </div>
                    )}
                    {rfqDetails?.contact_name && (
                      <div className="text-start">
                        <strong>Contact Person:</strong>
                        <div>{rfqDetails?.contact_name || ""}</div>
                      </div>
                    )}
                    {rfqDetails?.response_email && (
                      <div className="text-start">
                        <strong>Email:</strong>
                        <div>{rfqDetails.response_email}</div>
                      </div>
                    )}
                    {rfqDetails?.contact_number && (
                      <div className="text-start">
                        <strong>Contact Number:</strong>
                        <div>{rfqDetails.contact_number}</div>
                      </div>
                    )}
                  </div>
                  
       
        {/* AI file upload start here */}
       <div>
       {/* <div>

         <div className="d-flex align-items-center my-3">
           <hr className="flex-grow-1" />
           <span className="mx-3  fw-semibold">
         Smart Quotation Assist - Wisely 
           </span>
           <hr className="flex-grow-1" />
         </div>

                      <label
                        className="upload uploadInlineFile d-flex align-items-center justify-content-center rounded-2 mb-3 py-2"
                        style={{
                          background: "#edf0ff",
                          border: "1px dashed #c9cff8",
                          cursor: "pointer",
                          opacity: extractingQuotes ? "0.5" : "1",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faWandMagicSparkles}
                          className="me-2"
                        />
                        {extractingQuotes
                          ? "Extracing quotes from document..."
                          : "Upload document to extract quotes"}
                        <input
                          type="file"
                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                          onChange={(e) => uploadExtractionDocument(e)}
                          multiple
                          disabled={extractingQuotes}
                        />
                      </label>

                       start: recently upload files 
                       {globalDocumentFiles &&
                        globalDocumentFiles.length > 0 && (
                          <div className="row">
                            <p className="fw-medium mb-1">
                              New Uploaded Files:
                            </p>
                            <div className="d-flex gap-4">
                              {globalDocumentFiles.map((doc_file) => {
                                return (
                                  <p
                                    key={doc_file}
                                    href={doc_file}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="badge bg-light border text-primary   text-truncate cursor-pointer "
                                    style={{ maxWidth: 280 }}
                                    title={"Click here to download the file"}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      removeGlobalFiles(doc_file);
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faDownload}
                                      className="text-primary "
                                    />
                                    <span
                                      className="text-truncate"
                                      style={{
                                        maxWidth: 200,
                                        marginLeft: "10px",
                                      }}
                                    >
                                      {extractfileName(doc_file)}
                                    </span>
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        )} 
             start: recently upload files
            {globalDocumentFiles && globalDocumentFiles.length > 0 && (
          <div className="row">
           <p className="fw-medium mb-1">New Uploaded Files:</p>
            <div className="d-flex gap-4" >
              {globalDocumentFiles.map((doc_file) => {
               return (
                  <p
                  key={doc_file}
                  href={doc_file}
                  target="_blank"
                  rel="noreferrer"
                  className="badge bg-light border text-primary   text-truncate cursor-pointer "
                  style={{ maxWidth: 280 }}
                  title={"Click here to download the file"}
                  onClick={(e) => {
                      e.preventDefault()
                      removeGlobalFiles(doc_file)
                    }}
                >
                  <FontAwesomeIcon icon={faDownload} className="text-primary " />
                  <span className="text-truncate" style={{ maxWidth: 200, marginLeft: '10px' }}>
                   {extractfileName(doc_file)}
                  </span>
                </p>
 
              )
            })}
            </div>
         </div>
          )}

        {previousGlobalFiles?.length > 0 && (
          <div className=" mb-3">
            <p className="fw-medium mb-1">Previously Uploaded Files:</p>
            <div className="d-flex gap-4 ">
              {previousGlobalFiles.map((prev_file) => (
                <a
                  key={prev_file}
                  href={prev_file}
                  target="_blank"
                  rel="noreferrer"
                  className="badge bg-light border text-primary   text-truncate "
                  style={{ maxWidth: 280 }}
                  title={"Click here to download the file"}
                >
                  <FontAwesomeIcon icon={faDownload} className="text-primary " />
                  <span className="text-truncate" style={{ maxWidth: 200, marginLeft: '10px' }}>
                    {extractfileName(prev_file)}
                  </span>
                </a>
              ))}

            </div>
          </div>
        )} 


       </div> */}

       {/* <div className="d-flex align-items-center my-3">
         <hr className="flex-grow-1" />
         <span className="mx-3  fw-semibold">
           OR send quotation manually
         </span>
         <hr className="flex-grow-1" />
       </div>  */}


                    <div className="row align-items-stretch mb-4">
                      {/* ========== COLUMN 1: Global Costing + Quote Document + Global Comment ========== */}
                      <div className="col-lg-4 col-12 d-flex">
                        <div className="card border shadow-sm rounded-3 w-100 h-100">
                          <div className="card-body">
                            <h3 className="fs-6 fw-semibold mb-3">
                              Global Costing
                            </h3>

                            <div className="row g-3 mb-4">
                              {/* Freight */}
                              <div className="col-12 col-sm-4">
                                <label className="form-label">Freight</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min={0}
                                  value={globalFreight}
                                  placeholder={
                                    chargesMode.freight.global === "percentage"
                                      ? "3%"
                                      : "₹950"
                                  }
                                  onChange={(e) =>
                                    setglobalFreight(e.target.value || "")
                                  }
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
                                <div className="mt-2">
                                  <PercentageAbsoluteToggle
                                    currentMode={chargesMode.freight.global}
                                    onToggle={(value) =>
                                      setChargesMode((prev) => ({
                                        ...prev,
                                        freight: {
                                          ...prev.freight,
                                          global: value,
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              </div>

                              {/* Packaging */}
                              <div className="col-12 col-sm-4">
                                <label className="form-label">Packaging</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min={0}
                                  value={globalPackaging}
                                  placeholder={
                                    chargesMode.package.global === "percentage"
                                      ? "4%"
                                      : "₹1450"
                                  }
                                  onChange={(e) =>
                                    setglobalPackaging(e.target.value || "")
                                  }
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
                                <div className="mt-2">
                                  <PercentageAbsoluteToggle
                                    currentMode={chargesMode.package.global}
                                    onToggle={(value) =>
                                      setChargesMode((prev) => ({
                                        ...prev,
                                        package: {
                                          ...prev.package,
                                          global: value,
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              </div>

                              {/* TAX */}
                              <div className="col-12 col-sm-4">
                                <label className="form-label">TAX</label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min={0}
                                  value={globalTax}
                                  placeholder={
                                    chargesMode.tax.global === "percentage"
                                      ? "18%"
                                      : "₹18940"
                                  }
                                  onChange={(e) =>
                                    setglobalTax(e.target.value || "")
                                  }
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
                                <div className="mt-2">
                                  <PercentageAbsoluteToggle
                                    currentMode={chargesMode.tax.global}
                                    onToggle={(value) =>
                                      setChargesMode((prev) => ({
                                        ...prev,
                                        tax: { ...prev.tax, global: value },
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Upload Quotation Document */}
                            <label
                              className="upload uploadInlineFile d-flex align-items-center justify-content-center rounded-2 mb-3 py-2"
                              style={{
                                background: "#edf0ff",
                                border: "1px dashed #c9cff8",
                                cursor: "pointer",
                              }}
                            >
                              <FontAwesomeIcon icon={faFile} className="me-2" />
                              Upload Quotation Document
                              <input
                                type="file"
                                accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                onChange={(e) => uploadGlobalDocumentFiles(e)}
                                multiple
                              />
                            </label>

                            {/* Uploaded Files */}
                            {globalDocumentFiles &&
                              globalDocumentFiles.length > 0 && (
                                <div className="row">
                                  <p className="fw-medium mb-1">
                                    New Uploaded Files:
                                  </p>
                                  <div className="d-flex gap-4">
                                    {globalDocumentFiles.map((doc_file) => (
                                      <p
                                        key={doc_file}
                                        className="badge bg-light border text-primary text-truncate cursor-pointer"
                                        style={{ maxWidth: 280 }}
                                        title="Click here to remove file"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          removeGlobalFiles(doc_file);
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faDownload}
                                          className="text-primary"
                                        />
                                        <span
                                          className="text-truncate"
                                          style={{
                                            maxWidth: 200,
                                            marginLeft: "10px",
                                          }}
                                        >
                                          {extractfileName(doc_file)}
                                        </span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {previousGlobalFiles?.length > 0 && (
                              <div className="mb-3">
                                <p className="fw-medium mb-1">
                                  Previously Uploaded Files:
                                </p>
                                <div className="d-flex gap-4">
                                  {previousGlobalFiles.map((prev_file) => (
                                    <a
                                      key={prev_file}
                                      href={prev_file}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="badge bg-light border text-primary text-truncate"
                                      style={{ maxWidth: 280 }}
                                      title="Click here to download the file"
                                    >
                                      <FontAwesomeIcon
                                        icon={faDownload}
                                        className="text-primary"
                                      />
                                      <span
                                        className="text-truncate"
                                        style={{
                                          maxWidth: 200,
                                          marginLeft: "10px",
                                        }}
                                      >
                                        {extractfileName(prev_file)}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Global Comment moved here */}
                            {/* <h3 className="fs-6 fw-semibold mb-2">
                              Global Comment
                            </h3>
                            <textarea
                              className="form-control"
                              rows={3}
                              value={globalComment}
                              placeholder="Placeholder text for global comment"
                              onChange={(e) => setglobalComment(e.target.value)}
                            /> */}
                          </div>
                        </div>
                      </div>

                      {/* ========== COLUMN 2: Payment Terms (summary) + Global Comment ========== */}
                      <div className="col-lg-3 col-12 d-flex">
                        <div className="card border shadow-sm rounded-3 w-100 h-100">
                          <div className="card-body d-flex flex-column">
                          
                          {globalPaymentTerms && (
                          <>
                            <div className="mb-3 d-flex align-items-center justify-content-between">
                              <h3 className="fs-6 fw-semibold mb-0">Payment Terms <span className="text-danger">*</span></h3>
                            </div>
                            <textarea
                              className="form-control mb-3"
                              rows={3}
                              value={globalPaymentTerms}
                              placeholder="100% Against Proforma Invoice"
                              onChange={(e) => setglobalPaymentTerms(e.target.value)}
                            />
                            </>
                          )}

                            <h3 className="fs-6 fw-semibold mb-2">Global Comment</h3>
                            <textarea
                              className="form-control flex-grow-1"
                            value={globalComment}
                            placeholder="Placeholder text for global comment"
                            onChange={(e) => setglobalComment(e.target.value)}
                          />
                        </div>
                      </div>
                      </div>

                      {/* ========== COLUMN 3: Payment Terms Breakdown (editor) ========== */}
                      <div className="col-lg-5 col-12">
                        <div className="border rounded-3 p-3 pb-2 mb-3" >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex flex-column gap-2 w-100">
                              <h3 className="fs-6 fw-semibold mb-0">GSTIN <span className="text-danger">*</span></h3>
                              <input
                                className="form-control w-100"
                                max={15}
                                value={vendorGSTIN}
                                placeholder="Enter your GSTIN as per delivery location"
                                onChange={(e) => setVendorGSTIN(e.target.value)}
                              />
                            </div>
                          </div>
                          </div>

                          <div className="border rounded-3 p-3 pb-2" >
                              <div className="d-flex align-items-center justify-content-between mb-2">
                              <div>
                              <h3 className="fs-6 fw-semibold mb-0">Payment Terms <span className="text-danger">*</span></h3>
                                <small className="text-muted">amount defined so far: {paymentTermsRows.reduce((a,b)=>a+(Number(b.value)||0),0)}%</small>
                                {paymentTermsRows.filter(row => 
                                  row && 
                                  row.action !== "delete" && 
                                  row.type && 
                                  row.value != null && 
                                  row.value > 0
                                ).length === 0 && (
                                  <>
                                    <br />
                                    <small className="text-danger">At least one valid payment term is required</small>
                                  </>
                                )}
                                </div>

                            <SmartButton
                                  onClick={() =>
                                    setPaymentTermsRows((prev) => [ ...(prev || []), { id:null,  value: "", type: "advance", days: "", comment:'' } ])
                                  }
                            theme={'primary'}
                            style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
                            label="Add Term"
                            icon={<FontAwesomeIcon icon={faPlus} className="me-1" />}
                          />


                              </div>

                              <PaymentTermsEditor
                                value={paymentTermsRows}
                                onChange={setPaymentTermsRows}
                              />
                            </div>
                      </div>
                  </div>
                  </div>
                  <div className="table-responsive">
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th
                              rowSpan="2"
                              className="align-middle"
                              style={{ maxWidth: "40px" }}
                            >
                              Sl No.
                            </th>
                            <th rowSpan="2" className="align-middle">
                              Item Details
                            </th>
                            <th
                              className="text-center"
                              style={{ minWidth: "160px" }}
                            >
                              Pricing
                              <br />
                              <small>(Base + Freight)</small>
                            </th>

                            <th
                              className="text-center"
                              style={{ minWidth: "160px" }}
                            >
                              Packaging / Taxes
                            </th>

                            <th className="text-center">Total</th>
                            {currentLowest ? (
                              <th rowSpan="2" className="align-middle">
                                Current Lowest
                              </th>
                            ) : null}
                            <th className="text-center">Specific Comments</th>
                            <th className="text-center">
                              Delivery Period <small>(In Days)</small>
                            </th>
                            <th className="text-center">Add Documents</th>
                            {/* {alreadyQuoted ? (
                              <th className="text-center">
                                Previous Documents
                              </th>
                            ) : null} */}
                          </tr>
                        </thead>
                        <tbody>
                          {rfqDetails.products &&
                            rfqDetails.products.length > 0 &&
                            rfqDetails.products.map((item, index) => {
                              if (isAvailableForQuote(item)) {
                                // Changes by Agnij 2024-07-29 [Fix tech eval restrictions check]
                                const techStatus = techEvalStatuses[item.id];

                                // Determine if inputs should be disabled - only during reverse auction for rejected products
                                const isTechEvalPendingOrRejected =
                                  showTechEvalRestrictions &&
                                  techStatus &&
                                  techStatus.has_tech_eval === true &&
                                  techStatus.is_accepted !== true;

                                return (
                                  <tr
                                    key={`q_${item.id}_${item.product_id}_${item.variant}`}
                                  >
                                    <td>{index + 1}</td>
                                    <td>
                                      <p className="fw-semibold text-nowrap mb-1">
                                        {item?.product_details[0]?.name}
                                      </p>
                                      <p className="text-sm mb-1">
                                        {getProductSpecValueByTitle(
                                          item?.product_specs,
                                          "Size"
                                        )}
                                      </p>
                                      <p className="text-sm mb-1 text-success fw-bold">
                                        {`${getProductSpecValueByTitle(
                                          item?.product_specs,
                                          "Quantity"
                                        )} - ${getProductSpecValueByTitle(
                                          item?.product_specs,
                                          "Unit"
                                        )}`}
                                      </p>
                                      {item?.product_specs[1]?.value && (
                                        <ReadMore
                                          content={`- ${getProductSpecValueByTitle(
                                            item?.product_specs,
                                            "Spec"
                                          )}`}
                                          maxLines={2}
                                          additionalClasses="text-sm"
                                        />
                                      )}
                                      <button
                                        className="minimal-btn "
                                        style={{ marginTop: "auto" }}
                                        // style={{"maxWidth":"120px"}}
                                        onClick={() =>
                                          openQuoteHistoryModal(
                                            item.product_id,
                                            index
                                          )
                                        } // Replace with your actual handler function
                                      >
                                        Prev Quotes
                                      </button>
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Not accepted
                                        </small>
                                      )}
                                    </td>
                                    <td style={{ minWidth: "160px" }}>
                                      {/* Base Price */}
                                      <div className="mb-2">
                                        <small
                                          className="d-block fw-bold"
                                          style={{ fontSize: "0.9rem" , marginBottom : "10px" }}
                                        >
                                          Base Price
                                        </small>
                                        <input
                                          type="number"
                                          name=""
                                          id=""
                                          placeholder="₹"
                                          style={{ minWidth: "150px" }}
                                          value={
                                            quoteProducts[index].unit_price
                                          }
                                          min={0}
                                          onChange={(e) =>
                                            handleUpdateData(
                                              item.id,
                                              e,
                                              item.product_id,
                                              item.variant,
                                              "unit_price",
                                              "",
                                              getProductSpecValueByTitle(
                                                item?.product_specs,
                                                "Quantity"
                                              )
                                            )
                                          }
                                          onWheel={(e) => e.target.blur()}
                                          disabled={isTechEvalPendingOrRejected}
                                        />

                                        {isTechEvalPendingOrRejected && (
                                          <small
                                            className="d-block text-danger mt-1"
                                            style={{ fontSize: "0.7rem" }}
                                          >
                                            Not accepted
                                          </small>
                                        )}
                                      </div>

                                      {/* Freight */}
                                      <div className="mt-2">
                                        {/* Label */}
                                        <small
                                          className="d-block fw-bold"
                                          style={{ fontSize: "0.9rem" }}
                                        >
                                          Freight
                                        </small>

                                        {/* Input + Toggle */}
                                        <div className="d-flex align-items-center">
                                          <input
                                            type="number"
                                            min={0}
                                            style={{
                                              width: "80px",
                                              marginRight: "8px",
                                              marginTop: "-18px",
                                            }}
                                            placeholder={
                                              chargesMode.freight[item.id] ===
                                              "percentage"
                                                ? "%"
                                                : "₹"
                                            }
                                            value={
                                              quoteProducts[index]
                                                .freight_price || ""
                                            }
                                            onChange={(e) =>
                                              handleUpdateData(
                                                item.id,
                                                e,
                                                item.product_id,
                                                item.variant,
                                                "freight_price",
                                                "",
                                                getProductSpecValueByTitle(
                                                  item?.product_specs,
                                                  "Quantity"
                                                )
                                              )
                                            }
                                            onWheel={(e) => e.target.blur()}
                                            disabled={
                                              isTechEvalPendingOrRejected
                                            }
                                          />

                                          <PercentageAbsoluteToggle
                                            currentMode={
                                              chargesMode.freight[item.id]
                                            }
                                            onToggle={(value) => {
                                              setChargesMode((prev) => ({
                                                ...prev,
                                                freight: {
                                                  ...prev.freight,
                                                  [item.id]: value,
                                                },
                                              }));
                                              handleUpdateData(
                                                item.id,
                                                {
                                                  target: {
                                                    value:
                                                      quoteProducts[index]
                                                        .freight_price || 0,
                                                  },
                                                },
                                                item.product_id,
                                                item.variant,
                                                "freight_price",
                                                "",
                                                getProductSpecValueByTitle(
                                                  item?.product_specs,
                                                  "Quantity"
                                                ),
                                                null,
                                                null,
                                                value
                                              );
                                            }}
                                          />
                                        </div>

                                        {/* Error message */}
                                        {isTechEvalPendingOrRejected && (
                                          <small
                                            className="d-block text-danger mt-1"
                                            style={{ fontSize: "0.7rem" }}
                                          >
                                            Not accepted
                                          </small>
                                        )}
                                      </div>
                                    </td>

                                    <td style={{ minWidth: "180px" }}>
                                      {/* Packaging */}
                                      <div className="mb-3" style={{maxHeight : "48px"}}>
                                        <small
                                          className="d-block fw-bold "
                                          style={{ fontSize: "0.9rem" }}
                                        >
                                          Packaging
                                        </small>

                                        <div className="d-flex align-items-center ">
                                          <input
                                            type="number"
                                            min={0}
                                            style={{
                                              width: "80px",
                                              marginRight: "8px",
                                              marginTop: "-18px",
                                            }}
                                            placeholder={
                                              chargesMode.package[item.id] ===
                                              "percentage"
                                                ? "%"
                                                : "₹"
                                            }
                                            value={
                                              quoteProducts[index]
                                                .package_price || ""
                                            }
                                            onChange={(e) =>
                                              handleUpdateData(
                                                item.id,
                                                e,
                                                item.product_id,
                                                item.variant,
                                                "package_price",
                                                "",
                                                getProductSpecValueByTitle(
                                                  item?.product_specs,
                                                  "Quantity"
                                                )
                                              )
                                            }
                                            onWheel={(e) => e.target.blur()}
                                            disabled={
                                              isTechEvalPendingOrRejected
                                            }
                                          />

                                          <PercentageAbsoluteToggle
                                            currentMode={
                                              chargesMode.package[item.id]
                                            }
                                            onToggle={(value) => {
                                              setChargesMode((prev) => ({
                                                ...prev,
                                                package: {
                                                  ...prev.package,
                                                  [item.id]: value,
                                                },
                                              }));
                                              handleUpdateData(
                                                item.id,
                                                {
                                                  target: {
                                                    value:
                                                      quoteProducts[index]
                                                        .package_price || 0,
                                                  },
                                                },
                                                item.product_id,
                                                item.variant,
                                                "package_price",
                                                "",
                                                getProductSpecValueByTitle(
                                                  item?.product_specs,
                                                  "Quantity"
                                                ),
                                                null,
                                                null,
                                                undefined,
                                                value
                                              );
                                            }}
                                          />
                                        </div>

                                        {isTechEvalPendingOrRejected && (
                                          <small
                                            className="d-block text-danger mt-1"
                                            style={{ fontSize: "0.7rem" }}
                                          >
                                            Not accepted
                                          </small>
                                        )}
                                      </div>

                                      {/* Taxes */}
                                      <div className="mt-8" style={{marginTop : "32px"}}>
                                        <small
                                          className="d-block fw-bold mb-1"
                                          style={{ fontSize: "0.9rem", }}
                                        >
                                          Taxes
                                        </small>

                                        <div className="d-flex align-items-center">
                                          <input
                                            type="number"
                                            min={0}
                                            style={{
                                              width: "80px",
                                              marginRight: "8px",
                                              marginTop: "-24px",
                                            }}
                                            placeholder={
                                              chargesMode.tax[item.id] ===
                                              "percentage"
                                                ? "%"
                                                : "₹"
                                            }
                                            value={
                                              quoteProducts[index].tax || ""
                                            }
                                            onChange={(e) =>
                                              handleUpdateData(
                                                item.id,
                                                e,
                                                item.product_id,
                                                item.variant,
                                                "tax",
                                                "",
                                                getProductSpecValueByTitle(
                                                  item?.product_specs,
                                                  "Quantity"
                                                )
                                              )
                                            }
                                            onWheel={(e) => e.target.blur()}
                                            disabled={
                                              isTechEvalPendingOrRejected
                                            }
                                          />

                                          <PercentageAbsoluteToggle
                                            currentMode={
                                              chargesMode.tax[item.id]
                                            }
                                            onToggle={(value) => {
                                              setChargesMode((prev) => ({
                                                ...prev,
                                                tax: {
                                                  ...prev.tax,
                                                  [item.id]: value,
                                                },
                                              }));
                                              handleUpdateData(
                                                item.id,
                                                {
                                                  target: {
                                                    value:
                                                      quoteProducts[index]
                                                        .tax || 0,
                                                  },
                                                },
                                                item.product_id,
                                                item.variant,
                                                "tax",
                                                "",
                                                getProductSpecValueByTitle(
                                                  item?.product_specs,
                                                  "Quantity"
                                                ),
                                                null,
                                                null,
                                                undefined,
                                                undefined,
                                                value
                                              );
                                            }}
                                          />
                                        </div>

                                        {isTechEvalPendingOrRejected && (
                                          <small
                                            className="d-block text-danger mt-1"
                                            style={{ fontSize: "0.7rem" }}
                                          >
                                            Not accepted
                                          </small>
                                        )}
                                      </div>
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        name=""
                                        id=""
                                        placeholder="₹"
                                        value={quoteProducts[index].total_price}
                                        disabled
                                        style={{
                                          maxWidth: "120px",
                                          marginTop: "22px",
                                        }}
                                      />
                                    </td>
                                    {currentLowest ? (
                                      rfqDetails?.products[index]
                                        ?.lowest_quotation ? (
                                        <td>
                                          <input
                                            type="number"
                                            name=""
                                            id=""
                                            placeholder="₹"
                                            value={
                                              rfqDetails?.products[index]
                                                ?.lowest_quotation?.total_price
                                            }
                                            disabled
                                          />
                                          {techEvalStatuses[item.id] &&
                                            techEvalStatuses[item.id]
                                              .has_tech_eval &&
                                            !techEvalStatuses[item.id]
                                              .is_accepted && (
                                              <div className="mt-1">
                                                <small className="text-warning">
                                                  <i className="fas fa-info-circle me-1"></i>
                                                  You must be technically
                                                  accepted to see lowest quote
                                                </small>
                                              </div>
                                            )}
                                        </td>
                                      ) : (
                                        <td>
                                          <input
                                            type="number"
                                            name=""
                                            id=""
                                            placeholder="--"
                                            disabled
                                          />
                                          {techEvalStatuses[item.id] &&
                                            techEvalStatuses[item.id]
                                              .has_tech_eval &&
                                            !techEvalStatuses[item.id]
                                              .is_accepted && (
                                              <div className="mt-1">
                                                <small className="text-warning">
                                                  <i className="fas fa-info-circle me-1"></i>
                                                  Technical acceptance required
                                                </small>
                                              </div>
                                            )}
                                        </td>
                                      )
                                    ) : null}
                                    <td>
                                      <div className="comment">
                                        <div className="comment-group">
                                          <textarea
                                            name="comment"
                                            id="comment"
                                            cols="30"
                                            rows="3"
                                            value={quoteProducts[index].comment}
                                            style={{
                                              maxWidth: "180px",
                                              minHeight: "120px",
                                            }}
                                            onChange={(e) =>
                                              handleUpdateData(
                                                item.id,
                                                e,
                                                item.product_id,
                                                item.variant,
                                                "comment",
                                                "string",
                                                getProductSpecValueByTitle(
                                                  item?.product_specs,
                                                  "Quantity"
                                                )
                                              )
                                            }
                                            disabled={
                                              isTechEvalPendingOrRejected
                                            }
                                          ></textarea>
                                          <span htmlFor="comment">0/300</span>
                                        </div>
                                        {isTechEvalPendingOrRejected && (
                                          <small
                                            className="d-block text-danger mt-1"
                                            style={{ fontSize: "0.7rem" }}
                                          >
                                            Commenting disabled (Not technically
                                            accepted)
                                          </small>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ width: 250 }}>
                                      <input
                                        style={{ maxWidth: "80px" }}
                                        name="delivery_period"
                                        id="delivery_period"
                                        type="number"
                                        placeholder="E.g. 7"
                                        value={
                                          quoteProducts[index].delivery_period
                                        }
                                        onChange={(e) => {
                                          handleUpdateData(
                                            item.id,
                                            e,
                                            item.product_id,
                                            item.variant,
                                            "delivery_period",
                                            "string",
                                            getProductSpecValueByTitle(
                                              item?.product_specs,
                                              "Quantity"
                                            )
                                          );
                                        }}
                                        onWheel={(e) => e.target.blur()}
                                        disabled={isTechEvalPendingOrRejected}
                                      />
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Cannot set delivery (Not technically
                                          accepted)
                                        </small>
                                      )}
                                    </td>
                                    <td style={{ maxWidth: 250 }}>
                                      <label
                                        className={`upload uploadInlineFile d-flex align-items-center justify-content-center ${
                                          isTechEvalPendingOrRejected
                                            ? "disabled"
                                            : ""
                                        }`}
                                      >
                                        <FontAwesomeIcon
                                          icon={faFile}
                                          className="me-2"
                                        />{" "}
                                        Upload
                                        <input
                                          type="file"
                                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                          onChange={(e) =>
                                            uploadQuoteItemFiles(e, item)
                                          }
                                          multiple={true}
                                          disabled={isTechEvalPendingOrRejected}
                                        />
                                      </label>
                                      {alreadyQuoted && (
                                        <td>
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "8px",
                                              fontSize: "0.85rem",
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontWeight: 600,
                                                color: "#333",
                                              }}
                                            >
                                              Previous Documents:
                                            </span>
                                            {quoteProducts[index]
                                              ?.previous_document_files
                                              ?.length > 0 ? (
                                              renderFileLink(
                                                quoteProducts[index]
                                                  .previous_document_files
                                              )
                                            ) : (
                                              <span style={{ color: "#888" }}>
                                                No Files
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Upload disabled (Not technically
                                          accepted)
                                        </small>
                                      )}
                                      {quoteProducts[index].document_files &&
                                        quoteProducts[index].document_files
                                          .length > 0 &&
                                        quoteProducts[index].document_files.map(
                                          (doc_file) => {
                                            return (
                                              <div
                                                key={doc_file}
                                                className="d-flex justify-content-between align-items-center"
                                              >
                                                <a
                                                  href={doc_file}
                                                  className="page-link text-truncate"
                                                  target="_blank"
                                                  style={{ maxWidth: "140px" }}
                                                >
                                                  {extractfileName(doc_file)}
                                                </a>
                                                <span
                                                  className="btn-close btn-close-sm"
                                                  aria-label="Close"
                                                  onClick={(e) =>
                                                    handleUpdateData(
                                                      item.id,
                                                      e,
                                                      item.product_id,
                                                      item.variant,
                                                      "document_files",
                                                      "array",
                                                      getProductSpecValueByTitle(
                                                        item?.product_specs,
                                                        "Quantity"
                                                      ),
                                                      doc_file,
                                                      "remove"
                                                    )
                                                  }
                                                ></span>
                                              </div>
                                            );
                                          }
                                        )}
                                    </td>
                                    {/* {alreadyQuoted && (
                                      <td>
                                        {quoteProducts[index]
                                          .previous_document_files &&
                                          quoteProducts[index]
                                            .previous_document_files.length >
                                            0 &&
                                          renderFileLink(
                                            quoteProducts[index]
                                              .previous_document_files
                                          )}
                                      </td>
                                    )} */}
                                  </tr>
                                );
                              }
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="quote-sec-btm">
                    <div className="row">
                      <div className="col-md-6">
                        {pageType != "update-quote" && (
                          <button
                            id="regret_quote-quote_actions-send_quote_page"
                            type="submit"
                            className="btn btn-primary"
                            onClick={() => setregretModal(true)}
                          >
                            Regret Quote
                          </button>
                        )}
                      </div>
                      <div className="col-md-6">
                        {/* Changes by Agnij 2024-07-30 [Disable send quote button when no fields are filled] */}
                        <button
                          id="send_quote-quote_actions-send_quote_page"
                          type="submit"
                          className="btn btn-secondary float-end"
                          onClick={handleSendQuote}
                          disabled={!isAnyFieldFilled() || tenderPaymentLoading}
                        >
                          Send Quote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
      {extractedQuotes.data && (
        <QuotesOverrideModal
          show={extractedQuotes.show}
          onClose={() =>
            setExtractedQuotes((prev) => ({ ...prev, show: false }))
          }
          quotes={extractedQuotes.data}
          overrideQuote={overrideQuote}
        />
      )}

      {/* Submit Quote Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSubmitQuoteConfirmModal}
        onClose={handleSubmitQuoteCancel}
        onConfirm={handleSubmitQuoteConfirm}
        title="Submit Quote"
        description="Are you sure you want to submit this quote?\nThis action will send your quote to the buyer."
        confirmButtonColor="success"
        confirmButtonText="Submit Quote"
        cancelButtonText="Cancel"
      />

      {showQuoteHistoryModal && (
        <VendorQuoteHistoryModal
          showModal={showQuoteHistoryModal}
          closeModal={() => setShowQuoteHistoryModal(false)}
          quoteHistory={quoteHistory}
          quotehistorydata={quoteHistory?.data} // pass previous_quotes etc.
        />
      )}
    </>
  );
};

export default SendQuotePageComp;






//  PaymentTermsUIOnly component
const PaymentTermsEditor = ({ value, onChange }) => {
  const rows = Array.isArray(value) ? value : [];

    const setRows = (next) => onChange && onChange(next);

    const markDeleted = (index) => {
     const updated = [...rows];
     const row = updated[index] || {};
    updated[index] = { ...row, action: "delete" };
    setRows(updated);
  };

  const restoreRow = (index) => {
    const updated = [...rows];
    const row = updated[index];
    if (!row) return;
    const { action, ...rest } = row;
    updated[index] = rest;
    setRows(updated);
  };

  const updateRow = (index, patch) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div>
      {rows.map((row, index) => {
        const isCredit = row.type === "credit";
        const isDeleted = row.action === "delete";
        return (
          <div key={index} className="row g-2 align-items-end mb-2">
            <div className="col-3">
              <label className="form-label mb-1">% of Amount</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g., 30"
                value={row.value}
                onChange={(e) =>
                  updateRow(index, {
                    value: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                min={0}
                max={100}
                disabled={isDeleted}
              />
            </div>

            <div className="col-3">
              <label className="form-label mb-1">Type</label>
              <select
                className="form-select"
                value={row.type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  updateRow(index, {
                    type: nextType,
                    days: nextType === "credit" ? row.days : "",
                    comment: nextType === "credit" ? "" : (row.comment ?? ""),
                  });
                }}
                disabled={isDeleted}
              >
                <option value="advance">Advance</option>
                <option value="credit">Credit</option>
                <option value="other">Other</option>
              </select>
            </div>

            {isCredit ? (
              <div className="col-4">
                <label className="form-label mb-1">Credit Days</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g., 30"
                  value={row.days}
                  onChange={(e) =>
                    updateRow(index, {
                      days: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  min={1}
                disabled={ isDeleted}
                />
              </div>
            ) : (
              <div className="col-4">
                <label className="form-label mb-1">
                  Comment
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={row.type === "other" ? "Describe payment term" : "Note (optional)"}
                  value={row.comment || ""}
                  onChange={(e) => updateRow(index, { comment: e.target.value })}
               disabled={ isDeleted}
                />
              </div>
            )}

            <div className="col-2 d-flex mb-1">
              {!isDeleted ? (
                <SmartButton
                  onClick={() => markDeleted(index)}
                  theme={"red"}
                  style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
                  label="Remove"
                />
              ) : (
                <SmartButton
                  onClick={() => restoreRow(index)}
                  theme={"secondary"}
                  style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
                  label="Restore"
                />
              )}
            </div>

            {/* Small status line below inputs when deleted */}
            {isDeleted && (
              <div className="col-12 mt-0">
                <small className="text-danger">
                  you removed this term. Click "Restore" to add it back.
                </small>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

