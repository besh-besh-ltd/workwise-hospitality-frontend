// components/StarRating.js
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar as farStar,
  faStarHalfAlt,
} from "@fortawesome/free-regular-svg-icons";
import { faStar as fasStar } from "@fortawesome/free-solid-svg-icons";

const StarRating = ({ type, totalStars, onRatingChange, value = 0 }) => {
  const [rating, setRating] = useState(0);

  useEffect(() => {
    setRating(value)
  }, [value])


  const handleStarClick = (selectedRating) => {
    if (value == 0) {
      setRating(selectedRating);
      onRatingChange(type, selectedRating);
    }
  };

  return (
    <div key={type}>
      {[...Array(totalStars)].map((star, index) => {
        const fullStarValue = index + 1;
        const halfStarValue = index + 0.5;

        return (
          <FontAwesomeIcon
            key={index}
            icon={
              fullStarValue <= rating
                ? fasStar
                : halfStarValue <= rating
                  ? faStarHalfAlt
                  : farStar
            }
            color={fullStarValue <= rating || halfStarValue <= rating
              ? "#FFD700"
              : "#C0C0C0"
            }
            onClick={() => handleStarClick(index + 1)}
            style={{ cursor: "pointer" }}
          />
        )
      }
      )}
    </div>
  );
};

export default StarRating;
