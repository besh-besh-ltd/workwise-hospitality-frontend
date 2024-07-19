// components/StarRating.js
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar as farStar,
  faStarHalfAlt,
} from "@fortawesome/free-regular-svg-icons";
import { faStar as fasStar } from "@fortawesome/free-solid-svg-icons";

const StarRating = ({ totalStars, onRatingChange, value = 0 }) => {
  const [rating, setRating] = useState(0 );

  useEffect(() => {
    setRating(Math.round(value))
  }, [value])
  
 
  const handleStarClick = (selectedRating) => {
    if(value==0){
      setRating(selectedRating);
      onRatingChange(selectedRating);
    }
  };

  return (
    <div>
      {[...Array(totalStars)].map((star, index) => (
        <FontAwesomeIcon
          key={index}
          icon={
            index + 1 <= rating
              ? fasStar
              : index + 0.5 === rating
                ? faStarHalfAlt
                : farStar
          }
          color={index + 1 <= rating ? "#FFD700" : "#C0C0C0"}
          onClick={() => handleStarClick(index + 1)}
          style={{ cursor: "pointer" }}
        />
      ))}
    </div>
  );
};

export default StarRating;
