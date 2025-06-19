import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { removeVendor } from "@/redux/slice";
import { toast } from "react-toastify";
import { getVendorsByID, removeVendorFromDraft } from "@/services/rfq";
import Loader from "@/components/shared/Loader";

const RfqManagementVendorPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const { productid, variant, type, vendors, rfq_id: urlRfqId } = router.query;

  const productItem = useSelector((data) => data.rfqProducts.find((prodItem) => prodItem.product_id == productid && prodItem.variant == variant))
  const rfq_id = useSelector((data) => data.rfq_id) || urlRfqId;

  const [loading, setloading] = useState(false);
  const [vendorList, setVendorList] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const vendorsRef = useRef([]);


  const handleGoBack = (e)=> {
    e.preventDefault();
    if(type == "buyer-view") {
      router.back();
    }
    else {
      router.back();
    }
  }

  const getVendors = () => {
    const vendorIds = productItem ? productItem.vendors?.map((venItem) => venItem.user_id) : vendors?.split(",");

    if (vendorIds) {
      setloading(true);
      getVendorsByID({ vendors: vendorIds, rfq_id })
        .then((res) => {
          setloading(false);
          setVendorList(res.data);
        })
        .catch((err) => {
          setloading(false);
          console.error(err);
        });
    }
  };

  const handleRemoveVendorFromStore = (e, item) => {
    e.preventDefault();
    dispatch(
      removeVendor({
        vendor_id: item.id,
        product_id: productid,
        variant
      })
    );
    setVendorList(vendorList.filter((venItem) => venItem.id != item.id));
    vendorsRef.current.push(item.id);
    setHasUnsavedChanges(true);
  };

  const saveDraftChanges = () => {
    const payload = {
      rfq_id,
      product_id: productid,
      variant,
      vendor_ids: vendorsRef.current
    }

    setloading(true);
    removeVendorFromDraft(payload)
      .then((res) => {
        toast.success(res.message)
        vendorsRef.current = [];
        setHasUnsavedChanges(false);
      })
      .catch((error) => {
        console.log(error)
        toast.error(error.message);
      })
      .finally(() => {
        setloading(false);
      })
  }

  useEffect(() => {
    getVendors();
  }, [router, vendors]);


  useEffect(() => {
    const handleRouteChange = async (url) => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(
          "You have unsaved changes. Do you want to save them before leaving?"
        );
        if (confirmLeave) {
          saveDraftChanges();
        } else {
          // Prevent navigation
          router.events.emit("routeChangeError");
          throw "Route change aborted by user."; // Suppress Next.js warning
        }
      }
    };

    // Listen to route change events
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [hasUnsavedChanges, router]);


  return (
    <>

      {/* Header Section */}
      <section className="buyer-common-header pt-5">
        <div className="container-fluid text-center">
          <h1 className="heading"></h1>

          <Link
            href="#"
            className="fs-6 page-link backBtn"
            style={{ textDecoration: 'none' }}
            onClick={handleGoBack}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Go back
          </Link>

        </div>
      </section>

      {loading && <Loader />}

      <section className="buyer-rfq-det-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="manage-rfq-con">

                <span className="title">Vendors List</span>

                <div className="details-table">
                  {vendorList && vendorList.length > 0 && (
                    <>
                      <table className="table table-striped ">
                        <thead>
                          <tr>
                            <th>Company Name</th>
                            <th>Region</th>
                            <th>Email</th>
                            <th>Mobile No.</th>
                            {/* <th>Industry</th> */}
                            <th>Products</th>
                            <th>View Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorList.map((item) => {
                            return (
                              <>
                                <tr key={`vendor-${item.name}`}>
                                  <td>{item.company_name}</td>
                                  <td>{item.address}</td>
                                  <td>{item.email}</td>
                                  <td>{item.mobile}</td>
                                  {/* <td>
                                    {item.organization_name
                                      ? item.organization_name
                                      : "N/A"}
                                  </td> */}
                                  <td>
                                    <p className="has_eclipes">
                                      {item.products?.map((product) => product.name).join(",")}
                                    </p>
                                  </td>
                                    <td>
                                      <span className={`badge ${item.is_rfq_viewed ? 'bg-success' : 'bg-warning'}`}>
                                        {item.is_rfq_viewed ? 'Viewed' : 'Not Viewed'}
                                      </span>
                                    </td>
                                  <td>
                                    <span>
                                      <Link
                                        href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${item.id}&origin=create-rfq`}
                                        className="page-links"
                                      >
                                        <FontAwesomeIcon icon={faEye} />
                                        View
                                      </Link>
                                    </span>

                                    {type != "rfqVendorList" && type != "buyer-view" &&
                                      <span>
                                        <Link
                                          href="#"
                                          className="page-linkd remove-icon"
                                          onClick={(e) =>
                                            handleRemoveVendorFromStore(e, item)
                                          }
                                        >
                                          <FontAwesomeIcon icon={faTrash} />
                                          Remove
                                        </Link>
                                      </span>}
                                  </td>
                                </tr>
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>

                {type != "rfqVendorList" && type != "buyer-view" &&
                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "200px" }}
                      onClick={saveDraftChanges}
                    >
                      Save Changes
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default RfqManagementVendorPage;
