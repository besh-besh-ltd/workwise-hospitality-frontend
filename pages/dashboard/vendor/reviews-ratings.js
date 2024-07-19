import React from "react";
import ReviewRatingPage from "@/components/dashboard/vendor/reviews-ratings";
import Head from "next/head";
const ReviewRating = () => {
  return (
    <>
      <Head>
        <title>Workwise | Rating & Reviews</title>
      </Head>
      <ReviewRatingPage />
    </>
  );
};

export default ReviewRating;
