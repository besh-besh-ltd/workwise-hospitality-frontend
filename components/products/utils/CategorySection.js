import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DynamicCard from '@/components/products/utils/DynamicCard';
import { getSubCategory } from '@/services/products';

export const CategorySection = ({ parent_id, slug }) => {
  const router = useRouter();
  const [subcategories, setSubCategories] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(parent_id);
  const [showAll, setShowAll] = useState(false);
  


  useEffect(() => {
    setSelectedParentId(parent_id);
  }, [parent_id]); // Add this effect to update state when prop changes

  useEffect(() => {
    if (!selectedParentId) return;
    
    getSubCategory({ parent_id: selectedParentId })
    .then((res) => {
      if (res.length === 0) {
        router.push(`/products/product-detailPage?category_id=${selectedParentId}`);
      } else {
        setSubCategories(res);
      }
    })
  
      .catch((err) => console.log('Error fetching subcategories:', err));
  }, [selectedParentId]);

  const handleCategoryClick = (sub) => {
    // Reset showAll when navigating to new category
    setShowAll(false);
    
    setSelectedParentId(sub.id);
    const currentPath = router.asPath.split('?')[0];
  const subcategorySlug = sub.title.toLowerCase().replace(/\s+/g, '-'); // Convert title to URL-friendly format
  router.push(`${currentPath}/${subcategorySlug}?category_id=${sub.id}`);
  };

  const visibleSubcategories = showAll ? subcategories : subcategories.slice(0, 9);

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
              image={sub.image || ''}
              title={sub.title}
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
            {showAll ? 'Show Less' : 'Show More'}
          </button>
        </div>
      )}
    </div>
  );
};
