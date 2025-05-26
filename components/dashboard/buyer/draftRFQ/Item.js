import React, { useState } from "react";
import Link from "next/link";
import moment from "moment";

const DraftRFQItem = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);

  const textCapitalize = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

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
            <b className="fw-semibold">Created: </b>
            {moment(data.timestamp).format("DD/MM/YYYY")}
          </span>
          <span className="d-flex justify-content-between">
            <b className="fw-semibold">End Date: </b>
            {data.bid_end_date ? moment(data.bid_end_date).format("DD/MM/YYYY") : "---"}
          </span>
          <span>
            <b className="fw-semibold ">Status: </b>
            <span className="badge rounded-pill text-bg-warning ms-5">Draft</span>
          </span>
        </td>

        <td>{(data.rfq_type == "" || data.rfq_type == null) ? "---" : textCapitalize(data.rfq_type)}</td>
        <td>{data.reverse_auction == 1 ? "Enabled" : "Disabled"}</td>
        <td>
            <Link
              href={`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${data?.id}`}
              className="btn btn-primary"
              style={{ width: "100px" }}
            >
              Edit
            </Link>
        </td>
      </tr>
    </>
  );
};

export default DraftRFQItem;
