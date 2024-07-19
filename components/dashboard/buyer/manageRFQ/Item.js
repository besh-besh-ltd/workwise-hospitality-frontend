import Loader from "@/components/shared/Loader";
import { sendReminder } from "@/services/rfq";
import moment from "moment";
import Link from "next/link";
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";

const RFQItem = ({ data }) => {
  const [loading, setloading] = useState(false);
  const list_products = () => {
    let productTitles = [];

    if (data?.products && data?.products?.length > 0) {
      data.products.map((item) => {
        if (item?.product_details && item?.product_details?.length > 0) {
          let n = item?.product_details[0].name;
          if (!productTitles.includes(n)) {
            productTitles.push(n);
          }
        }
      });

      return (
        <span className="mproducts">
          {productTitles.length > 0 ? productTitles.join(",") : "---"}
        </span>
      );
    }
  };
  const handlereminder = (e) => {
    e.preventDefault();
    setloading(true);
    sendReminder(data.id)
      .then((res) => {
        setloading(false);
        //alert(res.message)
        if (res.message && res.message != "") {
          toast.success(res.message);
        }
      })
      .catch((err) => {
        setloading(false);
      });
  };
  return (
    <>
      <tr>
        <td>{data?.rfq_no}</td>
        {/* <td>Piping</td> */}
        <td>{list_products()}</td>
        <td>{moment(data.timestamp).format("DD/MM/YYYY")}</td>
        <td>
          {data.bid_end_date != ""
            ? moment(data.bid_end_date).format("DD/MM/YYYY")
            : "--"}
        </td>
        <td>{data.status == 1 ? "Open" : "Closed"}</td>
        <td>
          <span>
            <Link
              href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data?.id}`}
              className="page-link"
            >
              View
            </Link>
          </span>
          <span>
            {data.vendors.length > 0 &&
              data.vendors[0].total_vendors >
                data.vendors[0].quote_received && (
                <Link
                  href="#"
                  onClick={handlereminder}
                  className="page-link-btn"
                >
                  {!loading &&
                    `Send Reminder For Quote (${
                      data.vendors[0].total_vendors -
                      data.vendors[0].quote_received
                    }/${data.vendors[0].total_vendors})`}
                  {loading && (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                      ></span>{" "}
                      Processing request...
                    </>
                  )}
                </Link>
              )}
          </span>
        </td>
      </tr>
      <ToastContainer />
    </>
  );
};

export default RFQItem;
