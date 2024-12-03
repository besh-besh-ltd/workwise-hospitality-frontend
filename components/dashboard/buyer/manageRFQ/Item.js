import { sendReminder } from "@/services/rfq";
import { textCapitalize } from "@/utils/sharedFunctions";
import moment from "moment";
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "react-toastify";

const RFQItem = ({ data }) => {
  const [loading, setloading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);


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

      const limitedProducts = productTitles.slice(0, 3);
      return (
        <span className="mproducts">
          {limitedProducts.map((title, index) => (
            <React.Fragment key={index}>
              {title}
              <br />
            </React.Fragment>
          ))}
        </span>
      );
    }

    return "---";
  };


  const handlereminder = (e) => {
    e.preventDefault();
    setloading(true);
    sendReminder(data.id)
      .then((res) => {
        if (res.message && res.message != "") {
          toast.success(res.message);
        }
      })
      .catch((err) => {
        if (err?.message?.response?.status === 403)
          toast.warning(err?.message?.response?.data?.message);
        else
          toast.error(err?.message?.response?.data?.message);
      })
      .finally(() => {
        setloading(false);
      })
  };
  const isRecievedFromAll = data.vendors[0]?.total_vendors == data.vendors[0]?.quote_received;

  return (
    <>
      <tr>
        <td>
          <span className="d-block fw-semibold">{data?.rfq_no}</span>
          <span className="text-truncate">{data?.project_name}</span>
        </td>
        <td>{list_products()}</td>
        <td style={{ width: "190px" }}>
          <span className="d-flex justify-content-between">
            <b className="fw-semibold">Published: </b>
            {moment(data.timestamp).format("DD/MM/YYYY")}
          </span>
          <span className="d-flex justify-content-between">
            <b className="fw-semibold">End Date: </b>
            {moment(data.bid_end_date).format("DD/MM/YYYY")}
          </span>
          <span>
            <b className="fw-semibold ">Status: </b>
            {data.status == 1
              ? <span className="badge rounded-pill text-bg-success ms-5">Open</span>
              : <span className="badge rounded-pill text-bg-danger ms-5">Closed</span>
            }
          </span>
        </td>

        <td>{(data.rfq_type == "" || data.rfq_type == null) ? "---" : textCapitalize(data.rfq_type)}</td>
        <td>{data.reverse_auction == 1 ? "Enabled" : "Disabled"}</td>
        <td>
          <span>
            <Link
              href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data?.id}`}
              className="page-link"
            >
              View
            </Link>
          </span>
        </td>
        <td>
          <Link
            href={`/dashboard/buyer/query?rfq_id=${data?.id}&role=buyer`}
          >
            <button
              type="button"
              className="page-link-btn border-0 text-white p-2 my-3 rounded-2"
              style={{ width: "120px", backgroundColor: "var(--primary-color)" }}
            >
              Queries <span className="badge text-bg-danger">{data.unseen_query_count} + </span>
            </button>
          </Link>
        </td>
        <td>

          {data.vendors.length > 0 && (
            <button
              type="button"
              onClick={!isRecievedFromAll && handlereminder}
              className={`page-link-btn border-0 p-2 my-3 rounded-2 ${isRecievedFromAll ? "btn disabled" : ""}`}
              role="button"
              disabled={isRecievedFromAll}
              aria-disabled={isRecievedFromAll}
              style={{ width: "260px", backgroundColor: isRecievedFromAll ? "var(--primary-color)" : isHovered ? "var(--primary-color)" : "var(--secondary-color)" }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                  ></span>{" "}
                  Processing request...
                </>
              ) : (
                isRecievedFromAll
                  ? "Quote Received From All Vendors"
                  : `Send Reminder For Quote (${data.vendors[0].total_vendors - data.vendors[0].quote_received}/${data.vendors[0].total_vendors})`
              )
              }
            </button>
          )}

        </td>
      </tr>
    </>
  );
};

export default RFQItem;
