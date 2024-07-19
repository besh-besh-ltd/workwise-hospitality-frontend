import { addRfqProduct, addVendor } from "@/redux/slice";
import { faLocationDot, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

const SearchItem = ({
  data,
  type,
  bulkRFQProducts,
  setbulkRFQProducts,
  selectedProduct = false,
  currentSelectedProduct = {},
  handleRemoveCurrentSelected,
}) => {
  const dispatch = useDispatch();

  const addToRFQ = (item) => {
    if (type == "products") {
      dispatch(addRfqProduct(item));
      toast.success(
        <h6>
          <b>{item.product_name}:</b> Successfully added to RFQ list!
        </h6>,
        {
          position: "top-right",
        }
      );
    } else {
      dispatch(
        addVendor({
          product_id: currentSelectedProduct.product_id,
          id: item.id,
          name: item.vendor_name,
        })
      );
      toast.success(
        <h6>
          <b>{item.vendor_name}:</b> Successfully added to RFQ list!
        </h6>,
        {
          position: "top-right",
        }
      );
    }
  };

  const handleBulkRFQ = (e, item) => {
    console.log(bulkRFQProducts, item);
    if (e.target.checked) {
      item.selected = true;
      setbulkRFQProducts((oldArray) => [...oldArray, item]);
    } else {
      item.selected = false;
      let p = bulkRFQProducts.filter((product) => product.id != item.id);
      setbulkRFQProducts(p);
    }
  };

  return (
    <>
      <div className={`list_item item-${type}`}>
        <div className="mdl-con-top">
          {selectedProduct && <h4>Selected Product</h4>}
          {!selectedProduct && (
            <label>
              <input
                type="checkbox"
                onClick={(e) => handleBulkRFQ(e, data)}
                checked={data.selected}
              />
              {type == "products" && (
                <span>By {data?.user_detail[0]?.name}</span>
              )}
              {type == "vendors" && (
                <span>
                  By{" "}
                  {data?.company_name ? data?.company_name : data?.vendor_name}
                </span>
              )}
            </label>
          )}
        </div>
        <div className="mdl-con-btm">
          {data.id == "**" && !data.sp && (
            <div className="list_item_disabled">
              <span>You need to purchase subscription to view this vendor</span>
            </div>
          )}
          {selectedProduct && (
            <button
              onClick={() => handleRemoveCurrentSelected()}
              className="removeSelectedProduct"
            >
              <FontAwesomeIcon icon={faTimes} />{" "}
            </button>
          )}
          <div className="row">
            <div className="col-md-3">
              <div className="vendor-img">
                {type == "products" && data.image_url ? (
                  <>
                    <img
                      src={data.image_url}
                      alt="Workwise"
                      width={98}
                      height={98}
                      priority={true}
                    />
                  </>
                ) : (
                  <>
                    <Image
                      src="/assets/images/client3.png"
                      alt="Workwise"
                      width={98}
                      height={98}
                      priority={true}
                    />
                  </>
                )}

                {type != "products" && (
                  <>
                    <img
                      src={
                        data.image_url
                          ? data.image_url
                          : "/assets/images/client3.png"
                      }
                      alt="Workwise"
                      width={98}
                      height={98}
                    />

                    {data.address && (
                      <p>
                        <FontAwesomeIcon icon={faLocationDot} /> {data.address}
                      </p>
                    )}
                    <p>
                      <Link
                        target="_blank"
                        href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${data.id}`}
                        className="btn btn-primary"
                      >
                        Show Contact Info
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="col-md-7">
              {type == "vendors" && (
                <>
                  <div className="mdl-con-text">
                    {data.about && (
                      <p>
                        <b>About :</b> {data.about}
                      </p>
                    )}
                    {!data.about && <p>No information available</p>}
                    {data.website && (
                      <p>
                        <b>Website :</b> {data.website}
                      </p>
                    )}
                    {/*  {data.vendor_approved &&
                      data.vendor_approved.length > 0 && (
                        <p>
                          <b>Approved By :</b>{" "}
                          {data.vendor_approved
                            .map((approved) => approved.vendor_approve)
                            .join(", ")}
                        </p>
                      )} */}
                  </div>
                </>
              )}
              {type == "products" && (
                <>
                  <div className="mdl-con-text">
                    <h5>
                      <b>{data.product_name}</b>
                    </h5>
                    <p className="mb-0">
                      <b>Description :</b> {data.description}
                    </p>
                    {/* <p>
                  <b>About :</b> Lorem Ipsum is simply dummy text of the
                  printing and typesetting industry. Lorem Ipsum has been the
                  industry's standard.
                </p>
                
                <p>
                  <b>Products :</b> Pipes, Alloy Steel, Carbon Steel & 8 more
                </p> */}
                    {/* */}
                    {type != "products" && (
                      <>
                        <p>
                          <b>Website :</b> www.lorem.com
                        </p>
                        <p>
                          {/* <b>Approved By :</b> EIL, GAIL, SAIL, IOCL */}
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            {!selectedProduct && (
              <div className="col-md-2">
                <Link
                  target="_blank"
                  href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${data.id}`}
                  className="btn btn-primary custom_primary_btn"
                >
                  View Details
                </Link>
                <Link
                  href="#"
                  className={`btn btn-primary custom_primary_btn has_primary-bg ${
                    !data.sp ? `disabled` : ``
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    addToRFQ(data);
                  }}
                >
                  Add To RFQ
                </Link>

                {type != "products" && (
                  <>
                    {data?.ptr_file && (
                      <Link
                        href={data?.ptr_file ? data?.ptr_file : ""}
                        className="btn btn-primary custom_primary_btn"
                        disabled={!data?.ptr_file}
                      >
                        View PTR
                      </Link>
                    )}
                    {/* <Link
                    target="_blank"
                      href="/contactus"
                      className="btn btn-primary custom_primary_btn"
                    >
                      Send Enquiry
                    </Link> */}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchItem;
