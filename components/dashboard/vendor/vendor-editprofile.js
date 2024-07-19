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
  faAngleLeft,
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
import { getProfile, getUserDetails } from "@/services/Auth";
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
  const [canSubReviewUser, setcanSubReviewUser] = useState(true);
  const [avgRating, setavgRating] = useState(0);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);

  useEffect(() => {
    setshowbackBtn(false);
    if (id != "") {
      getVendorProfile();
    }
    if (origin && origin == "create-rfq") {
      setshowbackBtn(true);
    }
  }, [router]);

  useEffect(() => {
    getVendorPastRfq();
    canSubmitReview();
    calculateReviews();
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

  const handleRatingChange = (newRating) => {
    setrating(newRating);
  };

  const submitReview = (e) => {
    setreviewLoading(true);
    e.preventDefault();
    provideReview({
      reviewed_to: id,
      rating: rating,
      description: reviewText,
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
      let isP = vendorDetails.reviews.filter(
        (item) => item.reviewed_by == rsp.data.id
      );

      if (isP.length > 0) {
        setcanSubReviewUser(false);
      } else {
        setcanSubReviewUser(false);
      }
    }
  };

  const calculateReviews = () => {
    let totalRating = 0;
    vendorDetails?.reviews.map((item) => {
      totalRating = totalRating + item.rating;
    });

    let avgRating = parseFloat(totalRating) / vendorDetails?.reviews.length;

    setavgRating(avgRating);
  };

  return (
    <>
      <Head>
        <title>Vendor Profile | Workwise</title>
      </Head>

      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Vendor’s profile</h1>
        </div>
      </section>

      <section className="vendor-profile-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-3">
              <div className="user-profile hasFullLoader mb-4">
                {showbackBtn && (
                  <Link
                    href={`/dashboard/buyer/rfq-management-vendor?vendors=${vendors}`}
                    className="page-link"
                  >
                    {" "}
                    <FontAwesomeIcon icon={faAngleLeft} /> Go Back
                  </Link>
                )}
                {loading && <FullLoader />}
                <div className="user-img">
                  {!vendorDetails?.profile_image_url && (
                    <Image
                      src="/assets/images/vendor.png"
                      alt="Workwise"
                      width={164}
                      height={164}
                      priority={true}
                    />
                  )}

                  {vendorDetails?.profile_image_url && (
                    <Image
                      src={vendorDetails?.profile_image_url}
                      alt="Workwise"
                      width={164}
                      height={164}
                      priority={true}
                    />
                  )}
                </div>

                <div className="user-details hasFullLoader mb-4">
                  {loading && <FullLoader />}
                  <h3>{vendorDetails?.vendor_name}</h3>
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
                  {/* <div>
                    <Link href="" className="page-link btn btn-primary">
                      Send Enquiry
                    </Link>
                  </div> */}

                  {/* <p>
                    <input type="checkbox" name="mark" id="mark" /> Mark
                    Preffered Vendor
                  </p> */}
                </div>
              </div>
              <div className="user-profile hasFullLoader mb-4">
                {loading && <FullLoader />}
                <h3>Past RFQ With The Vendor</h3>
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
                    {/* <div>
                      <Link href="" className="page-link btn btn-primary">
                        View All RFQs
                      </Link>
                    </div> */}
                  </>
                )}
                {pastRFQs.length == 0 && <p>No past details yet!</p>}
              </div>

              <div className="user-profile hasFullLoader mb-4">
                {loading && <FullLoader />}
                {reviewLoading && <FullLoader />}
                <h3>Rating & Review</h3>
                {vendorDetails?.reviews.length == 0 && <p>No reviews yet!</p>}
                {vendorDetails?.reviews.length > 0 && (
                  <>
                    <StarRating
                      totalStars={5}
                      onRatingChange={handleRatingChange}
                      value={avgRating}
                    />
                    <p>
                      {avgRating.toFixed(1)} / 5 based on{" "}
                      {vendorDetails?.reviews.length} reviews
                    </p>
                    <ul className="reviewList">
                      {vendorDetails?.reviews.map((review, index) => {
                        if (
                          currentUserProfile &&
                          currentUserProfile.id == review.reviewed_by
                        ) {
                          return (
                            <li key={index}>
                              <div className="imagearea">
                                <img
                                  src={currentUserProfile?.profile_image}
                                  alt={currentUserProfile?.company_name}
                                />
                              </div>
                              <div className="reviewarea">
                                <div className="ratingArea">
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
                                <p>{review.description}</p>
                              </div>
                            </li>
                          );
                        }
                      })}
                    </ul>
                  </>
                )}
                {1 == 1 && (
                  <>
                    <div>
                      <StarRating
                        totalStars={5}
                        onRatingChange={handleRatingChange}
                      />
                    </div>
                    <p>Share more about your experience</p>
                    <textarea
                      style={{ width: "100%" }}
                      name="review"
                      id="review"
                      rows="5"
                      onChange={(e) => setreviewText(e.target.value)}
                      placeholder="Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy lorem text."
                    ></textarea>
                    <div>
                      {
                        <Link
                          href=""
                          onClick={submitReview}
                          className="page-link btn btn-primary"
                        >
                          Submit Now
                        </Link>
                      }
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="col-md-9 ">
              <div className="vendor-profile-sec-con">
                <div className="row vendor-profile-sec-con-1 hasFullLoader">
                  {loading && <FullLoader />}
                  <h3 className="title">
                    About ({vendorDetails?.vendor_name})
                  </h3>
                  {vendorDetails?.profile && <p>{vendorDetails?.profile}</p>}
                  {!vendorDetails?.profile && <p>No description to show!</p>}
                </div>
                <hr />
                <div className="row vendor-profile-sec-con-2 hasFullLoader">
                  {loading && <FullLoader />}
                  <div className="col-md-7">
                    <h3 className="title">Company information</h3>
                    {!vendorDetails?.nature_of_business &&
                      !vendorDetails?.no_of_employess &&
                      !vendorDetails?.import_export_code &&
                      !vendorDetails?.certifications &&
                      !vendorDetails?.mobile &&
                      !vendorDetails?.email && <p>No information to show!</p>}
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
                    {vendorDetails?.mobile && (
                      <p>
                        <FontAwesomeIcon icon={faPhone} /> +91{" "}
                        {vendorDetails?.mobile}
                      </p>
                    )}
                    {vendorDetails?.email && (
                      <p>
                        <FontAwesomeIcon icon={faEnvelope} />{" "}
                        {vendorDetails?.email}
                      </p>
                    )}
                  </div>
                  <div className="col-md-5 brochure-container">
                    <h3 className="title">Brochure</h3>
                    {vendorDetails?.brochure &&
                      vendorDetails?.brochure.length == 0 && (
                        <p>No information to show!</p>
                      )}
                    {vendorDetails?.brochure &&
                      vendorDetails?.brochure?.length > 0 && (
                        <div className="broucher-sec">
                          <div>
                            {vendorDetails?.brochure[0].brochure_url.indexOf(
                              ".pdf"
                            ) > 0 ? (
                              <h2 className="pdf-icon">
                                <FontAwesomeIcon icon={faFilePdf} />
                              </h2>
                            ) : (
                              <Image
                                src={vendorDetails?.brochure[0].brochure_url}
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
                              href={vendorDetails?.brochure[0].brochure_url}
                              className="page-link btn btn-primary"
                            >
                              View Brochure
                            </Link>
                            <a
                              target="_blank"
                              href={vendorDetails?.brochure[0].brochure_url}
                              download
                              className="page-link btn btn-primary"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
                <hr />
                {/* <div className="row vendor-profile-sec-con-3 hasFullLoader">
                  {loading && <FullLoader />}
                  <h3 className="title">vendor’s Products</h3>
                  <p>
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry. Lorem Ipsum has been the industry's
                    standard dummy text ever since the 1500s, when an unknown
                    printer took.
                  </p>
                </div>
                <hr /> */}
                <div className="vendor-profile-sec-con-3 hasFullLoader">
                  {loading && <FullLoader />}
                  <h3 className="title">vendor’s Products</h3>
                  {vendorDetails?.product_images &&
                    vendorDetails?.product_images.length > 0 &&
                    !vendorDetails?.product_images[0].product_image_url && (
                      <p>No information to show!</p>
                    )}
                  {vendorDetails?.product_images &&
                    vendorDetails?.product_images.length > 0 && (
                      <div className="product-gallery row">
                        {vendorDetails?.product_images.map((item) => {
                          return (
                            <div
                              key={`product-item.product_image_url`}
                              className="col-md-4 gallery-con"
                            >
                              {item?.product_image_url && (
                                <img
                                  src={item?.product_image_url}
                                  alt={item?.product_image}
                                  width={255}
                                  height={212}
                                  priority={true}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>
                <hr />
                <div className="vendor-profile-sec-con-4 hasFullLoader">
                  {loading && <FullLoader />}
                  <h3 className="title">Vendor Approved By</h3>
                  {vendorDetails?.vendor_approve &&
                    vendorDetails?.vendor_approve.length == 0 && (
                      <p>No information to show!</p>
                    )}
                  {vendorDetails?.vendor_approve &&
                    vendorDetails?.vendor_approve.length > 0 && (
                      <div className="client-gallery">
                        {vendorDetails?.vendor_approve.map((item) => {
                          return (
                            <div
                              key={`vendor-approve-${item.id}`}
                              className="col-md-3 gallery-con"
                              title={item.vendor_approve}
                            >
                              <Image
                                src={item.vendor_approve_url}
                                alt={item.vendor_approve}
                                width={140}
                                height={106}
                                priority={true}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default VendorProfile;
