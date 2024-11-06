import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StarRating from "../../StarRating";
import {
  faEnvelope,
  faFilePdf,
  faTimesCircle,
} from "@fortawesome/free-regular-svg-icons";
import {
  faCheckCircle,
  faLocation,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter } from "next/router";
import {
  getPastRFQS,
  getVendorDetailsByID,
  provideReview,
} from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";
import { toast } from "react-toastify";
import { getProfile } from "@/services/Auth";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import Head from "next/head";


const VendorProfile = () => {
  const router = useRouter();
  const { id, origin, vendors } = router.query;
  const [loading, setloading] = useState(false);
  const [reviewLoading, setreviewLoading] = useState(false);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [showbackBtn, setshowbackBtn] = useState(false);
  const [pastrfqloading, setpastrfqloading] = useState(false);
  const [pastRFQs, setpastRFQs] = useState([]);
  const [reviewText, setreviewText] = useState("");
  const [rating, setrating] = useState(0);
  const [qualityOfWork, setqualityOfWork] = useState(0);
  const [onTimeDelivery, setOnTimeDelivery] = useState(0);
  const [trustWorthy, setTrustWorthy] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [canSubReviewUser, setcanSubReviewUser] = useState(true);
  const [avgRating, setavgRating] = useState(0);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [isLoggedin, setIsLoggedIn] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");


  useEffect(() => {
    setshowbackBtn(false);
    if (id != "") {
      getVendorProfile();
    }
    if (origin && origin == "create-rfq") {
      setshowbackBtn(true);
    }

    if (localStorage.getItem('token')) setIsLoggedIn(true)
    else setIsLoggedIn(false)

  }, [router]);

  useEffect(() => {
    if (isLoggedin) {
      getVendorPastRfq();
      canSubmitReview();
      calculateReviews();
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
      default: setrating(newRating);
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

  const canSubmitReview = async () => {
    const rsp = await getProfile();
    setcurrentUserProfile(rsp.data);
    if (vendorDetails) {
      let isP = vendorDetails?.reviews?.filter(
        (item) => item.reviewed_by == rsp.data.id
      );

      if (isP?.length > 0) {
        setcanSubReviewUser(false);
      } else {
        setcanSubReviewUser(false);
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
          <div className="row">
            <div className="col-md-3">
              <div className="user-profile hasFullLoader mb-4">

                {loading && <FullLoader />}
                <div className="user-img">
                  {!vendorDetails?.profile_image && (
                    <Image
                      src="/assets/images/vendor.png"
                      alt="Workwise"
                      width={164}
                      height={164}
                      priority={true}
                    />
                  )}

                  {vendorDetails?.profile_image && (
                    <Image
                      src={`http://localhost:8002/user_image/${vendorDetails?.profile_image?.split("/").pop()}`}
                      alt="Vendor Profile Image"
                      width={164}
                      height={164}
                      priority={true}
                    />
                  )}
                </div>

                <div className="user-details hasFullLoader mb-4">
                  {loading && <FullLoader />}
                  <h2>{vendorDetails?.vendor_name}</h2>
                  {vendorDetails?.status && vendorDetails?.status == 1 && (
                    <p>
                      <FontAwesomeIcon icon={faCheckCircle} /> Verified
                    </p>
                  )}
                  {vendorDetails?.status && vendorDetails?.status == 0 && (
                    <p>
                      <FontAwesomeIcon icon={faTimesCircle} /> Unverified
                    </p>
                  )}
                  {vendorDetails?.address && (
                    <p>
                      <FontAwesomeIcon icon={faLocation} />{" "}
                      {vendorDetails?.address}
                      {vendorDetails?.city_name && `, ${vendorDetails?.city_name}`}
                      {vendorDetails?.state_name && `, ${vendorDetails?.state_name}`}
                    </p>
                  )}
                  {vendorDetails?.gstin && (
                    <p>
                      <b>GSTIN</b> : {vendorDetails?.gstin}
                    </p>
                  )}
                  {vendorDetails?.cin && (
                    <p>
                      <b>CININ</b> : {vendorDetails?.cin}
                    </p>
                  )}

                  {vendorDetails?.website && (
                    <div>
                      <Link
                        href={vendorDetails?.website}
                        className="page-link btn btn-primary"
                      >
                        View Website
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="user-profile hasFullLoader mb-4">
                {loading && <FullLoader />}
                <h2>Past RFQ With The Vendor</h2>
                {pastRFQs && pastRFQs.length > 0 && (
                  <>
                    <div className="table-responsive">
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
                  </>
                )}
                {pastRFQs.length == 0 && <p>No past details yet!</p>}
              </div>

              {isLoggedin &&
                <div className="user-profile hasFullLoader mb-4">
                  {loading && <FullLoader />}
                  {reviewLoading && <FullLoader />}
                  <h2>Rating & Review</h2>
                  {vendorDetails?.reviews && vendorDetails?.reviews?.length == 0 && <p>No reviews yet!</p>}
                  {vendorDetails?.reviews && vendorDetails?.reviews?.length > 0 && (
                    <>
                      <StarRating
                        totalStars={5}
                        value={avgRating}
                      />
                      <p>
                        {avgRating.toFixed(1)} / 5 based on{" "}
                        {vendorDetails?.reviews?.length} reviews
                      </p>

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
                      <span onClick={submitReview} className="page-link btn btn-primary" > Submit Now </span>

                      <div className="review-container " >
                        <ul className="reviewList">
                          {vendorDetails?.reviews?.map((review, index) => {
                            if (
                              currentUserProfile &&
                              currentUserProfile.id == review.reviewed_by
                            ) {
                              return (
                                <li className="rounded-3" key={index}>
                                  <div className="imagearea">
                                    <img
                                      src={currentUserProfile?.profile_image}
                                      alt={currentUserProfile?.company_name}
                                    />
                                  </div>
                                  <div className="reviewarea">
                                    <div className="ratingArea flex-column">
                                      <p>
                                        <strong>{review.buyer}</strong>
                                      </p>
                                      <small>
                                        {review.rating}/5
                                        <StarRating
                                          totalStars={5}
                                          onRatingChange={null}
                                          value={review.rating}
                                        />
                                      </small>
                                    </div>
                                    <p className="text-sm">{review.description}</p>
                                  </div>
                                </li>
                              );
                            }
                          })}
                        </ul>
                      </div>
                    </>
                  )}
                </div>}
            </div>

            <div className="col-md-9 ">
              <div className="vendor-profile-sec-con">
                <div className="row vendor-profile-sec-con-1 hasFullLoader">
                  {loading && <FullLoader />}
                  <h2 className="title">
                    {vendorDetails?.vendor_name}
                  </h2>
                  {vendorDetails?.profile && <p>{vendorDetails?.profile}</p>}
                  {!vendorDetails?.profile && <p>No description to show!</p>}
                </div>
                <hr />

                <div className="row vendor-profile-sec-con-2 hasFullLoader">
                  {loading && <FullLoader />}
                  <div className="col-md-7">
                    <h2 className="title">Company information</h2>
                    {!vendorDetails?.nature_of_business &&
                      !vendorDetails?.no_of_employess &&
                      !vendorDetails?.import_export_code &&
                      !vendorDetails?.certifications &&
                      !vendorDetails?.mobile &&
                      !vendorDetails?.email &&
                      <p>No information to show!</p>
                    }
                    {vendorDetails?.nature_of_business && (
                      <p>
                        <b>Nature of Business</b> :
                        {vendorDetails?.nature_of_business}
                      </p>
                    )}
                    {vendorDetails?.no_of_employess && (
                      <p>
                        <b>Number of Employees</b> :{" "}
                        {vendorDetails?.no_of_employess}
                      </p>
                    )}
                    {vendorDetails?.import_export_code && (
                      <p>
                        <b>Import Export code</b> :{" "}
                        {vendorDetails?.import_export_code}
                      </p>
                    )}
                    {vendorDetails?.certifications && (
                      <p>
                        <b>Certification</b> : {vendorDetails?.certifications}
                      </p>
                    )}
                    {isLoggedin && <>
                      {vendorDetails?.mobile && (
                        <p>
                          <FontAwesomeIcon icon={faPhone} /> {" "}{vendorDetails?.mobile}
                        </p>
                      )}
                      {vendorDetails?.email && (
                        <p>
                          <FontAwesomeIcon icon={faEnvelope} />{" "}{vendorDetails?.email}
                        </p>
                      )}
                    </>
                    }
                  </div>
                  <div className="col-md-5 brochure-container">
                    <h2 className="title">Brochure</h2>
                    {vendorDetails?.brochure &&
                      vendorDetails?.brochure?.length == 0 && (
                        <p>No information to show!</p>
                      )}
                    {vendorDetails?.brochure &&
                      vendorDetails?.brochure?.length > 0 && (
                        <div className="broucher-sec">
                          <div>
                            {/\.(pdf|docx?|xlsx?|csv)$/i.test(vendorDetails?.brochure[0]?.brochure_url) ? (
                              <h2 className="pdf-icon">
                                <FontAwesomeIcon icon={faFilePdf} />
                              </h2>
                            ) : (
                              <Image
                                src={vendorDetails?.brochure[0]?.brochure_url}
                                alt="Workwise"
                                width={135}
                                height={164}
                                priority={true}
                              />
                            )}
                          </div>
                          <div className="actions">
                            <Link
                              target="_blank"
                              href={vendorDetails?.brochure[0]?.brochure_url}
                              className="page-link btn btn-primary"
                            >
                              View Brochure
                            </Link>
                            <a
                              target="_blank"
                              href={vendorDetails?.brochure[0]?.brochure_url}
                              download
                              className="page-link btn btn-primary"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                  </div>
                  {!isLoggedin &&
                    <div className="w-100 d-flex justify-content-center align-items-center">

                      <button
                        type="button"
                        className="w-50 btn btn-secondary my-3"
                        onClick={() => {
                          handleChange(setActiveAuthTab("register"))
                          handleChange(setOpenAuthModal(true))
                        }}
                      >
                        Signup to get Contact Information
                      </button>
                    </div>
                  }
                </div>

                <hr />

                <div className="vendor-profile-sec-con-3 hasFullLoader">
                  {loading && <FullLoader />}
                  <h2 className="title">vendor’s Products</h2>

                  {vendorDetails?.product_list ? (
                    vendorDetails.product_list.length > 0 ? (
                      <div className="product-gallery row">
                        {vendorDetails.product_list.map((item, index) => (
                          <div key={item?.product_name || index} className="col-md-12">
                            {item?.product_name && (
                              <ul>
                                <li>{item.product_name}</li>
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No product found</p> // If product_list is empty
                    )
                  ) : (
                    <p>No product found</p> // If product_list is undefined or null
                  )}

                </div>
                <hr />
                <div className="vendor-profile-sec-con-4 hasFullLoader">
                  {loading && <FullLoader />}
                  <h2 className="title">Vendor Approved By</h2>

                  {vendorDetails?.product_list && vendorDetails.product_list.length === 0 ? (
                    <p>No information to show!</p>
                  ) : (
                    (() => {
                      // Filter products to include only those with at least one approved_by vendor
                      const approvedProducts = vendorDetails?.product_list?.filter(item => item.approved_by.length > 0) || [];

                      if (approvedProducts.length > 0) {
                        return (
                          <ul className="client-gallery row">
                            {approvedProducts.map((item) => (
                              <li key={`vendor-approve-${item.product_id}`}>
                                <span  >{item.product_name}</span>
                                <strong className="p-2" >:</strong>
                                {item.approved_by.map((element, index) => (
                                  <span className="fw-semibold" key={index}>
                                    {element.vendor_name}
                                    {index < item.approved_by.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </li>
                            ))}
                          </ul>
                        );
                      } else {
                        return <p>No product is approved</p>;
                      }
                    })()
                  )}
                </div>

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
