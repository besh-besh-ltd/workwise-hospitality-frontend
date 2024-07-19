import React, { useEffect, useState } from "react";
import Link from "next/link";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useRouter } from "next/router";
import { closeRFQ, getRFQById } from "@/services/rfq";
import Loader from "@/components/shared/Loader";
import PlaceholderLoading from "react-placeholder-loading";
import FullLoader from "@/components/shared/FullLoader";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import moment from "moment";

const RfqManagementPreview = () => {
  const router = useRouter();
  const { id, type } = router.query;
  const [rfqDetails, setrfqDetails] = useState(null);
  const [loading, setloading] = useState(false);
  const [enableBuyerView, setEnableBuyerView] = useState(false);
  const [closeRFqLoading, setcloseRFqLoading] = useState(false);
  const [productleftforbid, setproductleftforbid] = useState(true);

  useEffect(() => {
    if (id) {
      getRFQdetails();
    }
    if (type && type == "buyer-view") {
      setEnableBuyerView(true);
    }
  }, [router]);

  const getRFQdetails = () => {
    setloading(true);
    getRFQById(id)
      .then((res) => {
        setloading(false);
        setrfqDetails(res.data);
        checkIfQuotationSendIsPossible(res.data);
      })
      .catch((error) => {
        setloading(false);
      });
  };

  const isSubmitAble = () => {
    if (rfqDetails.bid_end_date == "") {
      return true;
    }
    let CURRENT_DATE = moment(new Date());
    let END_DATE = moment(rfqDetails.bid_end_date);
    return END_DATE.diff(CURRENT_DATE, "days") >= 0;
  };
  const handleRFqClose = (e) => {
    setcloseRFqLoading(true);
    e.preventDefault();
    closeRFQ(id)
      .then(() => {
        getRFQdetails();
        setcloseRFqLoading(false);
      })
      .catch((err) => {
        setcloseRFqLoading(false);
      });
  };

  const checkIfQuotationSendIsPossible = (rfqd) => {
    var finalizedProducts = [];
    rfqd?.finalizations?.map((item) => finalizedProducts.push(item.product_id));

    if (finalizedProducts.length === rfqd?.products.length) {
      setproductleftforbid(false);
    } else {
      setproductleftforbid(true);
    }
  };

  return (
    <>
      {loading && (
        <>
          <section className="buyer-common-header sc-pt-80 ">
            <div className="container-fluid">
              <h1 className="heading">
                <PlaceholderLoading shape="rect" width={600} height={50} />
              </h1>
            </div>
          </section>

          <section className="buyer-rfq-det-sec-1 hasFullLoader">
            {loading && <Loader />}
            <div className="container-fluid">
              <div className="row">
                <div className="col-md-12">
                  <div className="manage-rfq-con">
                    {/* Content for Manage RFQs tab */}
                    <span className="title">
                      <PlaceholderLoading
                        shape="rect"
                        width={200}
                        height={10}
                      />
                      <br />
                      <PlaceholderLoading
                        shape="rect"
                        width={200}
                        height={10}
                      />
                    </span>

                    <div className="details-table">
                      <div className="table-responsive">
                        <table className="table table-striped ">
                          <thead>
                            <tr>
                              <th>Name of product</th>
                              <th>Size specifications & Quantity</th>
                              <th>TDS</th>
                              <th>QAP</th>
                              <th>Comments</th>
                              <th>Selected vendors</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={200}
                                  height={15}
                                />
                              </td>
                              <td>
                                <div className="size-specification">
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />

                                  <FontAwesomeIcon icon={faEye} />
                                </div>
                              </td>

                              <td>
                                <div>
                                  <span>
                                    <FontAwesomeIcon icon={faEye} />
                                  </span>
                                  <span>
                                    <Image
                                      src="/assets/images/download-icon.png"
                                      alt="Workwise"
                                      width={16}
                                      height={16}
                                      priority={true}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <span>
                                    <FontAwesomeIcon icon={faEye} />
                                  </span>
                                  <span>
                                    <Image
                                      src="/assets/images/download-icon.png"
                                      alt="Workwise"
                                      width={16}
                                      height={16}
                                      priority={true}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={200}
                                  height={10}
                                />
                              </td>
                              <td>
                                <span>
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <form>
                        <div className="row">
                          <div className="col-md-12">
                            <div className="row">
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>

                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>

                              <div className="col-md-12">
                                <div className="form-group">
                                  <div className="form-group">
                                    <PlaceholderLoading
                                      shape="rect"
                                      width={"100%"}
                                      height={10}
                                    />
                                    <PlaceholderLoading
                                      shape="rect"
                                      width={"100%"}
                                      height={150}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="row">
                            <div className="col-md-8">
                              <h4>
                                {" "}
                                <PlaceholderLoading
                                  shape="rect"
                                  width={300}
                                  height={10}
                                />
                              </h4>

                              <ul style={{ listStyle: "none" }}>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                              </ul>
                            </div>
                          </div>
                          <PlaceholderLoading
                            shape="rect"
                            width={200}
                            height={50}
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      {/* // Not loading contents */}
      {!loading && rfqDetails && rfqDetails.id && (
        <>
          <section className="buyer-common-header sc-pt-80">
            <div className="container-fluid">
              {!enableBuyerView && (
                <h1 className="heading">
                  Inquiry from {rfqDetails.company_name}. (RFQ #
                  {rfqDetails.rfq_no})
                </h1>
              )}
              {enableBuyerView && <h1 className="heading">RFQ Management</h1>}
            </div>
          </section>

          <section className="buyer-rfq-det-sec-1">
            <div className="container-fluid">
              {!enableBuyerView && (
                <Link
                  href="/dashboard/vendor/inquiries-received"
                  className="page-link backBtn"
                >
                  {" "}
                  <FontAwesomeIcon icon={faArrowLeft} /> Go back
                </Link>
              )}
              {enableBuyerView && (
                <Link
                  href="/dashboard/buyer/rfq-management"
                  className="page-link backBtn"
                >
                  {" "}
                  <FontAwesomeIcon icon={faArrowLeft} /> Go back
                </Link>
              )}
              <div className="row">
                <div className="col-md-12">
                  <div className="manage-rfq-con">
                    {/* Content for Manage RFQs tab */}
                    <span className="title">
                      RFQ #{rfqDetails.rfq_no} details
                    </span>

                    <div className="details-table">
                      <div className="table-responsive">
                        <table className="table table-striped ">
                          <thead>
                            <tr>
                              <th>Name of product</th>
                              <th>Size specifications & Quantity</th>
                              <th>TDS</th>
                              <th>QAP</th>
                              <th>Comments</th>
                              {/* <th>Selected vendors</th> */}
                            </tr>
                          </thead>
                          <tbody>
                            {rfqDetails?.products?.map((item, index) => {
                              let si = 0;
                              let sp = si + 1;
                              let qu = sp + 1;
                              console.log(
                                `item ${index} - size - ${si}, spec ${sp}, quantity ${qu}`
                              );
                              return (
                                <tr key={`${item.product_id}`}>
                                  <td>{item?.product_details[0]?.name}</td>
                                  <td>
                                    <div className="size-specification vendor-view-rfq">
                                      {item?.product_specs.map(
                                        (spec_item, index) => {
                                          if (index >= si && index <= qu) {
                                            return (
                                              <input
                                                key={`rfq_d_spec_itm_${index}`}
                                                className="full"
                                                type="text"
                                                name={spec_item?.title.toLowerCase()}
                                                id={
                                                  item?.product_id +
                                                  "_" +
                                                  spec_item?.title.toLowerCase()
                                                }
                                                placeholder="Size"
                                                value={spec_item?.value}
                                                disabled
                                              />
                                            );
                                          }
                                        }
                                      )}

                                      {item?.spec_file &&
                                        item?.spec_file != "" && (
                                          <Link
                                            target="_blank"
                                            href={item?.spec_file}
                                          >
                                            <FontAwesomeIcon icon={faEye} />
                                          </Link>
                                        )}
                                    </div>
                                  </td>

                                  <td>
                                    <div>
                                      {item?.datasheet == null &&
                                        item?.product_details[0]
                                          ?.predefined_tds_file != null &&
                                        item.datasheet_file == "" && (
                                          <>
                                            <Link
                                              target="_blank"
                                              href={
                                                item?.product_details[0]
                                                  ?.predefined_tds_file
                                              }
                                            >
                                              <FontAwesomeIcon icon={faEye} />{" "}
                                              View File
                                            </Link>
                                            <Link
                                              target="_blank"
                                              download={true}
                                              href={
                                                item?.product_details[0]
                                                  ?.predefined_tds_file
                                              }
                                            >
                                              <Image
                                                src="/assets/images/download-icon.png"
                                                alt="Workwise"
                                                width={16}
                                                height={16}
                                                priority={true}
                                              />{" "}
                                              Download
                                            </Link>
                                          </>
                                        )}
                                      {item?.datasheet == null &&
                                        item?.product_details[0]
                                          ?.predefined_tds_file == null &&
                                        item.datasheet_file == "" &&
                                        "N/A"}
                                      {item?.datasheet &&
                                        item?.datasheet != null &&
                                        item?.datasheet.length > 0 && (
                                          <span>{item?.datasheet[0].name}</span>
                                        )}
                                      {item?.datasheet_file &&
                                        item?.datasheet_file != "" && (
                                          <Link
                                            target="_blank"
                                            href={item?.datasheet_file}
                                          >
                                            <FontAwesomeIcon icon={faEye} />
                                          </Link>
                                        )}
                                      {!item?.datasheet_file &&
                                        item?.datasheet != null &&
                                        item?.datasheet_file == "" && (
                                          <Link
                                            target="_blank"
                                            href={
                                              item?.datasheet[0]?.datasheet_link
                                            }
                                          >
                                            <FontAwesomeIcon icon={faEye} />
                                          </Link>
                                        )}
                                      {item?.datasheet_file &&
                                        item?.datasheet_file != "" && (
                                          <Link
                                            target="_blank"
                                            download={true}
                                            href={item?.datasheet_file}
                                          >
                                            <Image
                                              src="/assets/images/download-icon.png"
                                              alt="Workwise"
                                              width={16}
                                              height={16}
                                              priority={true}
                                            />
                                          </Link>
                                        )}
                                      {!item?.datasheet_file &&
                                        item?.datasheet != null &&
                                        item?.datasheet_file == "" && (
                                          <Link
                                            target="_blank"
                                            download={true}
                                            href={
                                              item?.datasheet[0].datasheet_link
                                            }
                                          >
                                            <Image
                                              src="/assets/images/download-icon.png"
                                              alt="Workwise"
                                              width={16}
                                              height={16}
                                              priority={true}
                                            />
                                          </Link>
                                        )}
                                    </div>
                                  </td>
                                  <td>
                                    <div>
                                      {item?.qap == null &&
                                        item?.product_details[0]
                                          ?.predefined_qap_file != null &&
                                        item.qap_file == "" && (
                                          <>
                                            <Link
                                              target="_blank"
                                              href={
                                                item?.product_details[0]
                                                  ?.predefined_qap_file
                                              }
                                            >
                                              <FontAwesomeIcon icon={faEye} />{" "}
                                              View File
                                            </Link>
                                            <Link
                                              target="_blank"
                                              download={true}
                                              href={
                                                item?.product_details[0]
                                                  ?.predefined_qap_file
                                              }
                                            >
                                              <Image
                                                src="/assets/images/download-icon.png"
                                                alt="Workwise"
                                                width={16}
                                                height={16}
                                                priority={true}
                                              />{" "}
                                              Download
                                            </Link>
                                          </>
                                        )}
                                      {item?.qap == null &&
                                        item?.product_details[0]
                                          ?.predefined_qap_file == null &&
                                        item.qap_file == "" &&
                                        "N/A"}
                                      {item?.qap &&
                                        item?.qap != "" &&
                                        item?.qap != null && (
                                          <span>{item?.qap[0].name}</span>
                                        )}
                                      {item?.qap_file &&
                                        item?.qap_file != "" && (
                                          <Link
                                            target="_blank"
                                            href={item?.qap_file}
                                          >
                                            <FontAwesomeIcon icon={faEye} />
                                          </Link>
                                        )}
                                      {!item?.qap_file &&
                                        item?.qap_file == "" &&
                                        item?.qap != null && (
                                          <Link
                                            target="_blank"
                                            href={item?.qap[0].qap_link}
                                          >
                                            <FontAwesomeIcon icon={faEye} />
                                          </Link>
                                        )}
                                      {item?.qap_file &&
                                        item?.qap_file != "" && (
                                          <Link
                                            target="_blank"
                                            download={true}
                                            href={item?.qap_file}
                                          >
                                            <Image
                                              src="/assets/images/download-icon.png"
                                              alt="Workwise"
                                              width={16}
                                              height={16}
                                              priority={true}
                                            />
                                          </Link>
                                        )}
                                      {!item?.qap_file &&
                                        item?.qap_file == "" &&
                                        item?.qap != null && (
                                          <Link
                                            target="_blank"
                                            download={true}
                                            href={item?.qap[0].qap_link}
                                          >
                                            <Image
                                              src="/assets/images/download-icon.png"
                                              alt="Workwise"
                                              width={16}
                                              height={16}
                                              priority={true}
                                            />
                                          </Link>
                                        )}
                                    </div>
                                  </td>
                                  <td>
                                    {item?.comment && item?.comment != ""
                                      ? item.comment
                                      : "N/A"}
                                  </td>
                                  {/* <td>
                                  <span>
                                    <Link href="#" className="page-link">
                                      View
                                    </Link>
                                  </span>
                                </td> */}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <form>
                        <div className="row">
                          <div className="col-md-12">
                            <div className="row wacomnamepp">
                              <div className="col-md-3">
                                <div className="form-group">
                                  <label
                                    htmlFor="comname"
                                    className="form-label"
                                  >
                                    Company Name
                                  </label>
                                  <input
                                    type="text"
                                    id="wacomnamepp"
                                    className="form-control"
                                    name="comname"
                                    placeholder="lorem ipsum"
                                    disabled
                                    value={rfqDetails?.company_name}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <label
                                    htmlFor="cperson"
                                    className="form-label"
                                  >
                                    Contact person
                                  </label>
                                  <input
                                    type="text"
                                    id="cperson"
                                    className="form-control"
                                    name="cperson"
                                    placeholder="John Doe"
                                    disabled
                                    value={rfqDetails?.contact_name}
                                  />
                                </div>
                              </div>

                              <div className="col-md-3">
                                <div className="form-group">
                                  <label htmlFor="email" className="form-label">
                                    Email
                                  </label>
                                  <input
                                    type="text"
                                    id="email"
                                    className="form-control"
                                    name="email"
                                    placeholder="lorem@ipsum.com"
                                    disabled
                                    value={rfqDetails?.response_email}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <label htmlFor="wapp" className="form-label">
                                    Contact Number
                                  </label>
                                  <input
                                    type="text"
                                    id="wapp"
                                    className="form-control"
                                    name="wapp"
                                    placeholder="+91 1234567890"
                                    disabled
                                    value={`+91 ${rfqDetails?.contact_number}`}
                                  />
                                </div>
                              </div>
                              {/* 
                              <div className="col-md-12">
                                <div className="form-group">
                                  <label htmlFor="wapp" className="form-label">
                                    Additional Terms & Conditions
                                  </label>
                                  <textarea
                                    id="comment"
                                    className="form-control"
                                    name="comment"
                                    placeholder="comment here"
                                    rows={5}
                                    disabled
                                    value={rfqDetails?.comment}
                                  />
                                </div>
                              </div> */}
                            </div>
                          </div>

                          {rfqDetails && rfqDetails?.id && (
                            <div className="col-md-12">
                              <div className="row terms-conditions">
                                <div className="col-md-6 ">
                                  <h4>Terms & Conditions</h4>
                                  {rfqDetails?.terms.length == 0 && (
                                    <p>No predefined terms selected!</p>
                                  )}

                                  {rfqDetails?.terms.length > 0 && (
                                    <ol>
                                      {rfqDetails?.terms.map((item, index) => {
                                        return (
                                          <li key={`rfq_d_t_${index}`}>
                                            {item.content[0].title}
                                          </li>
                                        );
                                      })}
                                    </ol>
                                  )}
                                </div>
                                <div className="col-md-6">
                                  {/* winning bid area */}
                                  {rfqDetails.finalizations &&
                                    rfqDetails.finalizations.length > 0 && (
                                      <div className="finalized-details">
                                        {/* <h4>Finalized Details</h4>
                                        <div className="noborder-table">
                                          <div className="table-responsive">
                                            <table>
                                              <thead>
                                                <tr>
                                                  <th>Product name</th>
                                                  <th>Vendor</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {rfqDetails.finalizations.map((item => {
                                                  return (
                                                    <tr>
                                                      <td>{item?.product_details?.name}</td>
                                                      <td>{item?.winning_vendor?.organization_name}</td>
                                                    </tr>
                                                  )
                                                }))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div> */}
                                      </div>
                                    )}
                                  {/* winning bid area end */}
                                  {rfqDetails.quotations.length > 0 &&
                                    rfqDetails.quotations[0].is_regret == 0 && (
                                      <div className="submitted-quotation">
                                        <h4>
                                          You've aready submitted a quotation on{" "}
                                          {moment(
                                            new Date(
                                              parseInt(
                                                rfqDetails.quotations[0]
                                                  .timestamp
                                              )
                                            )
                                          ).format(
                                            "DD/MM/YYYY - HH:mm:ss A"
                                          )}{" "}
                                        </h4>
                                        {/* <div className="noborder-table">
                                          <div className="table-responsive">
                                            <table>
                                              <thead>
                                                <tr>
                                                  <th rowSpan={2}>Product</th>
                                                  <th
                                                    colSpan={5}
                                                    className="bottomBorder"
                                                  >
                                                    Price
                                                  </th>
                                                  <th
                                                    colSpan={2}
                                                    className="bottomBorder"
                                                  >
                                                    Comments & Details
                                                  </th>
                                                </tr>
                                                <tr>
                                                  <th>Unit Price</th>
                                                  <th>Packaging (%)</th>                                                  
                                                  <th>Freight (%)</th>
                                                  <th>Tax (%)</th>
                                                  <th>Total Price</th>
                                                  <th>Comment</th>
                                                  <th>Delivery (Weeks)</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {rfqDetails?.quotations[0]?.products
                                                  .length > 0 &&
                                                  rfqDetails?.quotations[0]?.products?.map(
                                                    (item, index) => {
                                                      return (
                                                        <tr key={`rfq_d_i_${index}`}>
                                                          <td>
                                                            {item?.product_name
                                                              ? item?.product_name
                                                              : "-"}
                                                          </td>
                                                          <td>
                                                            ₹{" "}
                                                            {item?.unit_price
                                                              ? item?.unit_price
                                                              : "-"}
                                                          </td>
                                                          <td>
                                                            {" "}
                                                            {item?.package_price
                                                              ? item?.package_price+"%"
                                                              : "-"}
                                                          </td>
                                                          
                                                          <td>
                                                            {" "}
                                                            {item?.freight_price
                                                              ? item?.freight_price+"%"
                                                              : "-"}
                                                          </td>
                                                          <td style={{ width: 60 }}>
                                                            {" "}
                                                            {item?.tax
                                                              ? item?.tax+"%"
                                                              : "-"}
                                                          </td>
                                                          <td>
                                                            ₹{" "}
                                                            {item?.total_price
                                                              ? item?.total_price
                                                              : "-"}
                                                          </td>
                                                          <td>
                                                            {item?.comment
                                                              ? item?.comment
                                                              : "-"}
                                                          </td>
                                                          <td>
                                                            {item?.delivery_period
                                                              ? item?.delivery_period
                                                              : "-"}
                                                          </td>
                                                        </tr>
                                                      );
                                                    }
                                                  )}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div> */}
                                      </div>
                                    )}
                                  {rfqDetails.quotations.length > 0 &&
                                    rfqDetails.quotations[0].is_regret == 1 && (
                                      <div className="submitted-quotation">
                                        <h4 className="text-center">
                                          You've{" "}
                                          <span style={{ color: "#f00" }}>
                                            declined
                                          </span>{" "}
                                          the RFQ request on{" "}
                                          {moment(
                                            new Date(
                                              parseInt(
                                                rfqDetails.quotations[0]
                                                  .timestamp
                                              )
                                            )
                                          ).format(
                                            "DD/MM/YYYY - HH:mm:ss A"
                                          )}{" "}
                                        </h4>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="col-md-12">
                            <div className="row">
                              <div className="col-md-6">
                                <h4>Additional Terms & Conditions</h4>
                                <div className="form-group">
                                  <textarea
                                    id="comment"
                                    className="form-control"
                                    name="comment"
                                    placeholder="comment here"
                                    rows={5}
                                    disabled
                                    value={rfqDetails?.comment}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          {enableBuyerView && (
                            <>
                              {rfqDetails?.status == 1 && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={handleRFqClose}
                                  disabled={closeRFqLoading}
                                >
                                  {closeRFqLoading
                                    ? "Processing request..."
                                    : "Mark RFQ as Closed"}
                                </button>
                              )}
                              {rfqDetails?.status == 2 && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={(e) => e.preventDefault()}
                                  disabled={true}
                                >
                                  RFQ has been closed
                                </button>
                              )}
                            </>
                          )}
                          {!enableBuyerView && (
                            <>
                              {isSubmitAble() &&
                                productleftforbid &&
                                rfqDetails.quotations.length <= 0 &&
                                rfqDetails?.status == 1 && (
                                  <Link
                                    href={`/dashboard/vendor/send-quote?id=${id}`}
                                  >
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                    >
                                      Send Quote
                                    </button>
                                  </Link>
                                )}
                            </>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      {!loading && rfqDetails && !rfqDetails.id && (
        <section className="buyer-common-header sc-pt-80">
          <div className="container-fluid">
            {<h1 className="heading">RFQ Not Available!</h1>}
          </div>
        </section>
      )}
    </>
  );
};

export default RfqManagementPreview;
