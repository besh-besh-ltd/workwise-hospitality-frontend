import React, { useEffect, useState } from "react";
import Image from "next/image";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { faTimesCircle, faEnvelope, faFileLines } from "@fortawesome/free-regular-svg-icons";
import { faCheckCircle, faLocation, faPhone, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getProfile } from "@/services/Auth";
import {
  getPastRFQS,
  getVendorDetailsByID,
  provideReview,
} from "@/services/rfq";
import { toast } from "react-toastify";
import FullLoader from "@/components/shared/FullLoader";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import StarRating from "@/components/StarRating";
import ProductCarousel from "./product-carousel";
import moment from "moment";
import { faFacebook, faLinkedin, faSkype, faWhatsapp } from "@fortawesome/free-brands-svg-icons";


const VendorProfile = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setloading] = useState(false);
  const [reviewLoading, setreviewLoading] = useState(false);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [approvedProducts, setApprovedProducts] = useState(null);
  const [pastrfqloading, setpastrfqloading] = useState(false);
  const [pastRFQs, setpastRFQs] = useState([]);
  const [reviewText, setreviewText] = useState("");
  const [qualityOfWork, setqualityOfWork] = useState(0);
  const [onTimeDelivery, setOnTimeDelivery] = useState(0);
  const [trustWorthy, setTrustWorthy] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [canSubmitReview, setCanSubmitReview] = useState(true);
  const [avgRating, setavgRating] = useState(0);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [isLoggedin, setIsLoggedIn] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");


  useEffect(() => {
    if (id != "") {
      getVendorProfile();
    }
  }, [router]);

  useEffect(() => {
    if (isLoggedin) {
      getVendorPastRfq();
      getBuyerProfile();
    }
  }, [vendorDetails]);


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
      getVendorDetailsByID(id)
        .then((res) => {
          setloading(false);
          setVendorDetails(res.data);
          const approvedList = res.data.product_list?.filter((prod) => prod?.approved_by.length > 0);
          setApprovedProducts(approvedList);
          setIsLoggedIn(res.logged_In);
        })
        .catch((err) => {
          setloading(false);
          console.error(err);
        });
    }
  };

  const handleRatingChange = (type, newRating) => {
    switch (type) {
      case 'qualityOfWork':
        setqualityOfWork(newRating);
        break;
      case 'onTimeDelivery':
        setOnTimeDelivery(newRating);
        break;
      case 'trustWorthy':
        setTrustWorthy(newRating);
        break;
      case 'overallRating':
        setOverallRating(newRating);
        break;
      default: console.log("Enter a Valid Option");
    }
  };

  const handleChange = (setState) => (event) => {
    setState(event);
  };

  const submitReview = (e) => {
    setreviewLoading(true);
    e.preventDefault();
    provideReview({
      reviewed_to: id,
      description: reviewText,
      quality_of_work: qualityOfWork,
      on_time_delivery: onTimeDelivery,
      trustworthiness_reliability: trustWorthy,
      overall_rating: overallRating
    })
      .then((res) => {
        setreviewLoading(false);
        getVendorProfile();
        toast.success(res.message);
      })
      .catch((err) => {
        setreviewLoading(false);
      });
  };

  const getBuyerProfile = async () => {
    const res = await getProfile();
    setcurrentUserProfile(res.data);
    calculateReviews();
    if (vendorDetails) {
      let alreadyReviewed = vendorDetails?.reviews?.some(
        (item) => item.reviewed_by == res.data.id
      );
      if (alreadyReviewed) {
        setCanSubmitReview(false);
      }
    }
  };

  const calculateReviews = () => {
    let totalRating = 0;
    vendorDetails?.reviews?.map((item) => {
      totalRating = totalRating + item.rating;
    });
    let avgRating = parseFloat(totalRating) / vendorDetails?.reviews?.length;
    setavgRating(avgRating);
  };

  return (
    <>
      <Head>
        <title>Vendor Profile | Workwise</title>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "http://schema.org",
            "@type": "Organization",
            "name": vendorDetails?.vendor_name,
            "description": vendorDetails?.profile,
            "url": vendorDetails?.website,
            "logo": vendorDetails?.profile_image_url,
            "telephone": vendorDetails?.mobile,
            "email": vendorDetails?.email,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": vendorDetails?.address,
              "addressLocality": vendorDetails?.city_name,
              "addressRegion": vendorDetails?.state_name,
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": vendorDetails?.mobile,
              "contactType": "customer service"
            },
            "offers": {
              "@type": "Offer",
              "offeredBy": {
                "@type": "Organization",
                "name": vendorDetails?.company_name
              },
              "itemOffered": vendorDetails?.product_list.map(item => ({
                "@type": "Product",
                "name": item?.product_name,
                "description": item?.product_description,
                "productID": item?.product_id
              }))
            }
          })}
        </script>

        <meta property="og:title" content="Vendor Profile | Workwise" />
        <meta property="og:description" content={vendorDetails?.profile} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={vendorDetails?.website} />
        <meta property="og:image" content={vendorDetails?.profile_image_url} />
        <meta property="og:site_name" content="Workwise" />
      </Head>

      <section className="vendor-common-header sc-pt-80" aria-label="vendor-profile-page">
        <div className="container-fluid">
          <h1 className="heading">Vendor’s profile</h1>
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
                  {vendorDetails?.profile_image ? (
                    <Image
                      src={vendorDetails?.profile_image}
                      alt="Vendor Profile Image"
                      width={164}
                      height={164}
                      priority={true}
                    />
                  ) : (
                    <Image
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
                  <h2 className="mb-1">{vendorDetails?.vendor_name}</h2>
                  {vendorDetails?.status == 1
                    ? <p><FontAwesomeIcon icon={faCheckCircle} /> Verified</p>
                    : <p><FontAwesomeIcon icon={faTimesCircle} /> Unverified</p>
                  }
                  {vendorDetails?.address && (
                    <p>
                      <FontAwesomeIcon icon={faLocation} />{" "}
                      {vendorDetails?.address}
                      {vendorDetails?.city_name && `, ${vendorDetails?.city_name}`}
                      {vendorDetails?.state_name && `, ${vendorDetails?.state_name}`}
                    </p>
                  )}

                  {(vendorDetails?.linkedin || vendorDetails?.facebook || vendorDetails?.whatsapp || vendorDetails?.skype) &&
                    <div className="d-flex justify-content-around w-75 border p-2 rounded-3 mx-auto">
                      <Link href={vendorDetails?.linkedin ? vendorDetails?.linkedin : '#'} >
                        <FontAwesomeIcon icon={faLinkedin} fontSize={24} /></Link>
                      <Link href={vendorDetails?.facebook ? vendorDetails?.facebook : '#'} >
                        <FontAwesomeIcon icon={faFacebook} fontSize={24} /></Link>
                      <Link href={vendorDetails?.whatsapp ? vendorDetails?.whatsapp : '#'} >
                        <FontAwesomeIcon icon={faWhatsapp} fontSize={24} /></Link>
                      <Link href={vendorDetails?.skype ? vendorDetails?.skype : '#'} >
                        <FontAwesomeIcon icon={faSkype} fontSize={24} /></Link>
                    </div>
                  }
                </div>

              </div>

              {/* Vendor Approved by Section */}
              <div className="user-profile hasFullLoader mb-4">
                {loading && <FullLoader />}
                <h2 className="title">Product Approvals</h2>
                {approvedProducts && approvedProducts.length === 0 ? (
                  <p>Vendor Products are not Approved!</p>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: "450px", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    <table className="table table-bordered">
                      <tbody>
                        {approvedProducts?.map((approvedProd) => {
                          return (
                            <tr key={`approved_${approvedProd.product_id}`}>
                              <td>
                                <p className="fw-medium mb-1" style={{ color: "var(--primary-color)" }}>{approvedProd.product_name}</p>
                                {approvedProd.approved_by.map((approveItem) => {
                                  return (
                                    <div
                                      key={`approve_id_${approveItem.vendor_approve_id}`}
                                      className="badge badge-warning me-2"
                                      style={{ padding: "6px", fontSize: "11px" }}
                                    >
                                      {approveItem.vendor_name}
                                    </div>
                                  )
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
                }
              </div>

              {/* Past RFQ's with the vendor List */}
              <div className="user-profile hasFullLoader mb-4">
                {pastrfqloading && <FullLoader />}
                <h2>Past RFQ With The Vendor</h2>
                {pastRFQs &&
                  pastRFQs.length > 0 && (
                    <div className="table-responsive" style={{ maxHeight: "440px", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
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
                  <h2 className="title">
                    {vendorDetails?.vendor_name}
                  </h2>
                  <p>{!loading && (vendorDetails?.profile || "No Information to show.")}</p>
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
                        <b>Annual Turnover</b> :{" "}
                        {vendorDetails?.turnover}{" Crore"}
                      </p>
                    )}
                    {vendorDetails?.certifications && (
                      <p className="mb-1">
                        <b>Certification</b> : {" "}
                        {vendorDetails?.certifications}
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
                        {vendorDetails?.mobile && (
                          <p className="mb-1">
                            <b>Contact Number</b> : {" "}
                            {vendorDetails?.mobile}
                          </p>
                        )}
                        {vendorDetails?.email && (
                          <p className="mb-1">
                            <b>Contact Email</b> : {" "}
                            {vendorDetails?.email}
                          </p>
                        )}
                        {vendorDetails?.gstin && (
                          <p className="mb-1">
                            <b>Company GSTIN</b> : {" "}
                            {vendorDetails?.gstin}
                          </p>
                        )}
                        {vendorDetails?.cin && (
                          <p className="mb-1">
                            <b>Company CININ</b> : {" "}
                            {vendorDetails?.cin}
                          </p>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="w-100 btn btn-secondary border-0 my-3"
                        onClick={() => {
                          handleChange(setActiveAuthTab("register"))
                          handleChange(setOpenAuthModal(true))
                        }}
                      >
                        Signup to get Contact Information
                      </button>
                    )}
                  </div>

                </div>
                <hr />

                {/* Vendor's Products List */}
                {vendorDetails?.product_list &&
                  vendorDetails.product_list.length > 0 && (
                    <div className="vendor-profile-sec-con-3 hasFullLoader">
                      {loading && <FullLoader />}
                      <h2 className="title">Vendor’s Products</h2>

                      {/* Product Carousel is ready whenever Product Image will be available uncomment this */}
                      {/* <ProductCarousel data={vendorDetails?.product_list} /> */}

                      {(vendorDetails?.product_list && vendorDetails?.product_list.length > 0) ?
                        (
                          <div className="row">
                            {vendorDetails?.product_list?.map((prodItem) => {
                              return (
                                <div key={`prod_${prodItem.id}`} className="col-sm-2 col-md-3 col-lg-4 mb-2">
                                  <div className="card">
                                    <div class="card-body">
                                      {/* <h5 class="card-title"></h5> */}
                                      <p class="card-text text-sm">{prodItem.product_name}</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) :
                        <p>NO Product List Available.</p>

                      }
                      <hr />
                    </div>
                  )
                }

                {/* Vendor SPOC Section */}
                {isLoggedin &&
                  <div className="vendor-profile-sec-con-5 hasFullLoader">
                    {loading && <FullLoader />}
                    <h2 className="title">Vendor SPOC Details</h2>
                    {vendorDetails?.spoc_details && (
                      vendorDetails.spoc_details.length == 0 ? <p>No SPOC Found!</p>
                        : <div className="row">
                          {vendorDetails.spoc_details.map((spoc) => {
                            return (
                              <div className="col-md-4" key={`spoc_${spoc.id}_${spoc.user_id}`}>
                                <div className="card">
                                  <div className="card-body">
                                    <div className="card-title fs-5 fw-semibold mb-1">{spoc.name}</div>
                                    <div className="card-text">
                                      <p className="fw-semibold mb-2" style={{ fontSize: "16px", color: "var(--primary-color)" }}>{spoc.role}</p>
                                      <p className="d-flex align-items-center mb-1">
                                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                                        <span className="text-sm">{spoc.email}</span>
                                      </p>
                                      <p className="d-flex align-items-center mb-2">
                                        <FontAwesomeIcon icon={faPhone} fontSize={14} className="me-2" />
                                        <span className="text-sm">{spoc.mobile}</span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                          }
                        </div>
                    )}

                  </div>
                }

              </div>

              <div className="vendor-profile-sec-con">
                {/* Vendor Rating Section */}
                {isLoggedin &&
                  <div className="hasFullLoader">
                    {reviewLoading && <FullLoader />}
                    <h2 className="title">Rating & Review</h2>
                    <div className="row">

                      <div className="col-md-5">
                        <p className="mb-2 fw-bold">Share Your Review with us</p>
                        <div className="d-flex justify-content-between mx-4 mb-2">
                          <span>Quality of Work</span>
                          <StarRating type={'qualityOfWork'} totalStars={5} onRatingChange={handleRatingChange} />
                        </div>
                        <div className="d-flex justify-content-between mx-4 mb-2">
                          <span>On Time Delivery</span>
                          <StarRating type={'onTimeDelivery'} totalStars={5} onRatingChange={handleRatingChange} />
                        </div>
                        <div className="d-flex justify-content-between mx-4 mb-2">
                          <span>Trustworthiness</span>
                          <StarRating type={'trustWorthy'} totalStars={5} onRatingChange={handleRatingChange} />
                        </div>
                        <div className="d-flex justify-content-between mx-4 mb-2">
                          <span>Overall Rating</span>
                          <StarRating type={'overallRating'} totalStars={5} onRatingChange={handleRatingChange} />
                        </div>
                        <p className="mt-3 fw-bold">Share more about your experience</p>
                        <textarea
                          style={{ width: "100%" }}
                          name="review"
                          id="review"
                          rows="5"
                          onChange={(e) => setreviewText(e.target.value)}
                          placeholder="Tell us something about your experience."
                        >
                        </textarea>
                        <div className="d-flex justify-content-center">
                          <button type="button" onClick={submitReview} className="page-link btn btn-primary me-0" > Submit Now </button>
                        </div>
                      </div>

                      <div className="col-md-7">
                        {vendorDetails?.reviews && (
                          vendorDetails?.reviews.length == 0 ? <p>No Reviews yet!</p> :
                            <>
                              <div className="d-flex justify-content-between">
                                <span className="mb-2 fw-bold">Vendor Reviews: </span>
                                <div className="d-flex flex-column mb-2">
                                  <StarRating
                                    totalStars={5}
                                    value={avgRating}
                                  />
                                  <span className="text-sm">
                                    {avgRating.toFixed(1)} / 5 based on{" "}
                                    {vendorDetails?.reviews?.length} reviews
                                  </span>
                                </div>
                              </div>

                              <div className="review-container" >
                                <ul className="reviewList">
                                  {vendorDetails?.reviews?.map((review, index) => {
                                    return (
                                      <li className="rounded-3" key={index}>
                                        <div className="imagearea">
                                          {(!review.new_profile_image && !review.original_profile_image)
                                            ? <FontAwesomeIcon icon={faUser} />
                                            : <img
                                              src={review.new_profile_image ||
                                                review.original_profile_image
                                              }
                                              alt={review.buyer}
                                            />
                                          }
                                        </div>
                                        <div className="reviewarea">
                                          <div className="d-flex justify-content-between">
                                            <div className="ratingArea flex-column">
                                              <p><strong>{review.buyer}</strong></p>
                                              <small>
                                                {review.rating}/5
                                                <StarRating
                                                  totalStars={5}
                                                  onRatingChange={null}
                                                  value={review.rating}
                                                />
                                              </small>
                                            </div>
                                            <small>{moment(review.review_date).format('DD-MMM-YYYY')}</small>
                                          </div>
                                          <p className="text-sm">{review.description}</p>
                                        </div>
                                      </li>
                                    )
                                  }
                                  )}
                                </ul>
                              </div>
                            </>
                        )}
                      </div>
                    </div>
                  </div>
                }
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
      </section>
    </>
  );
};

export default VendorProfile;
