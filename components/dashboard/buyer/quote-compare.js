import React, { useEffect, useState } from "react";
import Link from "next/link";
import FullLoader from "@/components/shared/FullLoader";
import {
  closeRFQ,
  downloadQuotesDetails,
  finalizeQuotation,
  getQuotes,
  getRFQS,
} from "@/services/rfq";
import { useRouter } from "next/router";
import * as XLSX from "xlsx-js-style";
import QuoteCompareTable from "@/components/dashboard/buyer/quote-compare-table";
import Loader from "@/components/shared/Loader";
import OverallComparison from "./overallComparison";
import { formatPrice } from "@/utils/sharedFunctions";
import PlaceholderLoading from "react-placeholder-loading";
import { toast } from "react-toastify";

const QuoteCompare = () => {
  const router = useRouter();
  const { rfq } = router.query;
  const [loading, setloading] = useState(false);
  const [quotesLoading, setquotesLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [closeRFqLoading, setcloseRFqLoading] = useState(false);
  const [finalizeLoading, setfinalizeLoading] = useState(false);
  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(100);
  const [myRFQs, setmyRFQs] = useState([]);
  const [totalRFQs, settotalRFQs] = useState(0);
  const [showing, setshowing] = useState(0);
  const [currentRFQ, setcurrentRFQ] = useState(null);
  const [quotes, setquotes] = useState([]);
  const [showOverallComparison, setshowOverallComparison] = useState(true);
  const [l1total, setl1total] = useState(0);
  const [hasMoreQuotes, sethasMoreQuotes] = useState(true);
  const [TA_Filter, setTA_Filter] = useState(false);


  useEffect(() => {
    if (rfq) {
      getRespectiveQuotes();
    }
  }, [TA_Filter]);

  useEffect(() => {
    if (rfq)
      getRespectiveQuotes();

  }, [router]);

  useEffect(() => {
    getAllRFQs();
  }, [page]);


  const handleTAFilterChange = (e) => {
    setTA_Filter(e.target.checked);
  }

  const loadMoreRFQs = (e) => {
    e.preventDefault();
    if (hasMoreQuotes) {
      setpage((prevPage) => prevPage + 1);
    }
  };

  const getAllRFQs = () => {
    setloading(true);
    getRFQS({ page, sort: "DESC", project_id: -1, reverse_auction: '-1', rfq_type: "", limit })
      .then((res) => {
        setloading(false);
        const newData = res.data?.filter((rItem) => rItem?.quotes?.length > 0);
        setmyRFQs((prevRFQs) => [...prevRFQs, ...newData]);

        if (page >= Math.ceil(res.total_items / limit)) {
          sethasMoreQuotes(false);
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setloading(false);
      })
  };

  const getRespectiveQuotes = () => {
    setquotesLoading(true);
    setquotes([]);
    getQuotes(rfq, TA_Filter)
      .then((res) => {
        const rfq_details = myRFQs.find((rfq_item) => rfq_item.id == rfq);
        setcurrentRFQ(rfq_details);
        setquotes(res.data);
      })
      .catch((err) => {
      })
      .finally(() => {
        setquotesLoading(false);
      })
  };

  const calculateLowestQuote = () => {
    quotes.map((item) => {
      lowest = item.quotations.reduce((lowest, currentItem) => {
        return currentItem.total_price < lowest.total_price ? currentItem : lowest;
      }, item.quotations[0]);

      // Mark the lowest quotation
      item.quotations.map((q) => {
        q.is_lowest = q.quote_id === lowest?.quote_id || false;
      });
    });
    setquotes(quotes);
  };

  const getDeliveryRange = (items) => {
    if (items && items.length > 0) {
      // Find the smallest number
      let smallest = Math.min(...items);

      // Find the largest number
      let largest = Math.max(...items);

      return `Within ${smallest || 0} - ${largest || 0} Weeks`;
    } else {
      return "-";
    }
  };

  const handleDownloadQuote = async (e) => {
    e.preventDefault();
    setDownloadLoading(true);

    try {
      const res = await downloadQuotesDetails(rfq);
      generateExcelFile(res.data);
    } catch (error) {
      console.log(error);
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
      heading_array[0].push(`${item.organization_name || item.name}`);
      heading_array[0].push("");
      heading_array[0].push("");
      heading_array[0].push("");
      heading_array[0].push("");

      amount_array.push("Unit Rate");
      amount_array.push("Freight(%)");
      amount_array.push("Packaging(%)");
      amount_array.push("GST(%)");
      amount_array.push("Total Amount");

      paymentTermsArray.push(
        item.global_payment_term[0].details
          ? item.global_payment_term[0].details
          : "-"
      );
      paymentTermsArray.push("");
      paymentTermsArray.push("");
      paymentTermsArray.push("");
      paymentTermsArray.push("");

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
    });

    allVendors.map((vendor) => {
      let vq = [];
      let total = 0;
      api_data.map((product) => {
        let q = product.quotations.filter(
          (quotation) =>
            quotation.created_by == vendor.id &&
            quotation.id != null &&
            quotation.is_regret != 1
        );
        if (q.length > 0) {
          vq.push(parseInt(q[0].quote_details[0].delivery_period));
          total = total + parseInt(q[0].quote_details[0].total_price);
        }
      });
      vendor.total = total;
      vendor.quoted_products = vq;
    });
    // Lowest
    heading_array[0].push("LOWEST");
    amount_array.push("");

    let data = heading_array;
    data.push(amount_array);
    let totalQty = 0;

    api_data.map((item, index) => {
      let qq = api_data[index]?.quotations.filter((qi) => qi.id != null);

      totalQty = totalQty + parseInt(qq[0]?.quote_details[0]?.quantity);
      let temp_arr = [
        item.product_details[0].name,
        item.product_specs.find((specItem) => specItem.title == 'Spec')?.value || "-",
        item.product_specs.find((specItem) => specItem.title == 'Size')?.value || "-",
        qq[0]?.quote_details[0]?.quantity,
      ];

      const array = item.quotations.filter(
        (item) => item.id != null && item.is_regret != 1
      );

      let lowest = null;

      if (array.length === 1) {
        // Handle single-element case
        if (array[0].quote_details[0].total_price > 0) {
          lowest = array[0];
        } else {
          lowest = null;
        }
      } else {
        // Reduce logic for multiple elements
        lowest = array.reduce((lowest, currentItem) => {
          if (currentItem.quote_details[0].total_price > 0) {
            return currentItem.quote_details[0].total_price <
              lowest.quote_details[0].total_price
              ? currentItem
              : lowest;
          }
          return lowest;
        }, array[0]);
      }

      if (lowest) {
        l1totaltemp = l1totaltemp + lowest.quote_details[0].total_price;
        setl1total(l1totaltemp);

        item.quotations.map((q) => {
          if (q.id == lowest.id) {
            q.is_lowest = true;
          } else {
            q.is_lowest = false;
          }
        });
      }

      item.quotations.map((q) => {
        if (q.is_regret == 1) {
          temp_arr.push("0");
          temp_arr.push("0");
          temp_arr.push("0");
          temp_arr.push("0");
          temp_arr.push("0");
        } else {
          temp_arr.push(
            q.quote_details.length > 0 ? q.quote_details[0].unit_price : "0"
          );
          temp_arr.push(
            q.quote_details.length > 0
              ? q.quote_details[0].freight_price + "%"
              : "0"
          );
          temp_arr.push(
            q.quote_details.length > 0
              ? q.quote_details[0].package_price + "%"
              : "0"
          );
          temp_arr.push(
            q.quote_details.length > 0 ? q.quote_details[0].tax + "%" : "0"
          );
          temp_arr.push(
            q.quote_details.length > 0
              ? `${q.quote_details[0].total_price} ${q.is_lowest ? "(Lowest)" : ""
              }`
              : "-"
          );
        }
      });
      temp_arr.push(lowest ? lowest.quote_details[0].total_price : "-");
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
      emptyArr.push("");
      l1array.push("");
      l1array.push("");
      l1array.push("");
      l1array.push("");
      l1array.push("");

      deliveryArray.push(
        item?.quoted_products && item?.quoted_products?.length == 1
          ? `Within ${item.quoted_products[0] == 1
            ? item.quoted_products[0] || 0 + "Week"
            : item.quoted_products[0] || 0 + " Weeks"
          }`
          : `${getDeliveryRange(item.quoted_products)}`
      );
      deliveryArray.push("");
      deliveryArray.push("");
      deliveryArray.push("");
      deliveryArray.push("");

      totalArray.push("");
      totalArray.push("");
      totalArray.push("");
      totalArray.push("");
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
          ? item[0].file_url
          : "-"
      );
      filesArray.push("");
      filesArray.push("");
      filesArray.push("");
      filesArray.push("");
    })

    data.push(filesArray);
    for (let i = 1; i < maxFileLen; i++) {
      let temp = ["", "", "", ""];
      globalFiles.map((fileArr) => {
        if (fileArr && fileArr[i])
          temp = [...temp, fileArr[i].file_url, "", "", "", ""]
        else temp = [...temp, "-", "", "", "", ""]
      })
      data.push(temp);
    }


    const ws = XLSX.utils.aoa_to_sheet(data);
    const width = 25; // Width in characters (adjust according to your requirement)
    const range = XLSX.utils.decode_range(ws["!ref"]);

    // MERGE l1 row
    {
      let columnToMergeStart = 4; // Index of the first column to merge
      let columnToMergeEnd = allVendors.length * 5 + 3; // Index of the last column to merge

      const mergeRange = {
        s: { r: api_data.length + 7, c: columnToMergeStart }, // Start cell (first row, first column)
        e: { r: api_data.length + 7, c: columnToMergeEnd }, // End cell (first row, second column)
      };

      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push(mergeRange);

      for (let col = range.s.c; col < range.e.c - 1; col++) {
        const cellAddress = XLSX.utils.encode_cell({
          r: api_data.length + 7,
          c: col,
        }); // First row, current column
        if (!ws[cellAddress]) ws[cellAddress] = {};
        if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style

        //ws[cellAddress].s ={ fill: { fgColor: { rgb: "DDDDDD" } } }
        ws[cellAddress].s.fill = { fgColor: { rgb: "DDDDDD" } }; // Blue background color
        ws[cellAddress].s.font = { color: { rgb: "000000" } }; // White text color
      }
    }

    // Align all text to the center
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style
        ws[cellAddress].s.alignment = {
          horizontal: "center",
          wrapText: true,
          vertical: "center",
        }; // Text align right
      }
    }

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // First row, current column

      if (!ws["!cols"]) ws["!cols"] = [];
      const cell = ws[cellAddress];

      // Assign specific widths to the first three columns
      if (col === 0 || col === 2) {
        ws["!cols"][col] = { width: 30 };
      } else if (col === 1) {
        ws["!cols"][col] = { width: 60 };
      } else if (col === 3) {
        ws["!cols"][col] = { width: 15 };
      } else {
        ws["!cols"][col] = { width };
        cell.s.alignment = { horizontal: "center" }; // Center align text
      }

      if (!cell) ws[cellAddress] = {};
      if (!cell.s) cell.s = {}; // Cell style
    }

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col }); // First row, current column
      if (!ws["!cols"]) ws["!cols"] = [];
      if (col >= 3) {
        const cell = ws[cellAddress];
        if (!cell) ws[cellAddress] = {};
        if (!cell.s) cell.s = {}; // Cell style
        cell.s.alignment = { horizontal: "center" }; // Center align text
      }
    }

    // MERGE Heading
    for (let i = 4; i < allVendors.length * 5 + 2; i += 5) {
      let columnToMergeStart = i; // Index of the first column to merge
      let columnToMergeEnd = i + 4; // Index of the last column to merge

      const mergeRange = {
        s: { r: 0, c: columnToMergeStart }, // Start cell (first row, first column)
        e: { r: 0, c: columnToMergeEnd }, // End cell (first row, second column)
      };
      const mergeRangeDelivery = {
        s: { r: api_data.length + 8, c: columnToMergeStart }, // Start cell (first row, first column)
        e: { r: api_data.length + 8, c: columnToMergeEnd }, // End cell (first row, second column)
      };
      const mergeRangePaymentTerms = {
        s: { r: api_data.length + 9, c: columnToMergeStart }, // Start cell (first row, first column)
        e: { r: api_data.length + 9, c: columnToMergeEnd }, // End cell (first row, second column)
      };
      const mergeRangeComments = {
        s: { r: api_data.length + 10, c: columnToMergeStart }, // Start cell (first row, first column)
        e: { r: api_data.length + 10, c: columnToMergeEnd }, // End cell (first row, second column)
      };
      const mergeRangeFiles = {
        s: { r: api_data.length + 11, c: columnToMergeStart }, // Start cell (first row, first column)
        e: { r: api_data.length + 11, c: columnToMergeEnd }, // End cell (first row, second column)
      };

      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push(mergeRange);
      ws["!merges"].push(mergeRangeDelivery);
      ws["!merges"].push(mergeRangePaymentTerms);
      ws["!merges"].push(mergeRangeComments);
      ws["!merges"].push(mergeRangeFiles);

      for (let i = 1; i < maxFileLen; i++) {
        const mergeConfig = {
          s: { r: api_data.length + 11 + i, c: columnToMergeStart }, // Start cell (first row, first column)
          e: { r: api_data.length + 11 + i, c: columnToMergeEnd }, // End cell (first row, second column)
        }
        if (!ws["!merges"]) ws["!merges"] = [];
        ws["!merges"].push(mergeConfig);
      }
    }

    // Packaging & Fright column width
    for (let i = 6; i < allVendors.length * 5 + 2; i += 5) {
      if (!ws["!cols"]) ws["!cols"] = [];
      ws["!cols"][i - 2] = { width: 10 };
      ws["!cols"][i - 1] = { width: 10 };
      ws["!cols"][i] = { width: 12 };
      ws["!cols"][i + 1] = { width: 10 };
      ws["!cols"][i + 2] = { width: 14 };
    }

    if (!ws["!merges"]) ws["!merges"] = [];

    // Merge two rows of first 4 columns
    const columns = 4;
    for (let c = 0; c < columns; c++) {
      const mergeConfig = {
        s: { r: 0, c }, // Start cell
        e: { r: 1, c }, // End cell
      };
      ws["!merges"].push(mergeConfig);
    }
    ws["!merges"].push({
      s: { r: 0, c: range.e.c }, // Start cell
      e: { r: 1, c: range.e.c }, // End cell
    });

    for (let row = range.s.r; row <= range.e.r; row++) {
      const col = 0; // Column A
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style
      if (row > 1) {
        // Skip A1 and A2
        ws[cellAddress].s.alignment = {
          horizontal: "left",
          vertical: "center",
        }; // Text align left
      }
    }

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cellValue = ws[cellAddress] ? ws[cellAddress].v : ""; // Cell value

        if (cellValue === "-") {
          // Set red color for cells with "N/A"
          if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style
          ws[cellAddress].s.font = { bold: true, color: { rgb: "FF0000" } };
        }
      }
    }

    // Bold footer items
    for (
      let i = 2 + api_data.length + 4;
      i < 2 + api_data.length + 4 + 6;
      i++
    ) {
      const cellAddress = XLSX.utils.encode_cell({ r: i, c: 0 }); // First row, current column
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style

      // ws[cellAddress].s.fill = { fgColor: { rgb: "DDDDDD" } }; // Blue background color
      ws[cellAddress].s.font = { bold: true }; // White text color
    }

    // Apply vertical center alignment to merged cells
    const mergedCellAddresses = ["A1", "A2", "B1", "B2"];
    mergedCellAddresses.forEach((cellAddress) => {
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style
      ws[cellAddress].s.alignment = {
        vertical: "center",
        horizontal: "center",
      }; // Center alignment
    });

    // BOLD
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // First row, current column
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style
      ws[cellAddress].s.font = { bold: true }; // Make text bold
      ws[cellAddress].s.alignment = {
        wrapText: true,
        horizontal: "center",
        vertical: "center",
      }; // Text align left

      // Bold second heading
      if (col >= 4 && col < range.e.c) {
        const cellAddress2 = XLSX.utils.encode_cell({ r: 1, c: col }); // First row, current column
        if (!ws[cellAddress2]) ws[cellAddress2] = {};
        if (!ws[cellAddress2].s) ws[cellAddress2].s = {}; // Cell style
        ws[cellAddress2].s.font = { bold: true, sz: 9 }; // Make text bold
      }
    }

    // BORDER
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style
        ws[cellAddress].s.border = {
          top: { style: "thin", color: { auto: 1 } },
          bottom: { style: "thin", color: { auto: 1 } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } },
        };
      }
    }

    // Side border
    for (let i = 4; i < allVendors.length * 5 + 4; i += 5) {
      for (let j = 0; j < api_data.length + 6 + 1; j++) {
        // borders
        const cellAddress = XLSX.utils.encode_cell({ r: j, c: i });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style
        ws[cellAddress].s.border = {
          right: { style: "thin" },
          top: { style: "thin" },
          left: { style: "thick" },
          bottom: { style: "thin" },
        };
      }
    }

    // String type
    // for (let row = range.s.r; row <= range.e.r; row++) {
    //   for (let col = range.s.c; col <= range.e.c; col++) {
    //     const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    //     if (!ws[cellAddress]) ws[cellAddress] = {}; // Ensure cell exists
    //     ws[cellAddress].t = 's'; // Set cell type to string
    //   }
    // }

    // color
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // First row, current column
      if (!ws[cellAddress]) ws[cellAddress] = {};
      if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style

      ws[cellAddress].s.fill = { fgColor: { rgb: "DDDDDD" } }; // Blue background color
      ws[cellAddress].s.font = { color: { rgb: "000000" }, sz: 12, bold: true }; // White text color
    }

    // Add File Links
    let fileRow = 2 + api_data.length + 9;

    for (let row_i = fileRow; row_i < fileRow + maxFileLen; row_i++) {
      if (!ws["!rows"]) ws["!rows"] = [];
      ws["!rows"][row_i] = { hpx: 35 };

      for (let col = 4; col <= api_data.length * 5 + 4; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row_i, c: col }); // file row, current column
        if (!ws[cellAddress]) ws[cellAddress] = {};
        if (!ws[cellAddress].s) ws[cellAddress].s = {}; // Cell style

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
          }
        }
      }
    }

    // Merge maxFileLen rows of first 4 columns
    if (maxFileLen > 1) {
      for (let c = 0; c < columns; c++) {
        const mergeConfig = {
          s: { r: fileRow, c }, // Start cell
          e: { r: fileRow + maxFileLen - 1, c }, // End cell
        };
        ws["!merges"].push(mergeConfig);
      }
    }


    // FORMULA
    // for (let row = 2; row < 2 + api_data.length; row++) {
    //   let row_numb = row + 1;

    //   for (let col = 5; col <= range.e.c; col += 5) {
    //     let qty_cell = `${excelColumnName(4)}${row_numb}`;
    //     let unit_price_cell = `${excelColumnName(col)}${row_numb}`;
    //     let freight_cell = `${excelColumnName(col + 1)}${row_numb}`;
    //     let packaging_cell = `${excelColumnName(col + 2)}${row_numb}`;
    //     let gst_cell = `${excelColumnName(col + 3)}${row_numb}`;

    //     const total_cellAddress = XLSX.utils.encode_cell({
    //       r: row_numb - 1,
    //       c: col + 3,
    //     }); // First row, current column
    //     let total_cell = ws[total_cellAddress];

    //     const formula = `TRUNC((${qty_cell} * ${unit_price_cell}) + ((${qty_cell} * ${unit_price_cell}) * ${freight_cell})+ ((${qty_cell} * ${unit_price_cell}) * ${packaging_cell}) + ((${qty_cell} * ${unit_price_cell}) * ${gst_cell}),0)`;
    //     total_cell.f = formula;
    //   }
    // }

    // Total Formula
    // {
    //   let total_row = 2 + api_data.length + 4 + 1;
    //   for (let col = 4; col <= range.e.c + 1; col += 5) {
    //     let col_n = excelColumnName(col);
    //     let col_formula = "";
    //     for (let row = 3; row <= 2 + api_data.length; row++) {
    //       if (col_formula != "") {
    //         col_formula = `${col_formula}+${col_n}${row}`;
    //       } else {
    //         col_formula = `${col_n}${row}`;
    //       }
    //     }
    //     const total_cellAddress = XLSX.utils.encode_cell({
    //       r: total_row - 1,
    //       c: col - 1,
    //     });
    //     let total_cell = ws[total_cellAddress];
    //     total_cell.f = `TRUNC(${col_formula},0)`;
    //   }
    // }

    // Lowest formula
    // {
    //   for (let row = 2; row < 2 + api_data.length; row++) {
    //     let row_numb = row + 1;
    //     let row_cols = [];
    //     for (let col = 9; col <= range.e.c + 1; col += 5) {
    //       let cellAddressTemp = XLSX.utils.encode_cell({ r: row, c: col - 1 });

    //       const cellValue = ws[cellAddressTemp] ? ws[cellAddressTemp].v : 0; // Cell value

    //       if (parseInt(cellValue) > 0) {
    //         let total_cell = `${excelColumnName(col)}${row_numb}`;
    //         row_cols.push(total_cell);
    //       }
    //     }

    //     let low_cell = XLSX.utils.encode_cell({
    //       r: row_numb - 1,
    //       c: range.e.c,
    //     });
    //     let low_cell_address = ws[low_cell];
    //     let d = `MIN(${row_cols.join(",")})`;

    //     low_cell_address.f = `${d}`;
    //   }
    // }

    // L1 total Formula
    // {
    //   const l1value = XLSX.utils.encode_cell({ r: api_data.length + 7, c: 4 }); // First row, current column
    //   const l1valuecell = ws[l1value];
    //   let start_col = `${excelColumnName(range.e.c + 1)}3`;
    //   let end_col = `${excelColumnName(range.e.c + 1)}${api_data.length + 2}`;
    //   l1valuecell.f = `SUM(${start_col}:${end_col})`;
    // }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    try {
      const filename = `${Date.now()}.xlsx`;
      XLSX.writeFile(wb, filename);
      setDownloadLoading(false);
    } catch (error) {
      console.error("Error generating Excel file:", error);
    }
  };

  const generateExcelFileOld = (data) => {
    if (data.length > 0) {
      setDownloadLoading(true);
      // Create a new workbook
      let workbook = XLSX.utils.book_new();

      data.map((rfqItem) => {
        if (rfqItem?.id) {
          let sheetData = [
            [
              "Vendon Name",
              "Organization Name",
              "Vendor Email",
              "Vendor Mobile",
              "Product Name",
              "Unit Price",
              "Package Price",
              "Tax",
              "Freight Price",
              "Total Price",
              "Comment",
              "Delivery Period",
            ],
          ];

          if (rfqItem?.quotations.length > 0) {
            rfqItem?.quotations.map((item) => {
              sheetData.push([
                "" + item?.vendor_details[0]?.name,
                "" + item?.vendor_details[0]?.organization_name,
                "" + item?.vendor_details[0]?.email,
                "" + item?.vendor_details[0]?.mobile,
              ]);

              if (item.products.length > 0) {
                item?.products.map((productItem) => {
                  sheetData.push([
                    "",
                    "",
                    "",
                    "",
                    productItem.product_name,
                    productItem.unit_price,
                    productItem.package_price,
                    productItem.tax,
                    productItem.freight_price,
                    productItem.total_price,
                    productItem.comment,
                    productItem.delivery_period,
                  ]);
                });
              }
            });
          }
          // Add sheet1 to the workbook
          const sheet = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(
            workbook,
            sheet,
            `RFQ #${rfqItem?.rfq_no}`
          );
        }
      });

      // Generate a binary string from the workbook
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Convert binary string to a Blob
      const blob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `RFQ_details_${Date.now()}.xlsx`;
      a.download = filename;
      document.body.appendChild(a);

      // Trigger the download
      a.click();
      setDownloadLoading(false);

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 0);
    }
  };

  const excelColumnName = (columnNumber) => {
    let result = "";
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return result;
  };

  const FilterOutGlobalTermsFiles = (all_data) => {

    let fileObj = all_data.map((item) => {
      return (
        item.quotations &&
        item.quotations.length > 0 &&
        item.quotations.map((quoteItem) => {
          return quoteItem.quote_details[0]?.document_files;
        })
      );
    })
    return fileObj[0] || null;
  }

  const handleRFqClose = (e) => {
    setcloseRFqLoading(true);
    e.preventDefault();
    closeRFQ(rfq)
      .then(() => {
        getRespectiveQuotes();
        setcloseRFqLoading(false);
      })
      .catch((err) => {
        setcloseRFqLoading(false);
      });
  };

  const handleFinalize = (e, item, proditem) => {
    e.preventDefault();
    setfinalizeLoading(true);
    const payload = {
      rfq_id: proditem.rfq_id,
      rfq_no: proditem.rfq[0].rfq_no,
      product_id: proditem.product_id,
      vendor_id: item.quote_details.created_by,
      quote_id: item.quote_id,
      variant: proditem.variant
    };

    finalizeQuotation(payload)
      .then((res) => {
        setfinalizeLoading(false);
        //toast.success("You've finalized vendor for this product!")
        getRespectiveQuotes();
      })
      .catch((err) => {
        setfinalizeLoading(false);
        console.log(err);
      });
  };

  const handleOverallComparison = (e) => {
    e.preventDefault();
    setshowOverallComparison(!showOverallComparison);
  };

  const handleOverallComparisonTab = (e) => {
    e.preventDefault();
    setshowOverallComparison(!showOverallComparison);
  };

  const calculateTotalQuantity = (data) => {
    // Filter items where title is "Quantity"
    const quantities = data.filter((item) => item.title === "Quantity");

    // Extract and sum the quantities
    const totalQuantity = quantities.reduce((total, item) => {
      return total + parseInt(item.value, 10); // Convert value to integer and sum up
    }, 0); // Initial total is 0

    return totalQuantity;
  };

  return (
    <>
      {finalizeLoading && <Loader />}
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Compare Received Quote</h3>
            </div>
            <div className="col-md-6">
              <div className="btn-options float-end">

                {/* Download quote & Close Rfq Buttons */}
                {rfq && showOverallComparison && (
                  <span onClick={handleDownloadQuote}> {downloadLoading ? "Generating Excel file...." : "Download as Excel"} </span>
                )}
                {rfq && quotes && quotes.length > 0 && (
                  <>
                    {quotes[0]?.rfq[0]?.status == 1 &&
                      <span onClick={handleRFqClose}>{closeRFqLoading ? "Processing request..." : "Mark RFQ as Closed"}</span>
                    }
                    {quotes[0]?.rfq[0]?.status == 2 && (
                      <span className="disabled-button">RFQ has been closed</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-2">
              <div className="hasFullLoader">
                <h5 className="title">Quotes Received</h5>
                {!loading && myRFQs && myRFQs.length == 0
                  ? <p style={{ textAlign: 'center' }}>No RFQs yet!</p>
                  :
                  <ul className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                    {myRFQs.map((item) => {
                      return (
                        <li className={`${item.id == rfq ? "active" : ""}`}>
                          <Link href={`/dashboard/buyer/quote-compare/?rfq=${item?.id}`} className={`${item.id == rfq ? "text-white" : "text-dark"}`} > RFQ #{item?.rfq_no} </Link>
                        </li>
                      )
                    }
                    )}

                    {hasMoreQuotes && !loading &&
                      <Link href="#" className="d-flex justify-content-end px-3 pe-auto" onClick={loadMoreRFQs}>
                        <span className="link-primary">...Load More</span>
                      </Link>
                    }

                    {hasMoreQuotes && loading && (
                      <div className="d-flex justify-content-center align-items-center" >
                        Loading ...
                        <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    )}
                  </ul>
                }
              </div>
            </div>

            <div className="col-md-10">


              <div className="quote-sec-table quote-sec-tab">


                {!quotesLoading && currentRFQ &&
                  <div className="mb-3">
                    <h3 className="fs-5 mb-3">
                      <span className="fw-semibold">RFQ No : </span>{currentRFQ.rfq_no}
                    </h3>
                    <hr />

                    <div className="row text-sm ">

                      <div className="col-md-6">
                        <p className="sub-heading mb-0">
                          <b>Company Name</b> :{" "}
                          {currentRFQ.company_name}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Contact Person Name</b> :{" "}
                          {currentRFQ.contact_name}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Response Email</b> :{" "}
                          {currentRFQ.response_email}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Contact Number</b> :{" "}
                          {currentRFQ.contact_number}
                        </p>
                        {currentRFQ.location && currentRFQ.location != "" &&
                          <p className="sub-heading mb-0">
                            <b>Delivery Location</b> :{" "}
                            {currentRFQ.location}
                          </p>}
                      </div>

                      <div className="col-md-6">
                        {currentRFQ.project_name && currentRFQ.project_name != "" &&
                          <p className="sub-heading mb-0">
                            <b>Project Name</b> :{" "}
                            {currentRFQ.project_name}
                          </p>}
                        <p className="sub-heading mb-0">
                          <b>Reverse Auction</b> :{" "}
                          {currentRFQ.reverse_auction == 1 ? "Enabled" : "Disabled"}
                        </p>
                        {currentRFQ.rfq_type && currentRFQ.rfq_type != "" &&
                          <p className="sub-heading mb-0">
                            <b>RFQ Type</b> :{" "}
                            {currentRFQ.rfq_type}
                          </p>}
                        <p className="sub-heading mb-0">
                          <b>Bid End Date</b> :{" "}
                          {currentRFQ.bid_end_date}
                        </p>
                        {currentRFQ.comment && currentRFQ.comment != "" &&
                          <p className="sub-heading mb-0">
                            <b>Comment</b> :{" "}
                            {currentRFQ.comment}
                          </p>}
                      </div>

                    </div>
                  </div>
                }
                {"rfq" in router?.query && (
                  <div className="tabs-container">
                    <Link
                      href="#"
                      className={`tab ${showOverallComparison ? "active" : ""}`}
                      onClick={handleOverallComparisonTab}
                    >
                      Product Wise Comparison
                    </Link>
                    <Link
                      href="#"
                      className={`tab ${!showOverallComparison ? "active" : ""
                        }`}
                      onClick={handleOverallComparisonTab}
                    >
                      Overall Comparison
                    </Link>

                    <div className="form-check ms-auto page-link fs-6">
                      <input
                        className="form-check-input "
                        type="checkbox"
                        value={TA_Filter}
                        id="TA_check"
                        onChange={handleTAFilterChange}
                      />
                      <label className="form-check-label" for="TA_check">
                        View Technically Accepted Vendors
                      </label>
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
                    {quotesLoading && (
                      <div className="quote-sec-table-sub hasFullLoader">
                        {quotesLoading && <FullLoader />}
                      </div>
                    )}
                    {!quotesLoading && quotes.length == 0 && (
                      <div className="quote-sec-table-sub hasFullLoader">
                        <h4>You don't have any quotes.</h4>
                      </div>
                    )}
                    {showOverallComparison && (
                      <OverallComparison rfq_id={rfq} TA_Filter={TA_Filter} />
                    )}
                    {quotes &&
                      quotes.length > 0 &&
                      !showOverallComparison &&
                      quotes.map((item, index) => {
                        return (
                          <div
                            className="quote-sec-table-sub"
                            key={`qq_${index}`}
                          >
                            <div className="row">
                              <div className="col-12">
                                <p className="sub-heading mb-0">
                                  <b>Product</b> :{" "}
                                  {item?.product_details[0]?.product_name}
                                </p>
                                <p className="sub-heading mb-0">
                                  <b>Product Specification</b> :{" "}
                                  {item?.product_details[0]?.rfq_details && item?.product_details[0]?.rfq_details[1]?.value}
                                </p>
                              </div>

                              {item?.last_purchase_rate != null &&
                                <div className="col-12">
                                  <p className="sub-heading mb-0"><b>Last Purchase Details :</b></p>

                                  <div className="sub-heading border rounded-3 p-2">
                                    <div className="row fw-medium mx-2">
                                      <div className="col-md-3 col-lg-2">
                                        <span>Base Price </span>
                                        {loading
                                          ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                          : <span className="d-block fw-medium text-muted ">{formatPrice(item?.last_purchase_rate?.unit_price) || "---"}</span>
                                        }
                                      </div>
                                      <div className="col-md-3 col-lg-2">
                                        <span>Freight Rate </span>
                                        {loading
                                          ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                          : <span className="d-block fw-medium text-muted ">{`${item?.last_purchase_rate?.freight_price}%` || "---"}</span>
                                        }
                                      </div>
                                      <div className="col-md-3 col-lg-2">
                                        <span>Packaging Rate </span>
                                        {loading
                                          ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                          : <span className="d-block fw-medium text-muted ">{`${item?.last_purchase_rate?.package_price}%` || "---"}</span>
                                        }
                                      </div>
                                      <div className="col-md-3 col-lg-2">
                                        <span>Tax </span>
                                        {loading
                                          ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                          : <span className="d-block fw-medium text-muted ">{`${item?.last_purchase_rate?.tax}%` || "---"}</span>
                                        }
                                      </div>
                                      <div className="col-md-3 col-lg-2">
                                        <span>Quantity </span>
                                        {loading
                                          ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                          : <span className="d-block fw-medium text-muted ">{item?.last_purchase_rate?.quantity || "---"}</span>
                                        }
                                      </div>
                                      <div className="col-md-3 col-lg-2">
                                        <span>Total Price </span>
                                        {loading
                                          ? <span className="d-block mt-1"><PlaceholderLoading shape="rect" width={80} height={20} /></span>
                                          : <span className="d-block fw-medium text-muted ">{formatPrice(item?.last_purchase_rate?.total_price) || "---"}</span>
                                        }
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              }

                            </div>
                            <span className="sub-heading">
                              {/*  <b>Requested Quantity </b>:{" "}
                              {calculateTotalQuantity(
                                item?.product_details[0]?.rfq_details
                              )} */}
                              {/* {item?.product_details[0]?.rfq_details[2]?.value} */}
                            </span>

                            {item?.quotations &&
                              item?.quotations.length == 0 && (
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
                                    quantity={
                                      item?.product_details[0]?.rfq_details
                                        ? item?.product_details[0]?.rfq_details[2]?.value
                                        : "-"
                                    }
                                    alreadyFinalized={item?.quotations?.filter((item) => item.finalization != null)}
                                    isRfqClosed={item.rfq[0]?.status == 2 || false}
                                  />
                                </>
                              )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default QuoteCompare;
