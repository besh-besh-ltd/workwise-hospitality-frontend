import React, { useEffect, useState } from 'react';
import DynamicCard from '@/components/products/utils/DynamicCard';
import { CATEGORIES } from '@/utils/constants';
import { getAllCategories, parentCategoryList } from '@/services/products';

export const AllCategoriesSection = ({ allCategories }) => {
  const [showAll, setShowAll] = useState(false);
  // const [categories, setCategories] = useState([]);
  // const [allCategories , setAllCategories] = useState([]);
  const visibleCategories = showAll ? CATEGORIES : CATEGORIES.slice(0, 6);
   


  // const buildTree = async (data) => {
  //   const map = {};
  //   const roots = [];

  //   // Initialize the map
  //   data.forEach((item) => {
  //     map[item.id] = { ...item, children: [] };
  //   });

  //   // Build the tree
  //   data.forEach((item) => {
  //     if (item.parent_id !== 0) {
  //       if (map[item.parent_id]) {
  //         map[item.parent_id].children.push(map[item.id]);
  //       }
  //     } else {
  //       roots.push(map[item.id]);
  //     }
  //   });

  //   return roots;
  // };

  //  useEffect(()=>{
  //           getAllCategories(1, 1000)
  //           .then(async (res)=>{
  //            let transformedCategory = await buildTree(res?.data);
  //            setAllCategories(transformedCategory)
  //          })
           
  //    },[])




//  useEffect(() => {
//   parentCategoryList().
//   then((res) => {
//     setCategories(res.data);
//   } )
//   .catch((err) => {
//     console.log(err);
//   }); 
// }, []);



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