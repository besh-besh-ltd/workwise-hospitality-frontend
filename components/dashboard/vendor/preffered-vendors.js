import React from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import StarRating from "../../StarRating";

const PrefferedVendors = () => {
  const handleRatingChange = (newRating) => {
    console.log("New Rating:", newRating);
    // You can use this newRating value as needed
  };

  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Preffered Vendors</h1>
        </div>
      </section>

      <section className="vendor-pref-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
                <div className="row filter">
                  <div className="col-md-8 searchbox ">
                    <input
                      type="search"
                      name="search"
                      id="search"
                      placeholder="Search"
                    />
                    <i>
                      <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </i>
                  </div>
                  <div className="col-md-4">
                    <div className="action-btm float-end">
                      <span>
                        <Link href="#" className="btn btn-primary">
                          Add Preffered Vendor
                        </Link>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="details-table">
                <div className="table-responsive">
                  <table className="table table-striped ">
                    <thead>
                      <tr>
                        <th>Vendor</th>
                        <th>Region</th>
                        <th>Contact info</th>
                        <th>Industry</th>
                        <th>Products</th>
                        <th>Rating</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Vendor’s Name</td>
                        <td>Kolkata</td>
                        <td>+91 1234567890</td>
                        <td>Mechanical</td>
                        <td>Pipes, Alloy steel, Carbon steel & 8 more</td>
                        <td>
                          <StarRating
                            totalStars={5}
                            onRatingChange={handleRatingChange}
                          />
                        </td>
                        <td>
                          <span>
                            <Link href="reviews-ratings" className="page-link">
                              View Details
                            </Link>
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Vendor’s Name</td>
                        <td>Kolkata</td>
                        <td>+91 1234567890</td>
                        <td>Mechanical</td>
                        <td>Pipes, Alloy steel, Carbon steel & 8 more</td>
                        <td>
                          <StarRating
                            totalStars={5}
                            onRatingChange={handleRatingChange}
                          />
                        </td>
                        <td>
                          <span>
                            <Link href="reviews-ratings" className="page-link">
                              View Details
                            </Link>
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Vendor’s Name</td>
                        <td>Kolkata</td>
                        <td>+91 1234567890</td>
                        <td>Mechanical</td>
                        <td>Pipes, Alloy steel, Carbon steel & 8 more</td>
                        <td>
                          <StarRating
                            totalStars={5}
                            onRatingChange={handleRatingChange}
                          />
                        </td>
                        <td>
                          <span>
                            <Link href="reviews-ratings" className="page-link">
                              View Details
                            </Link>
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Vendor’s Name</td>
                        <td>Kolkata</td>
                        <td>+91 1234567890</td>
                        <td>Mechanical</td>
                        <td>Pipes, Alloy steel, Carbon steel & 8 more</td>
                        <td>
                          <StarRating
                            totalStars={5}
                            onRatingChange={handleRatingChange}
                          />
                        </td>
                        <td>
                          <span>
                            <Link href="reviews-ratings" className="page-link">
                              View Details
                            </Link>
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Vendor’s Name</td>
                        <td>Kolkata</td>
                        <td>+91 1234567890</td>
                        <td>Mechanical</td>
                        <td>Pipes, Alloy steel, Carbon steel & 8 more</td>
                        <td>
                          <StarRating
                            totalStars={5}
                            onRatingChange={handleRatingChange}
                          />
                        </td>
                        <td>
                          <span>
                            <Link href="reviews-ratings" className="page-link">
                              View Details
                            </Link>
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Vendor’s Name</td>
                        <td>Kolkata</td>
                        <td>+91 1234567890</td>
                        <td>Mechanical</td>
                        <td>Pipes, Alloy steel, Carbon steel & 8 more</td>
                        <td>
                          <StarRating
                            totalStars={5}
                            onRatingChange={handleRatingChange}
                          />
                        </td>
                        <td>
                          <span>
                            <Link href="reviews-ratings" className="page-link">
                              View Details
                            </Link>
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Vendor’s Name</td>
                        <td>Kolkata</td>
                        <td>+91 1234567890</td>
                        <td>Mechanical</td>
                        <td>Pipes, Alloy steel, Carbon steel & 8 more</td>
                        <td>
                          <StarRating
                            totalStars={5}
                            onRatingChange={handleRatingChange}
                          />
                        </td>
                        <td>
                          <span>
                            <Link href="reviews-ratings" className="page-link">
                              View Details
                            </Link>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  </div>

                  <div className="pagination">
                    <div className="arrow-prev">
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </div>
                    <div className="arrow-next">
                      <FontAwesomeIcon icon={faChevronRight} />
                    </div>
                    <span>Page</span>
                    <input type="number" name="pno" id="pno" value={1} />{" "}
                    <span> of 5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PrefferedVendors;
