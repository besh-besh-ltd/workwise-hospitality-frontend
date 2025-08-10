import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getRFQById, sendQuotation, updateQuotation } from "@/services/rfq";
import PlaceholderLoading from "react-placeholder-loading";
import Loader from "@/components/shared/Loader";
import { toast } from "react-toastify";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";
import ReadMore from "@/components/shared/ReadMore";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { renderFileLink } from "@/utils/elementFunctions";
import SmartButton from "@/components/shared/SmartButton";
import { calculateTotal as sharedCalculateTotal } from "@/utils/sharedFunctions";

const PercentageAbsoluteToggle = ({ currentMode, onToggle, size = "sm" }) => {
  return (
    <div className="mt-2 d-flex gap-2" role="group">
      <SmartButton
        onClick={() => onToggle('percentage')}
        theme={`${currentMode === 'percentage' ? 'primary' : 'light'}`}
        style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
        label="%"
      />
      <SmartButton
        onClick={() => onToggle('absolute')}
        theme={`${currentMode === 'absolute' ? 'primary' : 'light'}`}
        style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
        label="₹"
      />
      {/* <button
        type="button"
        className={`btn ${currentMode === 'percentage' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onToggle('percentage')}
        style={{ fontSize: '11px', padding: '2px 8px' }}
      >
        in %
      </button>
      <button
        type="button"
        className={`btn ${currentMode === 'absolute' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onToggle('absolute')}
        style={{ fontSize: '11px', padding: '2px 8px' }}
      >
        in ₹
      </button> */}
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
  const [previousGlobalFiles, setPreviousGlobalFiles] = useState([]);
  const [globalDocumentFiles, setGlobalDocumentFiles] = useState([]);
  const [alreadyQuoted, setalreadyQuoted] = useState(null);
  const [currentLowest, setCurrentLowest] = useState(null);
  const [techEvalStatuses, setTechEvalStatuses] = useState({});
  const [showTechEvalRestrictions, setShowTechEvalRestrictions] = useState(false);

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
    
    // Changes by Agnij 2024-07-29 [Add debug logging for URL parameters]
    console.log("URL parameters:", {
      id: router.query.id,
      token: router.query.token,
      type: router.query.type,
      showTechEvalRestrictions: router.query.showTechEvalRestrictions,
      parsedValue: router.query.showTechEvalRestrictions === 'true'
    });
    
    // Update the tech evaluation restriction flag
    const restrictionsEnabled = router.query.showTechEvalRestrictions === 'true';
    setShowTechEvalRestrictions(restrictionsEnabled);
    console.log("Tech eval restrictions:", restrictionsEnabled ? "Enabled" : "Disabled");
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

        if (res.data.quote_details) {
          setglobalComment(res.data.quote_details.global_comment || ""); // Set globalComment from API or fallback to empty string
          setglobalPaymentTerms(res.data.quote_details.global_payment_term || ""); // Set globalPaymentTerms from API or fallback to empty string
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

  const handleSendQuote = () => {
    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: [],
      globalPaymentTerms,
      globalComment,
      term_and_condition_files: globalDocumentFiles
    };

    if (alreadyQuoted) {
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
          router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        })
        .catch((error) => {
          setsubmitLoading(false);
          // Display error message from backend
          const errorMessage = error.response?.data?.message || "Unable to update quote. Please try again.";
          toast.error(errorMessage);
        })
    }
    else {
      let isEmpty = false;
      let allFinalizedProducts = [];
      rfqDetails.finalizations.map((item) =>
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
        return toast.error("Some required fields may be missing or in negative")
      }
        
      payload = { ...payload, products: updatedProducts };

      setsubmitLoading(true);
      sendQuotation(payload, token)
        .then((res) => {
          setsubmitLoading(false);
          toast.success("Quote sent Successfully...!");
          router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        })
        .catch((err) => {
          setsubmitLoading(false);
          // Display error message from backend
          const errorMessage = err.response?.data?.message || "Unable to send quote. Please try again.";
          toast.error(errorMessage);
        });
    }
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
    rfqDetails.finalizations.map((item) =>
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
      console.log(error)
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
                            <th>Base Price</th>
                            <th>Freight</th>
                            <th>Package</th>
                            <th>Taxes</th>
                            <th>Total</th>
                            <th>Vendor Comments</th>
                            <th>Delivery Period</th>
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
                            {/* <td>
                            <PlaceholderLoading
                              shape="rect"
                              width={50}
                              height={20}
                            />
                          </td> */}
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
            <div className="row">
              <div className="col-md-12">
                <div className="quote-sec-table">
                  <div className="quote-sec-table-top">
                    <h3 className="title">RFQ No. #{rfqDetails.rfq_no}</h3>
                    <div className="row">

                      {/* RFQ Details Section */}
                      <div className="col-md-4 col-xs-12">
                        {rfqDetails?.company_name && (
                          <p>
                            <b>Buyer</b> : {rfqDetails?.company_name}.
                          </p>
                        )}
                        {rfqDetails?.contact_name && (
                          <p>
                            <b>Contact Person</b> : {rfqDetails?.contact_name}
                          </p>
                        )}
                        {rfqDetails?.response_email && (
                          <p>
                            <b>Email</b> : {rfqDetails?.response_email}
                          </p>
                        )}
                        {rfqDetails?.contact_number && (
                          <p>
                            <b>Contact Number</b> :
                            {rfqDetails?.contact_number}
                          </p>
                        )}
                      </div>

                      {/* Global Inputs Section */}
                      <div className="col-md-4 col-xs-12 ">
                        <h3 className="fs-6 fw-semibold mb-2">
                          Global Costing
                        </h3>
                        <div className="row mb-4">
                          <div className="inputBox form-group col-4">
                            <label>Freight</label>
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              value={globalFreight}
                              placeholder={chargesMode.freight.global == "percentage" ? "3%" : "₹950"}
                              onChange={(e) => {setglobalFreight(e.target.value || "")}}
                              onWheel={(e) => e.target.blur()}
                            />
                            <PercentageAbsoluteToggle
                              currentMode={
                                chargesMode.freight.global
                              }
                              onToggle={(value) => {
                                setChargesMode((prev) => ({
                                  ...prev,
                                  freight: {
                                    ...prev.freight,
                                    global: value,
                                  },
                                }));
                              }}
                            />
                          </div>
                          <div className="inputBox form-group col-4">
                            <label>Packaging</label>
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              value={globalPackaging}
                              placeholder={chargesMode.package.global == "percentage" ? "4%" : "₹1450"}
                              onChange={(e) => setglobalPackaging(e.target.value || "")}
                              onWheel={(e) => e.target.blur()}
                            />
                            <PercentageAbsoluteToggle
                              currentMode={
                                chargesMode.package.global
                              }
                              onToggle={(value) => {
                                setChargesMode((prev) => ({
                                  ...prev,
                                  package: {
                                    ...prev.package,
                                    global: value,
                                  },
                                }));
                              }}
                            />
                          </div>
                          <div className="inputBox form-group col-4">
                            <label>TAX</label>
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              value={globalTax}
                              placeholder={chargesMode.tax.global == "percentage" ? "18%" : "₹18940"}
                              onChange={(e) => setglobalTax(e.target.value || "")}
                              onWheel={(e) => e.target.blur()}
                            />
                            <PercentageAbsoluteToggle
                              currentMode={
                                chargesMode.tax.global
                              }
                              onToggle={(value) => {
                                setChargesMode((prev) => ({
                                  ...prev,
                                  tax: {
                                    ...prev.tax,
                                    global: value,
                                  },
                                }));
                              }}
                            />
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-md-12 col-lg-6 pe-2 mb-4">
                            <h3 className="fs-6 fw-semibold mb-2">Payment Terms</h3>
                            <div className="inputBox form-group">
                              <textarea
                                type="text"
                                className="form-control"
                                value={globalPaymentTerms}
                                placeholder="100% Against Proforma Invoice"
                                onChange={(e) =>
                                  setglobalPaymentTerms(e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="col-md-12 col-lg-6 pe-2 mb-4">
                            <h3 className="fs-6 fw-semibold mb-2">Global Comment</h3>
                            <div className="inputBox form-group">
                              <textarea
                                type="text"
                                className="form-control"
                                value={globalComment}
                                placeholder="Placeholder text for global comment"
                                onChange={(e) => setglobalComment(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-lg-1"></div>

                      {/* Global File Upload Section */}
                      <div className="col-md-6 col-lg-3">
                        <h3 className="fs-6 fw-semibold mb-2">Quote Document</h3>

                        {previousGlobalFiles && previousGlobalFiles.length > 0 &&
                          <div className="border rounded-2 px-2 mb-2">
                            <p className="fw-medium text-sm text-center mb-1 ">Previously Uploaded Files</p>
                            <div className="row">
                              {previousGlobalFiles.map((prev_file) => {
                                return (
                                  <div key={prev_file} className="col-md-6">
                                    <a href={prev_file} target="_blank" className="page-link text-truncate mb-1" style={{ maxWidth: "200px" }}>
                                      <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
                                      {extractfileName(prev_file)}
                                    </a>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        }

                        <label className="upload uploadInlineFile d-flex align-items-center justify-content-center mb-1">
                          <FontAwesomeIcon icon={faFile} className="me-2" /> Upload Quotation Document
                          <input
                            type="file"
                            accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                            onChange={(e) => uploadGlobalDocumentFiles(e)}
                            multiple={true}
                          />
                        </label>


                        <div className="row">
                          {globalDocumentFiles && globalDocumentFiles.length > 0 && (
                            globalDocumentFiles.map((doc_file) => {
                              return (
                                <div key={doc_file} className="col-md-6 d-flex justify-content-center align-items-center gap-2 mb-1">
                                  <a href={doc_file} className="page-link text-truncate" target="_blank" style={{ maxWidth: "140px" }}>{extractfileName(doc_file)}</a>
                                  <span className="btn-close btn-close-sm"
                                    aria-label="Close"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      removeGlobalFiles(doc_file)
                                    }}>
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                  <div className="table-responsive">
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Sl No.</th>
                            <th>Item</th>
                            <th>Qty</th>
                            {/* <th>Unit</th> */}
                            <th>Base Price</th>
                            <th>
                              Freight
                            </th>
                            <th>
                              Packaging
                            </th>
                            <th>
                              Taxes
                            </th>
                            <th>Total</th>
                            {currentLowest ? <th>Current Lowest</th> : null}
                            <th>Product Specific Comments</th>
                            <th>
                              Delivery Period <small>(In Days)</small>
                            </th>
                            <th>Add Documents</th>
                            {alreadyQuoted ? <th>Previous Documents</th> : null}
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
                                const isTechEvalPendingOrRejected = showTechEvalRestrictions &&
                                                                   techStatus &&
                                                                   techStatus.has_tech_eval === true &&
                                                                   techStatus.is_accepted !== true;


                                return (
                                  <tr
                                    key={`q_${item.id}_${item.product_id}_${item.variant}}`}
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
                                    </td>
                                    <td>
                                      {`${getProductSpecValueByTitle(
                                        item?.product_specs,
                                        "Quantity"
                                      )} - ${getProductSpecValueByTitle(
                                        item?.product_specs,
                                        "Unit"
                                      )}`}
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        name=""
                                        id=""
                                        placeholder="₹"
                                        value={quoteProducts[index].unit_price}
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
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        name=""
                                        id=""
                                        placeholder={
                                          chargesMode.freight[item.id] ==
                                          "percentage"
                                            ? "%"
                                            : "₹"
                                        }
                                        value={
                                          quoteProducts[index].freight_price ||
                                          ""
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
                                        disabled={isTechEvalPendingOrRejected}
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
                                            value,
                                          );
                                        }}
                                      />
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Not accepted
                                        </small>
                                      )}
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        name=""
                                        id=""
                                        placeholder={
                                          chargesMode.package[item.id] ==
                                          "percentage"
                                            ? "%"
                                            : "₹"
                                        }
                                        value={
                                          quoteProducts[index].package_price ||
                                          ""
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
                                            ),
                                          )
                                        }
                                        onWheel={(e) => e.target.blur()}
                                        disabled={isTechEvalPendingOrRejected}
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
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Not accepted
                                        </small>
                                      )}
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        min={0}
                                        name=""
                                        id=""
                                        placeholder={
                                          chargesMode.tax[item.id] ==
                                          "percentage"
                                            ? "%"
                                            : "₹"
                                        }
                                        value={quoteProducts[index].tax || ""}
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
                                        disabled={isTechEvalPendingOrRejected}
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
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Not accepted
                                        </small>
                                      )}
                                    </td>

                                    <td>
                                      <input
                                        type="number"
                                        name=""
                                        id=""
                                        placeholder="₹"
                                        value={quoteProducts[index].total_price}
                                        disabled
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
                                        style={{ width: 150 }}
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
                                    {alreadyQuoted && (
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
                                    )}
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
                        {pageType != "update-quote" &&

                          <button
                            type="submit"
                            className="btn btn-primary"
                            onClick={() => setregretModal(true)}
                          >
                            Regret Quote
                          </button>
                        }
                      </div>
                      <div className="col-md-6">
                        {/* Changes by Agnij 2024-07-30 [Disable send quote button when no fields are filled] */}
                        <button
                          type="submit"
                          className="btn btn-secondary float-end"
                          onClick={handleSendQuote}
                          disabled={!isAnyFieldFilled()}
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
        </section>
      )}
      <RegretQuoteReasonModal
        handleRegretReason={handleRegretQuote}
        showModal={regretModal}
        closeModal={() => {
          setregretModal(false);
        }}
      />
    </>
  );
};

export default SendQuotePageComp;
