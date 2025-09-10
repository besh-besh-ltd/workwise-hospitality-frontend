import { use, useEffect, useState } from "react";
import DynamicCard from "@/components/products/utils/DynamicCard";
import DynamicBlog from "@/components/products/utils/DynamicBlog";
// import FAQSection from "../newHomePageDesign/FAQSection";
import { blogData ,products} from "@/utils/constants";

const Products = () => {
  const [showAll, setShowAll] = useState(false);
 
  // Show only first 6 items initially
  const visibleProducts = showAll ? products : products.slice(0, 6);

  return (
    <>
      <div className="container mt-5" style={{ paddingTop: "100px"}}>
        <p className="class">Bread Crumb placeholder</p>
      </div>

      {/* Search Bar */}
      <div className="container d-flex justify-content-center mt-3">
        <div
          className="input-group"
          style={{ maxWidth: "450px", width: "100%" }}
        >
          <input
            type="text"
            placeholder="Search for products"
            className="form-control shadow-sm"
          />
          <button id="search_products-search_bar-products_page" className="btn btn-primary">
            <i className="fas fa-search"></i> {/* Bootstrap Search Icon */}
          </button>
        </div>
      </div>

      {/* Products */}
      <div className="container mt-5" style={{ paddingTop: "100px" }}>
        <div className="row justify-content-center">
          <p className="text-center font-semibold">All Categories</p>
          {visibleProducts.map((item) => (
            <div
              key={item.id}
              className="col-md-4 col-sm-6 mb-4 d-flex justify-content-center"
            >
              <DynamicCard
                image={item.image}
                title={item.title}
                styleType="circular"
              />
            </div>
          ))}
        </div>

        {!showAll && products.length > 6 && (
          <div className="text-center mt-3">
            <button
              id="show_more_products-products_list-products_page"
              className="btn btn-primary"
              onClick={() => setShowAll(true)}
            >
              Show More
            </button>
          </div>
        )}
      </div>

      {/* Blogs */}
      <div className="container mt-4">
        <p className="text-center ">Blogs</p>
        <div className="row g-4">
          {blogData.map((blog) => (
            <div key={blog.id} className="col-12 col-md-6 col-lg-4">
              <DynamicBlog
                image={blog.image}
                title={blog.title}
                description={blog.description}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Faqs */}
       {/* <FAQSection /> */}
    </>
  );
};

export default Products;
