import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import StarRating from "../../StarRating";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import Link from "next/link";
import Image from "next/image";
import { getReviews } from "@/services/Auth";
import Loader from "@/components/shared/Loader";
import moment from "moment";

const ReviewRating = () => {
  const [loading, setloading] = useState(false);
  const [reviews, setreviews] = useState([]);

  useEffect(() => {
    setloading(true);
    getReviews()
      .then((res) => {
        setloading(false);
        setreviews(res.data);
      })
      .catch((err) => {
        setloading(false);
      });
  }, []);

  const handleRatingChange = (newRating) => {
    console.log("New Rating:", newRating);
    // You can use this newRating value as needed
  };

  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Reviews & Ratings</h1>
        </div>
      </section>

      <section className="vendor-pref-sec-1 reviews-ratings">
        {loading && <Loader />}
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
                <div className="details-table">
                  <div className="table-responsive">
                    <table className="table table-striped ">
                      <thead>
                        <tr>
                          <th>Buyer</th>
                          <th>Review</th>
                          <th>Rating</th>
                          <th>Dated</th>
                          {/* <th>Action</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {reviews &&
                          reviews.map((item) => {
                            return (
                              <tr key={item.id}>
                                <td>
                                  {item.image_url ? <Image
                                    src={item.image_url}
                                    alt="Workwise"
                                    width={48}
                                    height={48}
                                    priority={true}
                                  />:<Image
                                  src="/assets/images/vendor-user.png"
                                  alt="Workwise"
                                  width={48}
                                  height={48}
                                  priority={true}
                                />}
                                 
                                  {item?.buyer_name}
                                </td>
                                <td>
                                  {item.description}
                                </td>
                                <td>
                                  <span>{item.rating}/5</span>
                                  <StarRating
                                    totalStars={5}
                                    value={item.rating}
                                    onRatingChange={null}
                                  />
                                </td>
                                <td>{moment(item.review_date).format('D MMMM, YYYY')}</td>
                                {/* <td>
                                  <span>
                                    <FontAwesomeIcon
                                      icon={faEdit}
                                      title="Edit"
                                    />
                                  </span>
                                </td> */}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {/* <div className="table-btm">
                    <Link
                      href="reviews-ratings"
                      className="page-link btn btn-primary"
                    >
                      View All
                    </Link>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ReviewRating;
