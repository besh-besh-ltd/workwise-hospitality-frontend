import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getVendorsByID } from "@/services/rfq";
import Loader from "@/components/shared/Loader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleLeft,
  faArrowLeft,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { removeVendor } from "@/redux/slice";
import { ToastContainer, toast } from "react-toastify";

const RfqManagementVendorPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { vendors, productid } = router.query;
  const [loading, setloading] = useState(false);
  const [vendorsList, setvendors] = useState([]);

  useEffect(() => {
    if (vendors != "") {
      getVendors();
    }
  }, [router]);

  const getVendors = () => {
    if (vendors) {
      setloading(true);
      getVendorsByID({ vendors: vendors.split(",") })
        .then((res) => {
          setloading(false);
          setvendors(res.data);
        })
        .catch((err) => {
          setloading(false);
          console.error(err);
        });
    }
  };

  const handleRemoveVendor = (e, item) => {
    e.preventDefault();

    dispatch(
      removeVendor({
        vendor_id: item.id,
        product_id: productid,
      })
    );
    toast.success("Vendor removed from this product!");
    router.push("rfq-management?tab=create-rfq");
  };

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading"></h1>
        </div>
      </section>
      {loading && <Loader />}

      <section className="buyer-rfq-det-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="manage-rfq-con">
                {/* Content for Manage RFQs tab */}
                <span className="title">
                  {" "}
                  <Link href="rfq-management?tab=create-rfq" className="mr-4">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                  </Link>{" "}
                  Vendors List
                </span>

                <div className="details-table">
                  {vendorsList && vendorsList.length > 0 && (
                    <>
                      <table className="table table-striped ">
                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Region</th>
                            <th>Contact info</th>
                            <th>Industry</th>
                            <th>Products</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorsList.map((item) => {
                            return (
                              <>
                                <tr key={`vendor-${item.name}`}>
                                  <td>{item.name}</td>
                                  <td>{item.address}</td>
                                  <td>+91 {item.mobile}</td>
                                  <td>
                                    {item.organization_name
                                      ? item.organization_name
                                      : "N/A"}
                                  </td>
                                  <td>
                                    <p className="has_eclipes">
                                      {item.products
                                        .map((product) => product.name)
                                        .join(",")}
                                    </p>
                                  </td>
                                  <td>
                                    <span>
                                      <Link
                                        href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${item.id}&origin=create-rfq&vendors=${vendors}`}
                                        className="page-links"
                                      >
                                        <FontAwesomeIcon icon={faEye} />
                                        View
                                      </Link>
                                    </span>

                                    <span>
                                      <Link
                                        href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${item.id}&origin=create-rfq&vendors=${vendors}`}
                                        className="page-linkd remove-icon"
                                        onClick={(e) =>
                                          handleRemoveVendor(e, item)
                                        }
                                      >
                                        <FontAwesomeIcon icon={faTrash} />
                                        Remove
                                      </Link>
                                    </span>
                                  </td>
                                </tr>
                              </>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* <button
                        type="submit"
                        className="btn btn-secondary float-end"
                      >
                        Send Reminder for Quotation
                      </button> */}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ToastContainer />
    </>
  );
};

export default RfqManagementVendorPage;
