import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DynamicCard from "@/components/products/utils/DynamicCard";

export const CategorySection = ({ subcategories }) => {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const handleCategoryClick = (sub) => {
    setShowAll(false);
    const currentPath = router.asPath.split("?")[0];
    router.push(`${currentPath}/${sub.slug}`);
  };

  const visibleSubcategories = showAll
    ? subcategories
    : subcategories.slice(0, 9);

  return (
    <div className="category-section p-3 mt-5">
      <div className="row justify-content-center g-4">
        {visibleSubcategories.map((sub) => (
          <div
            key={sub.id}
            className="col-12 col-sm-6 col-md-4 d-flex justify-content-center"
            onClick={() => handleCategoryClick(sub)}
          >
            <DynamicCard
              image={sub.image || ""}
              title={sub.title}
              sub={sub.slug}
              link={null} // No direct navigation, handled by onClick
              className="category-card"
            />
          </div>
        ))}
      </div>

      {subcategories.length > 9 && (
        <div className="text-center mt-4">
          <button
            className="btn btn-outline-primary px-5"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : "Show More"}
          </button>
        </div>
      )}
    </div>
  );
};
