import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Image from "next/image";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { faTimesCircle, faEnvelope, faFileLines } from "@fortawesome/free-regular-svg-icons";
import { faCheckCircle, faLocation, faPhone, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getUserPaymentTerms } from "@/services/Auth";
import {
  getPastRFQS,
  getVendorDetailsByID,
} from "@/services/rfq";
import { toast } from "react-toastify";
import FullLoader from "@/components/shared/FullLoader";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import ProductCarousel from "./product-carousel";
import moment from "moment";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import { faFacebook, faLinkedin, faSkype, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import DynamicFormSpoc from "@/components/modal/DynamicFormSpoc";
import { addSpoc } from "@/services/Auth";
import { getCountryCodes } from "@/services/cms";
import MediaRender from "@/components/shared/MediaRender";
import { PiCrownSimpleFill } from "react-icons/pi";
import { BiFile, BiLinkExternal, BiDownload } from "react-icons/bi";
import * as XLSX from "xlsx";


const VendorProfile = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const router = useRouter();
  const { id, showContact } = router.query;
  const showContactDetails = showContact === 'true';
  const [loading, setloading] = useState(false);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [approvedProducts, setApprovedProducts] = useState(null);
  const [pastrfqloading, setpastrfqloading] = useState(false);
  const [pastRFQs, setpastRFQs] = useState([]);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [isLoggedin, setIsLoggedIn] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [openAddSpoc, setOpenAddSpoc] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [countryCode, setCountryCode] = useState([]);
  const [isBuyerUser, setIsBuyerUser] = useState(false);
  const [paymentTermsRows, setPaymentTermsRows] = useState([
    // {id:null, value: "", type: "advance", days: "", comment: ""},
  ]);  //For rendering the payment terms

  const isBuyer = isBuyerUser;



 const fetchPaymentTerms = async () => {
       if (!id) return ;
        try {
          const res = await getUserPaymentTerms(id , 'buyer');
          const terms = res?.data?.data || res?.data || [];
          setPaymentTermsRows(
            Array.isArray(terms) && terms.length > 0
              ? terms
              : [
                  {
                    id: null,
                    value: "",
                    type: "advance",
                    days: "",
                    comment: "",
                  },
                ]
          );
        } catch (err) {
          console.error("Error fetching payment terms:", err);
          setPaymentTermsRows([
            {
              id: null,
              value: "",
              type: "advance",
              days: "",
              comment: "",
            },
          ]);
        }
    };

useEffect(() => {
  // ✅ Wait until router is ready and id is defined
  if (!router.isReady || !id) return;

  const fetchData = async () => {
    await getVendorProfile();
    await fetchPaymentTerms();
  };

  fetchData();
}, [router.isReady, id]);

  useEffect(() => {
    if (isLoggedin) {
      getVendorPastRfq();
      applyBuyerProfile();
    }
  }, [vendorDetails, userProfile]);

  useEffect(() => {
    // fetch country codes once
    getCountryCodes()
      .then((response) => {
        setCountryCode(response?.data || []);
      })
      .catch(() => setCountryCode([]));
  }, []);

  const getVendorPastRfq = () => {
    if (id) {
      setpastrfqloading(true);
      getPastRFQS(id)
        .then((res) => {
          setpastrfqloading(false);
          setpastRFQs(res.data);
        })
        .catch((err) => {
          setpastrfqloading(false);
          console.log(err);
        });
    }
  };

  const getVendorProfile = () => {
    if (id) {
      setloading(true);
      getVendorDetailsByID(id, { showContact: showContactDetails })
        .then((res) => {
          setloading(false);
          setVendorDetails({...res.data, subscription: res.subscription});
          const approvedList = res.data.product_list?.filter((prod) => prod?.approved_by.length > 0);
          setApprovedProducts(approvedList);
          setIsLoggedIn(res.logged_In);
        })
        .catch((err) => {
          setloading(false);
          console.error('Error fetching vendor details:', err);
        });
    }
  };

  const handleDownloadVendorData = () => {
    if (!vendorDetails) return;

    const docByType = (type) =>
      (vendorDetails?.compliance_docs || []).find((d) => d.document_type === type);
    const panDoc = docByType("pan");
    const gstDoc = docByType("gst");
    const msmeDoc = docByType("msme");
    const fssaiDoc = docByType("fssai");
    const chequeDoc = docByType("cancelled_cheque");
    const bank = vendorDetails?.bank_details || {};

    const rows = [
      ["Field", "Value"],
      ["Company Name", vendorDetails?.company_name || ""],
      ["Vendor Name", vendorDetails?.vendor_name || ""],
      ["Email", vendorDetails?.email || ""],
      ["Mobile", vendorDetails?.mobile || ""],
      ["WhatsApp", vendorDetails?.whatsapp || ""],
      ["Website", vendorDetails?.website || ""],
      ["Established Year", vendorDetails?.established_year || ""],
      ["Nature of Business", vendorDetails?.nature_of_business || ""],
      ["Type of Business", vendorDetails?.type_of_business || ""],
      ["Annual Turnover", vendorDetails?.turnover || ""],
      ["Number of Employees", vendorDetails?.no_of_employess || ""],
      [],
      ["Registration & Compliance", ""],
      ["PAN Number", panDoc?.document_number || ""],
      ["PAN Document", panDoc?.document_url || ""],
      ["GSTIN", vendorDetails?.gstin || ""],
      ["GST Certificate", gstDoc?.document_url || ""],
      ["CIN", vendorDetails?.cin || ""],
      ["Import Export Code (IEC)", vendorDetails?.import_export_code || ""],
      ["MSME / Udyam Number", msmeDoc?.document_number || ""],
      ["MSME / Udyam Document", msmeDoc?.document_url || ""],
      ["FSSAI Number", fssaiDoc?.document_number || ""],
      ["FSSAI Document", fssaiDoc?.document_url || ""],
      [],
      ["Banking", ""],
      ["Account Holder", bank.account_holder_name || ""],
      ["Bank Name", bank.bank_name || ""],
      ["Account Number (masked)", bank.account_number_masked || ""],
      ["IFSC Code", bank.ifsc_code || ""],
      ["Cancelled Cheque", chequeDoc?.document_url || ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 32 }, { wch: 70 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Details");

    const baseName = (vendorDetails?.company_name || vendorDetails?.vendor_name || "vendor")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    XLSX.writeFile(wb, `${baseName}_vendor_details.xlsx`);
  };

  const handleChange = (setState) => (event) => {
    setState(event);
  };

  const applyBuyerProfile = () => {
    if (!userProfile) return;
    const userTypeVal = parseInt(userProfile.user_type ?? userProfile.register_as ?? 0, 10);
    setIsBuyerUser(userTypeVal === 2);
    setcurrentUserProfile(userProfile);
  };

  const handleBuyerAddSpoc = async (values, resetForm) => {
    if (!id) return;
    setCreateLoading(true);
    try {
      const res = await addSpoc({ ...values, vendor_id: id });
      const msg = res.message?.toLowerCase?.() || "";
      if (msg.includes("spoc already exist")) {
        toast.error(res.message);
      } else {
        toast.success(res.message);
        resetForm();
        setOpenAddSpoc(false);
        getVendorProfile(); // Refresh the profile data
      }
    } catch (error) {
      console.error('Error adding SPOC:', error);
      toast.error(error?.response?.data?.message || "Failed to add SPOC");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Vendor Profile | Workwise</title>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "http://schema.org",
            "@type": "Organization",
            name: vendorDetails?.company_name,
            description: vendorDetails?.profile,
            url: vendorDetails?.website,
            logo: vendorDetails?.profile_image_url,
            telephone: vendorDetails?.mobile,
            email: vendorDetails?.email,
            address: {
              "@type": "PostalAddress",
              streetAddress: vendorDetails?.address,
              addressLocality: vendorDetails?.city_name,
              addressRegion: vendorDetails?.state_name,
            },
            contactPoint: {
              "@type": "ContactPoint",
              telephone: vendorDetails?.mobile,
              contactType: "customer service",
            },
            offers: {
              "@type": "Offer",
              offeredBy: {
                "@type": "Organization",
                name: vendorDetails?.company_name,
              },
              itemOffered: vendorDetails?.product_list.map((item) => ({
                "@type": "Product",
                name: item?.product_name,
                description: item?.product_description,
                productID: item?.product_id,
              })),
            },
          })}
        </script>

        <meta property="og:title" content="Vendor Profile | Workwise" />
        <meta property="og:description" content={vendorDetails?.profile} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={vendorDetails?.website} />
        <meta property="og:image" content={vendorDetails?.profile_image_url} />
        <meta property="og:site_name" content="Workwise" />
      </Head>

      <section
        className="vendor-common-header sc-pt-80"
        aria-label="vendor-profile-page"
      >
        <div className="container-fluid">
          <h1 className="heading">Vendor's profile</h1>
        </div>
      </section>

      <section className="vendor-profile-sec-1" aria-label="vendor-information">
        <div className="container-fluid">
          <div className="row ">
            <div className="col-md-3">
              {/* User Profile Details */}
              <div className="user-profile hasFullLoader mb-4">
                {loading && <FullLoader />}

                {/* Profile Image */}
                <div className="user-img">
                  {vendorDetails?.profile_image_url ||
                  vendorDetails?.profile_image ? (
                    <img
                      src={
                        vendorDetails?.profile_image_url ||
                        vendorDetails?.profile_image
                      }
                      alt="Vendor Profile Image"
                      width={164}
                      height={164}
                      priority={true}
                    />
                  ) : (
                    <img
                      src="/assets/images/vendor.png"
                      alt="Workwise"
                      width={164}
                      height={164}
                      priority={true}
                    />
                  )}
                </div>

                {/* Vendor Basic Details */}
                <div className="user-details hasFullLoader mb-4">
                  <h2 className="mb-1">{vendorDetails?.company_name}</h2>
                  {vendorDetails?.subscription_plan_id ? (
                    <span
                      className="badge d-inline-flex align-items-center mt-1 mb-4"
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
                  ) : vendorDetails?.status == 1 ? (
                    <p>
                      <FontAwesomeIcon icon={faCheckCircle} /> Verified
                    </p>
                  ) : (
                    <p>
                      <FontAwesomeIcon icon={faTimesCircle} /> Unverified
                    </p>
                  )}
                  {vendorDetails?.location?.length > 0 && (
                    <div>
                      {vendorDetails.location.map((loc, index) => (
                        <p key={index}>
                          <FontAwesomeIcon icon={faLocation} />{" "}
                          {loc.address ? loc.address : ""}
                          {loc.city_name ? `, ${loc.city_name}` : ""}
                          {loc.state_name ? `, ${loc.state_name}` : ""}
                          {loc.country_name ? `, ${loc.country_name}` : ""}
                          {loc.postal_code ? ` - ${loc.postal_code}` : ""}
                        </p>
                      ))}
                    </div>
                  )}

                  {console.log("vendor details---->", vendorDetails)}

                  {(vendorDetails?.linkedin ||
                    vendorDetails?.facebook ||
                    vendorDetails?.whatsapp ||
                    vendorDetails?.skype) && (
                    <div className="d-flex justify-content-around w-75 border p-2 rounded-3 mx-auto">
                      <Link
                        href={
                          vendorDetails?.linkedin
                            ? vendorDetails?.linkedin
                            : "#"
                        }
                      >
                        <FontAwesomeIcon icon={faLinkedin} fontSize={24} />
                      </Link>
                      <Link
                        href={
                          vendorDetails?.facebook
                            ? vendorDetails?.facebook
                            : "#"
                        }
                      >
                        <FontAwesomeIcon icon={faFacebook} fontSize={24} />
                      </Link>
                      <Link
                        href={
                          vendorDetails?.whatsapp
                            ? vendorDetails?.whatsapp
                            : "#"
                        }
                      >
                        <FontAwesomeIcon icon={faWhatsapp} fontSize={24} />
                      </Link>
                      <Link
                        href={vendorDetails?.skype ? vendorDetails?.skype : "#"}
                      >
                        <FontAwesomeIcon icon={faSkype} fontSize={24} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Approved by Section */}
              <div className="user-profile hasFullLoader mb-4">
                {loading && <FullLoader />}
                <h2 className="title">Product Approvals</h2>
                {approvedProducts && approvedProducts.length === 0 ? (
                  <p>Vendor Products are not Approved!</p>
                ) : (
                  <div
                    className="table-responsive"
                    style={{
                      maxHeight: "450px",
                      overflowY: "auto",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <table className="table table-bordered">
                      <tbody>
                        {approvedProducts?.map((approvedProd) => {
                          return (
                            <tr key={`approved_${approvedProd.product_id}`}>
                              <td>
                                <p
                                  className="fw-medium mb-1"
                                  style={{ color: "var(--primary-color)" }}
                                >
                                  {approvedProd.product_name}
                                </p>
                                {approvedProd.approved_by.map((approveItem) => {
                                  return (
                                    <div
                                      key={`approve_id_${approveItem.vendor_approve_id}`}
                                      className="badge badge-warning me-2"
                                      style={{
                                        padding: "6px",
                                        fontSize: "11px",
                                      }}
                                    >
                                      {approveItem.vendor_name}
                                    </div>
                                  );
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Past RFQ's with the vendor List */}
              <div className="user-profile hasFullLoader mb-4">
                {pastrfqloading && <FullLoader />}
                <h2>Past RFQ With The Vendor</h2>
                {pastRFQs && pastRFQs.length > 0 && (
                  <div
                    className="table-responsive"
                    style={{
                      maxHeight: "440px",
                      overflowY: "auto",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <table className="table table-bordered ">
                      <thead>
                        <tr>
                          <th>RFQ ID</th>
                          <th>Products</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastRFQs.map((item) => {
                          return (
                            <tr key={`prfq-${item.id}`}>
                              <td>{item.rfq_no}</td>
                              <td>{item.name}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {pastRFQs.length == 0 && <p>No RFQ details yet!</p>}
              </div>
            </div>

            <div className="col-md-9 ">
              <div className="vendor-profile-sec-con mb-4">
                <div className="row vendor-profile-sec-con-1 hasFullLoader">
                  {loading && <FullLoader />}
                  <h2 className="title">{vendorDetails?.company_name}</h2>
                  <p>
                    {!loading &&
                      (vendorDetails?.profile || "No Information to show.")}
                  </p>
                </div>
                <hr />

                {/* Additional Company Information Section */}
                <div className="row vendor-profile-sec-con-2 hasFullLoader">
                  {loading && <FullLoader />}

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="title mb-0">Company information</h2>
                    {/* <Link
                      href={vendorDetails?.brochure[0]?.brochure_url || '#'}
                      className="page-link fw-medium"
                      style={{ textDecoration: 'none' }}
                    >
                      <FontAwesomeIcon icon={faFileLines} fontSize={18} className="me-1" />
                      Download Brochure
                    </Link> */}
                  </div>

                  <div className="col-md-6">
                    {vendorDetails?.nature_of_business && (
                      <p className="mb-1">
                        <b>Nature of Business</b> :{" "}
                        {vendorDetails?.nature_of_business}
                      </p>
                    )}
                    {vendorDetails?.type_of_business && (
                      <p className="mb-1">
                        <b>Type of Business</b> :{" "}
                        {vendorDetails?.type_of_business}
                      </p>
                    )}
                    {vendorDetails?.no_of_employess && (
                      <p className="mb-1">
                        <b>Number of Employees</b> :{" "}
                        {vendorDetails?.no_of_employess}
                      </p>
                    )}
                    {vendorDetails?.turnover && (
                      <p className="mb-1">
                        <b>Annual Turnover</b> : {vendorDetails?.turnover}
                        {" Crore"}
                      </p>
                    )}
                    {vendorDetails?.certifications && (
                      <p className="mb-1">
                        <b>Certification</b> : {vendorDetails?.certifications}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6">
                    {isLoggedin ? (
                      <>
                        {vendorDetails?.import_export_code && (
                          <p className="mb-1">
                            <b>Import Export code</b> :{" "}
                            {vendorDetails?.import_export_code}
                          </p>
                        )}
                        {vendorDetails?.established_year && (
                          <p className="mb-1">
                            <b>Established Year</b> :{" "}
                            {vendorDetails?.established_year}
                          </p>
                        )}
                        {showContactDetails && vendorDetails?.mobile && (
                          <p className="mb-1">
                            <b>Contact Number</b> : {vendorDetails?.mobile}
                          </p>
                        )}
                        {showContactDetails && vendorDetails?.email && (
                          <p className="mb-1">
                            <b>Contact Email</b> : {vendorDetails?.email}
                          </p>
                        )}
                        {vendorDetails?.gstin && (
                          <p className="mb-1">
                            <b>Company GSTIN</b> : {vendorDetails?.gstin}
                          </p>
                        )}
                        {vendorDetails?.cin && (
                          <p className="mb-1">
                            <b>Company CININ</b> : {vendorDetails?.cin}
                          </p>
                        )}
                      </>
                    ) : (
                      <button
                        id="signup_contact_info-company_info-vendor_profile"
                        type="button"
                        className="w-100 btn btn-secondary border-0 my-3"
                        onClick={() => {
                          handleChange(setActiveAuthTab("register"));
                          handleChange(setOpenAuthModal(true));
                        }}
                      >
                        Signup to get Contact Information
                      </button>
                    )}
                  </div>
                </div>
                <hr />

                {/* Identity, Compliance & Banking */}
                {isLoggedin &&
                  ((vendorDetails?.compliance_docs &&
                    vendorDetails.compliance_docs.length > 0) ||
                    vendorDetails?.bank_details?.account_holder_name) && (() => {
                    const docByType = (type) =>
                      (vendorDetails?.compliance_docs || []).find(
                        (d) => d.document_type === type
                      );
                    const panDoc = docByType("pan");
                    const gstDoc = docByType("gst");
                    const msmeDoc = docByType("msme");
                    const fssaiDoc = docByType("fssai");
                    const chequeDoc = docByType("cancelled_cheque");
                    const bank = vendorDetails?.bank_details || {};

                    const identityRows = [
                      { label: "PAN", value: panDoc?.document_number, docUrl: panDoc?.document_url },
                      { label: "GSTIN", value: vendorDetails?.gstin, docUrl: gstDoc?.document_url },
                      { label: "CIN", value: vendorDetails?.cin, docUrl: null },
                      { label: "IEC", value: vendorDetails?.import_export_code, docUrl: null },
                      { label: "MSME / Udyam", value: msmeDoc?.document_number, docUrl: msmeDoc?.document_url },
                      { label: "FSSAI", value: fssaiDoc?.document_number, docUrl: fssaiDoc?.document_url },
                    ];

                    const hasBank = bank?.account_holder_name || bank?.bank_name || bank?.ifsc_code || bank?.account_number_masked;

                    const bankRows = [
                      { label: "Account Holder", value: bank.account_holder_name, mono: false },
                      { label: "Bank Name", value: bank.bank_name, mono: false },
                      { label: "Account Number", value: bank.account_number_masked, mono: true },
                      { label: "IFSC Code", value: bank.ifsc_code, mono: true },
                    ];

                    return (
                      <div className="py-3">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <h2 className="title mb-0">Identity & Compliance</h2>
                          <button
                            type="button"
                            onClick={handleDownloadVendorData}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f8fafc";
                              e.currentTarget.style.borderColor = "#94a3b8";
                              e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.06)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "white";
                              e.currentTarget.style.borderColor = "#cbd5e1";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            className="d-inline-flex align-items-center gap-1"
                            style={{
                              fontSize: "0.8125rem",
                              color: "#475569",
                              fontWeight: 500,
                              padding: "5px 12px",
                              border: "1px solid #cbd5e1",
                              background: "white",
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
                            }}
                          >
                            <BiDownload size={14} /> Download Data
                          </button>
                        </div>

                        {/* Registration IDs (with inline document links) */}
                        <div className="mb-3">
                          <div className="text-muted text-uppercase fw-semibold mb-2"
                               style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                            Registration IDs
                          </div>
                          <div className="border rounded overflow-hidden">
                            <div className="row g-0">
                              {identityRows.map((row, i) => {
                                const isClickable = !!row.docUrl;
                                const Wrap = isClickable ? "a" : "div";
                                const wrapExtraProps = isClickable
                                  ? {
                                      href: row.docUrl,
                                      target: "_blank",
                                      rel: "noopener noreferrer",
                                      onMouseEnter: (e) => (e.currentTarget.style.background = "#f8fafc"),
                                      onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"),
                                    }
                                  : {};
                                return (
                                  <Wrap
                                    key={row.label}
                                    {...wrapExtraProps}
                                    className={`col-md-6 px-3 py-2 d-block text-decoration-none text-body ${
                                      i < identityRows.length - (identityRows.length % 2 === 0 ? 2 : 1)
                                        ? "border-bottom"
                                        : ""
                                    }`}
                                    style={{
                                      ...(i % 2 === 0 ? { borderRight: "1px solid #dee2e6" } : {}),
                                      ...(isClickable
                                        ? {
                                            cursor: "pointer",
                                            background: "transparent",
                                            transition: "background 120ms ease",
                                          }
                                        : {}),
                                    }}
                                  >
                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                      <div className="flex-grow-1 min-w-0">
                                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                          {row.label}
                                        </div>
                                        <div className="font-monospace text-break" style={{ fontSize: "0.875rem" }}>
                                          {row.value || <span className="text-muted">—</span>}
                                        </div>
                                      </div>
                                      {row.docUrl && (
                                        <span
                                          className="d-inline-flex align-items-center gap-1 flex-shrink-0"
                                          style={{
                                            fontSize: "0.8125rem",
                                            color: "#475569",
                                            fontWeight: 500,
                                          }}
                                        >
                                          View
                                          <BiLinkExternal size={13} />
                                        </span>
                                      )}
                                    </div>
                                  </Wrap>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Banking */}
                        {hasBank && (
                          <div className="mb-2">
                            <div className="text-muted text-uppercase fw-semibold mb-2"
                                 style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                              Banking
                            </div>
                            <div className="border rounded overflow-hidden">
                              <div className="row g-0">
                                {bankRows.map((row, i) => (
                                  <div
                                    key={row.label}
                                    className="col-md-3 px-3 py-2"
                                    style={i < bankRows.length - 1 ? { borderRight: "1px solid #dee2e6" } : {}}
                                  >
                                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                      {row.label}
                                    </div>
                                    <div
                                      className={row.mono ? "font-monospace" : ""}
                                      style={{ fontSize: "0.875rem" }}
                                    >
                                      {row.value || <span className="text-muted">—</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {chequeDoc?.document_url && (
                                <a
                                  href={chequeDoc.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                  className="d-flex align-items-center px-3 py-2 border-top text-decoration-none text-body"
                                  style={{
                                    cursor: "pointer",
                                    background: "transparent",
                                    transition: "background 120ms ease",
                                  }}
                                >
                                  <div className="me-3 text-muted d-flex">
                                    <BiFile size={18} />
                                  </div>
                                  <div className="flex-grow-1" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                    Cancelled Cheque
                                  </div>
                                  <span
                                    className="d-inline-flex align-items-center gap-1 ms-2"
                                    style={{
                                      fontSize: "0.8125rem",
                                      color: "#475569",
                                      fontWeight: 500,
                                    }}
                                  >
                                    View
                                    <BiLinkExternal size={13} />
                                  </span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                {isLoggedin &&
                  ((vendorDetails?.compliance_docs &&
                    vendorDetails.compliance_docs.length > 0) ||
                    vendorDetails?.bank_details?.account_holder_name) && <hr />}

                {/* Certification and other documents */}
                {vendorDetails?.vendor_info?.length > 0 && (
                  <div className="container py-4">
                    <h3 className="mb-4 fw-bold border-bottom pb-2">
                      Vendor Documents & Media
                    </h3>

                    {[
                      "payment_terms",
                      "project_document",
                      "product_image",
                      "product_video",
                      "certification",
                    ].map((type) => {
                      const documents = vendorDetails.vendor_info.filter(
                        (doc) => doc.file_type === type
                      );

                      // if (type !== "payment_terms" && documents.length === 0) return null;

                      const sectionTitles = {
                        payment_terms: "Payment Terms",
                        project_document: "Projects Completed",
                        product_image: "Product Images",
                        product_video: "Product Videos",
                        certification: "Certifications",
                      };

                      const sectionIcons = {
                        payment_terms: "bi-cash-stack",
                        project_document: "bi-folder2-open",
                        product_image: "bi-images",
                        product_video: "bi-play-btn",
                        certification: "bi-award",
                      };

                      // 🧠 Handle Payment Terms separately
                      if (type === "payment_terms") {
                        const terms = paymentTermsRows || [];
                        // console.log("Rendering payment terms:", terms);

                        if (terms.length === 0) return null;

                        return (
                          <div key={type} className="mb-5">
                            {/* Section Header */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h5 className="text-dark fw-semibold mb-0">
                                <i
                                  className={`${sectionIcons[type]} me-2 text-primary`}
                                ></i>
                                {sectionTitles[type]}
                              </h5>
                              <span className="badge bg-primary rounded-pill">
                                {terms.length}
                              </span>
                            </div>

                            {/* Static display of payment terms */}
                            <div className="table-responsive">
                              <table className="table table-bordered align-middle mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th style={{ width: "15%" }}>
                                      % of Amount
                                    </th>
                                    <th style={{ width: "20%" }}>Type</th>
                                    <th style={{ width: "15%" }}>
                                      Credit Days
                                    </th>
                                    <th>Comment / Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {terms.map((term, index) => (
                                    <tr key={index}>
                                      <td>{term.value || "-"}</td>
                                      <td className="text-capitalize">
                                        {term.type || "-"}
                                      </td>
                                      <td>
                                        {term.type === "credit"
                                          ? term.days || "-"
                                          : "-"}
                                      </td>
                                      <td>{term.comment || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }

                      // 🧱 Existing media/document sections (unchanged)
                      return (
                        <div key={type} className="mb-5">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="text-dark fw-semibold mb-0">
                              <i
                                className={`${sectionIcons[type]} me-2 text-primary`}
                              ></i>
                              {sectionTitles[type]}
                            </h5>
                            <span className="badge bg-primary rounded-pill">
                              {documents.length}
                            </span>
                          </div>

                          <div className="row g-4">
                            {documents.map((doc) => (
                              <div className="col-md-4 col-sm-6" key={doc.id}>
                                <div className="card h-100 border-0 shadow-sm">
                                  <div className="card-body">
                                    <MediaRender
                                      fileUrl={doc.file_url}
                                      fileName={doc.file_name}
                                      fileType={doc.file_type}
                                    />
                                    <div className="mt-2">
                                      <small className="text-muted">
                                        Uploaded:{" "}
                                        {formatDisplayDate(doc.created_at)}
                                      </small>
                                      {doc.is_approved && (
                                        <span className="badge bg-success ms-2">
                                          <i className="bi bi-check-circle me-1"></i>
                                          Approved
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subscribed Categories */}
                {vendorDetails?.subscribed_categories &&
                  vendorDetails.subscribed_categories.length > 0 && (() => {
                    const groups = new Map();
                    vendorDetails.subscribed_categories.forEach((sub) => {
                      const groupKey =
                        sub.item_type === "subcategory" && sub.parent_title
                          ? sub.parent_title
                          : sub.title;
                      if (!groups.has(groupKey)) groups.set(groupKey, []);
                      groups.get(groupKey).push(sub);
                    });
                    const groupEntries = Array.from(groups.entries());

                    return (
                      <div className="vendor-profile-sec-con-3 hasFullLoader py-3">
                        {loading && <FullLoader />}
                        <div className="d-flex align-items-baseline justify-content-between mb-3">
                          <h2 className="title mb-0">Subscribed Categories</h2>
                        </div>

                        <div className="border rounded">
                          {groupEntries.map(([groupTitle, items], idx) => (
                            <div
                              key={groupTitle}
                              className={`px-3 py-2 ${
                                idx < groupEntries.length - 1 ? "border-bottom" : ""
                              }`}
                            >
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                  {groupTitle}
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                  {items.map((sub) => {
                                    const isActive = sub.display_status === "active";
                                    const dateLabel = sub.end_date
                                      ? isActive
                                        ? `Until ${formatDisplayDate(sub.end_date)}`
                                        : `Expired ${formatDisplayDate(sub.end_date)}`
                                      : "";
                                    return (
                                      <span
                                        key={sub.subscription_id}
                                        className="d-inline-flex align-items-center gap-2"
                                        style={{ fontSize: "0.75rem" }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: "50%",
                                            backgroundColor: isActive ? "#10b981" : "#9ca3af",
                                            display: "inline-block",
                                          }}
                                        />
                                        <span
                                          style={{
                                            color: isActive ? "#065f46" : "#6b7280",
                                            fontWeight: 500,
                                          }}
                                        >
                                          {sub.item_type === "subcategory"
                                            ? sub.title
                                            : "All sub-categories"}
                                        </span>
                                        {dateLabel && (
                                          <span className="text-muted">· {dateLabel}</span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <hr className="mt-4" />
                      </div>
                    );
                  })()}

                {/* Vendor SPOC Section */}
                {isLoggedin && (
                  <div className="vendor-profile-sec-con-5 hasFullLoader">
                    {loading && <FullLoader />}
                    <div className="d-flex justify-content-between align-items-center">
                      <h2 className="title mb-0">Vendor SPOC Details</h2>
                      {isBuyer && (
                        <button
                          id="add_spoc-vendor_spoc_section-vendor_profile"
                          className="btn btn-primary"
                          onClick={() => setOpenAddSpoc(true)}
                          disabled={createLoading}
                        >
                          <i className="fas fa-plus me-2"></i>
                          Add SPOC
                        </button>
                      )}
                    </div>
                    {vendorDetails?.spoc_details &&
                      (vendorDetails.spoc_details.filter(
                        (spoc) => spoc.status === 1
                      ).length === 0 ? (
                        <p>No Approved SPOC Found!</p>
                      ) : (
                        <div className="row">
                          {vendorDetails.spoc_details
                            .filter((spoc) => spoc.status === 1) // Only show approved SPOCs
                            .map((spoc) => {
                              return (
                                <div
                                  className="col-md-4"
                                  key={`spoc_${spoc.id}_${spoc.user_id}`}
                                >
                                  <div className="card">
                                    <div className="card-body">
                                      <div className="card-title fs-5 fw-semibold mb-1">
                                        {spoc.name}
                                      </div>
                                      <div className="card-text">
                                        <p
                                          className="fw-semibold mb-2"
                                          style={{
                                            fontSize: "16px",
                                            color: "var(--primary-color)",
                                          }}
                                        >
                                          {spoc.role}
                                        </p>
                                        <p className="d-flex align-items-center mb-1">
                                          <FontAwesomeIcon
                                            icon={faEnvelope}
                                            className="me-2"
                                          />
                                          <span className="text-sm">
                                            {spoc.email}
                                          </span>
                                        </p>
                                        <p className="d-flex align-items-center mb-2">
                                          <FontAwesomeIcon
                                            icon={faPhone}
                                            fontSize={14}
                                            className="me-2"
                                          />
                                          <span className="text-sm">
                                            {spoc.mobile}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* ------------- Auth Modal ------------- */}
        <LoginContainer
          loading={loading}
          setloading={setloading}
          openAuthModal={openAuthModal}
          setOpenAuthModal={setOpenAuthModal}
          activeAuthTab={activeAuthTab}
          setActiveAuthTab={setActiveAuthTab}
        />
        {openAddSpoc && (
          <DynamicFormSpoc
            type="create-spoc"
            spocData={{}}
            openModal={openAddSpoc}
            closeModal={() => setOpenAddSpoc(false)}
            handleSpoc={handleBuyerAddSpoc}
            handleEditSpoc={() => {}}
            countryCode={countryCode}
            pageRoute="vendor_profile_page"
          />
        )}
      </section>
    </>
  );
};

export default VendorProfile;
