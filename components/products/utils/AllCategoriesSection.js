import React, { useEffect, useState } from 'react';
import DynamicCard from '@/components/products/utils/DynamicCard';
import { CATEGORIES } from '@/utils/constants';

export const AllCategoriesSection = ({ allCategories }) => {
  const [showAll, setShowAll] = useState(false);

  return (
    <>
      <h2 className="text-center font-semibold mb-5">All Categories</h2>
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-3 g-4">
        {Array.isArray(allCategories) &&
          allCategories.map((item) => (
            <div key={item.id} className="col d-flex justify-content-center">
              <DynamicCard
                image={item?.image || ""}
                title={item.title}
                styleType="circular"
                link={`/products/${item.title.toLowerCase()}`}
              />
            </div>
          ))}
      </div>

      {CATEGORIES.length > 6 && (
        <div className="text-center mt-4">
          <button
            className="btn btn-outline-primary px-5"
            onClick={() => setShowAll(!showAll)} // Toggle showAll
          >
            {showAll ? "Show Less" : "Show More"}
          </button>
        </div>
      )}
    </>
  );
};