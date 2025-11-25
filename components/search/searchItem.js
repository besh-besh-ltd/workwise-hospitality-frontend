import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import React, { useState } from "react";
import CommonModal from "../modal/CommonModal";

const SearchItem = ({
  type,
  data,
  vendorMetaData,
  setOpenAuthModal,
  addToRFQ,
  selectedProduct = false,
  handleRemoveCurrentSelected,
}) => {
  const [openCommonModal, setOpenCommonModal] = useState(false);

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
                : <span>{`By ${data?.company_name ? data?.company_name : data?.vendor_name}`}</span>
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
            {data?.company_name}
          </h4>
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
                    {
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
                    }
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
                    if (!vendorMetaData || !vendorMetaData.logged_In)
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
