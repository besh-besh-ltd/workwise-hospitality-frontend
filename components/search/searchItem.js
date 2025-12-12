import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import React, { useState } from "react";
import CommonModal from "../modal/CommonModal";
import { PiCrownSimpleFill } from "react-icons/pi";

const SearchItem = ({
  type,
  data,
  vendorMetaData,
  setOpenAuthModal,
  addToRFQ,
  selectedProduct = false,
  handleRemoveCurrentSelected,
  isLoggedIn
}) => {
  const [openCommonModal, setOpenCommonModal] = useState(false);
  const vendorDisplayName = data?.company_name || data?.vendor_name || "";

  return (
    <>
      <div className={`list_item item-${type}`}>
        <div className="mdl-con-top">
          {selectedProduct && <h2 className="fs-5">Selected Product</h2>}
          {!selectedProduct && (
            <label>
              <input
                type="checkbox"
                onClick={(e) => addToRFQ(e.target.checked, data)}
                checked={data.selected}
                id={`select_vendor_${data.id}-vendor_card-vendor_search_page`}
              />
              {type == "products"
                ? <span>By {data?.user_detail[0]?.name}</span>
                : <span>{`By ${vendorDisplayName}`}</span>
              }
            </label>
          )}
        </div>

        <div className="mdl-con-btm mb-4 h-auto" >
          {data.id == "**" && !data.sp && (
            <div className="list_item_disabled">
              <span>You need to purchase subscription to view this vendor</span>
            </div>
          )}
          {selectedProduct && (
            <button
              id={`remove_selected_${data?.id}-search_item`}
              onClick={() => handleRemoveCurrentSelected()}
              className="removeSelectedProduct"
            >
              <FontAwesomeIcon icon={faTimes} />{" "}
            </button>
          )}
          <div className="row">
            <div className="ps-5 col-md-9 ">
          <h4
            className="h3 mt-3 mb-3 text-truncate"
            style={{
              maxWidth: "100%",        // set width limit
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            // title={data.company_name}   // tooltip on hover
          >
            <div className="d-flex flex-column gap-2">
              {vendorDisplayName}
              {(data?.is_premium ?? 0) == 1 && (
                <span
                  className="badge d-inline-flex align-items-center"
                  style={{
                    background: "linear-gradient(135deg, #FFD700 0%, #FFEA8A 50%, #E6C200 100%)",
                    color: "#7A5A00",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    border: "1px solid #D4AF37",
                    width: "fit-content"
                  }}
                >
                  <PiCrownSimpleFill size={16} style={{ marginRight: "6px" }} />
                  Premium Vendor
                </span>
              )}
            </div>
          </h4>
              {type == "vendors" && (
                <>
                  <div className="mdl-con-text">
                    {Array.isArray(data.location) && data.location.length > 0 && (
                      <p>
                        <b>Location :</b>{" "}
                        {[
                          ...new Set(
                            data.location.map((loc) => {
                              const city = loc.city_name?.trim() ?? "";
                              const state = loc.state_name?.trim() ?? "";
                              const country = loc.country_name?.trim() ?? "";

                              // If country is not India → include country
                              if (country && country.toLowerCase() !== "india") {
                                return [city, state, country].filter(Boolean).join(", ");
                              }

                              // Default: India → only city + state
                              return [city, state].filter(Boolean).join(", ");
                            })
                          ),
                        ].join(", ")}
                      </p>
                    )}

                    {data.about && (
                      <p className="truncate-text " style={{ maxHeight: "100px", WebkitLineClamp: 3 }}>
                        <b>About :</b> {data.about}
                      </p>
                    )}
                    {/* {
                      data.vendor_info && 
                      <ul className="d-flex flex-wrap gap-4 mb-2 ps-0">
                        { data.vendor_info.is_private === 1 &&
                        <li className="list-none badge rounded-pill py-2 px-3 text-bg-primary">Private Vendor</li>
                        }
                        {data.vendor_info.is_linked_with_buyer === 1 &&
                        <li className="list-none badge rounded-pill py-2 px-3 text-bg-success">Prefered Vendor</li>
                        }
                        { data.vendor_info.prev_finalized === 1 &&
                        <li className="list-none badge rounded-pill py-2 px-3 text-bg-secondary">Previously Finalized</li>
                        }
                        {data.vendor_info.rfq_added === 1 &&
                        <li className="list-none badge rounded-pill py-2 px-3 text-bg-warning">Already Added in RFQ</li>
                        }
                      </ul>
                    } */}
                    {!data.about && <p>No information available</p>}
                    {data.website && (
                      <p>
                        <b>Website :</b> {data.website}
                      </p>
                    )}
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
                  id={`view_details_${data.id}-vendor_card-vendor_search_page`}
                >
                  View Details
                </Link>
                {/* <Link
                  href="#"
                  className="btn btn-primary custom_primary_btn has_primary-bg"
                  onClick={(e) => {
                    e.preventDefault();
                    addToRFQ(true, data);
                  }}
                >
                  Add To RFQ
                </Link> */}
                <Link
                  href="#"
                  className="btn btn-primary custom_primary_btn"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isLoggedIn)
                      setOpenAuthModal(true);
                    else
                      setOpenCommonModal(true);
                  }}
                  id={`contact_info_${data.id}-vendor_card-vendor_search_page`}
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
