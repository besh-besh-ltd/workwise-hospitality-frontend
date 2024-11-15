import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
  const { productid, variant, type } = router.query;
  
  const productItem = useSelector((data) => data.rfqProducts.find((prodItem) => prodItem.product_id == productid && prodItem.variant == variant))
  const rfq_id = useSelector((data)=> data.rfq_id);
  
  const [loading, setloading] = useState(false);
  const [vendorList, setVendorList] = useState([]);

  const vendorsRef = useRef([]);


  const getVendors = () => {
    if (productItem?.vendors?.length > 0) {
      setloading(true);
      const vendorIds = productItem.vendors?.map((venItem) => venItem.user_id)
      getVendorsByID({ vendors: vendorIds })
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
    setVendorList(vendorList.filter((venItem)=> venItem.id != item.id));
    vendorsRef.current.push(item.id);
  };

  const saveDraftChanges = () => {
    const payload = {
      rfq_id,
      product_id: productid,
      variant,
      vendor_ids: vendorsRef.current
    }

    removeVendorFromDraft(payload)
      .then((res)=> {
        toast.success(res.message)
        vendorsRef.current = [];
      })
      .catch((error)=> {
        console.log(error)
        toast.error(error.message);
      })
  }

  useEffect(() => {
    getVendors();
    return () => {
      saveDraftChanges();
    }
  }, []);

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

                <span className="title">Vendors List</span>

                <div className="details-table">
                  {vendorList && vendorList.length > 0 && (
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
                          {vendorList.map((item) => {
                            return (
                              <>
                                <tr key={`vendor-${item.name}`}>
                                  <td>{item.name}</td>
                                  <td>{item.address}</td>
                                  <td>{item.mobile}</td>
                                  <td>
                                    {item.organization_name
                                      ? item.organization_name
                                      : "N/A"}
                                  </td>
                                  <td>
                                    <p className="has_eclipes">
                                      {item.products?.map((product) => product.name).join(",")}
                                    </p>
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
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default RfqManagementVendorPage;
