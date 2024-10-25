import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import CommonModal from "../modal/CommonModal";

const SearchItem = ({
  data,
  setOpenAuthModal,
  vendorMetaData,
  type,
  bulkRFQVendors,
  setbulkRFQVendors,
  selectedProduct = false,
  currentSelectedProduct = {},
  handleRemoveCurrentSelected,
  addToRFQ,
  handleRedirect
}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [openCommonModal, setOpenCommonModal] = useState(false);

  const handleSelectVendor = (e, item) => {
    if (e.target.checked) {
      item.selected = true;
      setbulkRFQVendors((oldArray) => [...oldArray, item]);
    } else {
      item.selected = false;
      let p = bulkRFQVendors.filter((vendor) => vendor.id != item.id);
      setbulkRFQVendors(p);
    }
  };

  return (
    <>
      <div className={`list_item item-${type}`}>
        <div className="mdl-con-top">
          {selectedProduct && <h2 className="fs-5">Selected Product</h2>}
          {!selectedProduct && (
            <label>
              <input
                type="checkbox"
                onClick={(e) => handleSelectVendor(e, data)}
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
        <div className="mdl-con-btm mb-4">
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
            <div className="ps-5 col-md-9 ">
              <h3 className="h3 mt-3 mb-3">{data.vendor_name}</h3>
              {type == "vendors" && (
                <>
                  <div className="mdl-con-text">
                    {data.address && (
                      <p>
                        <b>Location :</b> {data.city_name ? `${data.city_name}, ${data.state_name}` : data.state_name ? data.state_name : ''}
                      </p>
                    )}
                    {data.about && (
                      <p className="truncate-text " style={{ maxHeight: "100px", WebkitLineClamp: 3 }}>
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
              <div className="col-md-3 d-flex flex-column gap-3 my-auto pe-5">
                <Link
                  href={`/vendor/vendor-profile?id=${data.id}`}
                  className="btn btn-primary custom_primary_btn"
                  target="_blank"
                >
                  View Details
                </Link>
                <Link
                  href="#"
                  className="btn btn-primary custom_primary_btn has_primary-bg"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!vendorMetaData.logged_In)
                      setOpenAuthModal(true);
                    else if (!vendorMetaData.subscription)
                      router.push('dashboard/buyer/subscription');
                    else
                      addToRFQ(data);
                  }}
                >
                  Add To RFQ
                </Link>
                <Link
                  href="#"
                  className="btn btn-primary custom_primary_btn"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!vendorMetaData.logged_In)
                      setOpenAuthModal(true);
                    else
                      setOpenCommonModal(true);
                  }}
                >
                  Contact Info
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

      {/* ------------- Show Vendors contact info in Modal ------------- */}
      {openCommonModal &&
        <CommonModal
          data={{
            title: "Contact Information",
            email: data.email,
            mobile: data.mobile
          }}
          openCommonModal={openCommonModal}
          closeModal={() => setOpenCommonModal(false)}
        />
      }
    </>
  );
};

export default SearchItem;
