import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ProductMetaTags } from "@/components/products/utils/MetaTags";
import { ProductBreadcrumb } from "@/components/products/utils/Breadcrumb";
import { ProductSearchBar } from "@/components/products/utils/SearchBar";
import { CategorySection } from "@/components/products/utils/CategorySection";
import { BlogSection } from "@/components/products/utils/BlogSection";
import FAQSection from "../newHomePageDesign/FAQSection";
import { CATEGORIES, SUBCATEGORIES, products } from "@/utils/constants";
import { textCapitalize } from "@/utils/sharedFunctions";
import { AllCategoriesSection } from "@/components/products/utils/AllCategoriesSection";
import { parentCategoryList, getAllCategories } from "@/services/products";
import { categoryListById } from "@/services/rfq";
import DynamicCard from "@/components/products/utils/DynamicCard";

const ProductPages = () => {
  const [allCategories, setAllCategories] = useState([]);
  const [subcategories, setSubCategories] = useState([]);
  const router = useRouter();
  const { slug } = router.query;
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [matchedCategory, setMatchedCategory] = useState(null);
  const [productListForCategory, setProductListForCategory] = useState([]);

  const isAllProductsPage = slug?.[0] === "all";
  const isCategoryPage = slug?.length === 1 && slug?.[0] !== "all";

  const fetchProductsByCategiry = async (category_id) => {
      await categoryListById({ category_id })
      .then((res) => {
        const products = res?.productList;
        setProductListForCategory(products);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setProductListForCategory([]);
      });
  };

  useEffect(() => {
    if (allCategories.length > 0 && selectedCategory) {
      const category = allCategories.find(
        (cat) => cat.slug === selectedCategory
      );
      setMatchedCategory(category || null);
    }
  }, [selectedCategory, allCategories]); // Re-run when selectedCategory or allCategories change

  useEffect(() => {
    setLoading(true);

    parentCategoryList(slug)
      .then((res) => {
        const subcategoriesList = res?.data?.subcategories;

        if (allCategories.length === 0) {
          setAllCategories(res?.data?.parentCategories);
          setProductListForCategory([]);
        }
        if (slug?.[0]) {
          setSelectedCategory(slug[0].toLowerCase());
        }

        if (Array.isArray(subcategoriesList)) {
          // Case 1: Valid subcategories array returned
          setSubCategories(subcategoriesList);
          setProductListForCategory([]);
        } else if (
          subcategoriesList?.status === 404 &&
          subcategoriesList?.category_id
        ) {
          // Case 2: No subcategories, but valid category matched — fetch products
          setSubCategories([]);
          fetchProductsByCategiry(subcategoriesList.category_id);
        } else {
          // Case 3: Invalid response — redirect to default product page
          router.push(`/products/product-detailPage?category_id=123`);
        }
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setSubCategories([]);
      });

    setLoading(false);
  }, [slug]); // Removed router.asPath to avoid excessive re-fetching

  const handleCategorySelect = (subcategory) => {
    setSelectedCategory(subcategory.title.toLowerCase());
    setMatchedCategory(subcategory);

    router.replace(`/products/${subcategory.slug}`, undefined, {
      shallow: true,
    });
  };

  if (router.isFallback || !slug) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        Loading...
      </div>
    );
  }

  return (
    <>
      <ProductMetaTags slug={slug} />
      <div className="container mt-5" style={{ paddingTop: "100px" }}>
        <ProductBreadcrumb slug={slug} />

        {/* Show search bar only on "All Products" page */}
        {isAllProductsPage && <ProductSearchBar />}

        {/* Category Description */}
        {!isAllProductsPage && (
          <h2 className="text-center font-semibold mb-4">
            {textCapitalize(
              matchedCategory?.title || selectedCategory.replace(/-/g, " ")
            )}

            <p className="text-muted">
              {matchedCategory?.description || "Explore our products."}
            </p>
          </h2>
        )}

        {/* Category Badges - Show only when NOT on "All Products" page */}
        {!isAllProductsPage && allCategories.length > 0 && (
          <div className="d-flex justify-content-center mb-4">
            <div className="d-flex flex-wrap justify-content-center gap-3 category-container">
              {allCategories.map((item) => {
                // Convert title to lowercase for comparison
                const itemSlug = item.title.toLowerCase();
                const itemId = item.id;

                return (
                  <button
                    key={item.id}
                    className={`badge px-4 py-2 text-center fw-bold ${
                      selectedCategory === itemSlug
                        ? "bg-primary text-white"
                        : "bg-light text-dark"
                    }`}
                    onClick={() => handleCategorySelect(item)}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* All Categories Grid */}
        {isAllProductsPage && (
          <AllCategoriesSection allCategories={allCategories} />
        )}

        {/* Category Section */}
        {subcategories && subcategories.length > 0 ? (
          <CategorySection subcategories={subcategories} />
        ) : (
          <p>No subcategories available</p>
        )}

        <div className="row justify-content-center g-4">
          {productListForCategory?.map((sub) => (
            <div
              key={sub.product_id}
              className="col-12 col-sm-6 col-md-4 d-flex justify-content-center"
              // onClick={() => handleCategoryClick(sub)}
            >
              <DynamicCard
                image={sub?.image || ""}
                title={sub?.product_name}
                sub={sub?.slug}
                link={null} // No direct navigation, handled by onClick
                className="category-card"
              />
            </div>
          ))}
        </div>

        {/* <BlogSection /> */}
        <FAQSection />
      </div>
    </>
  );
};

export async function getStaticPaths() {
  return {
    paths: [{ params: { slug: ["all"] } }], // Only pre-generating 'all'
    fallback: "blocking", // Other pages are generated dynamically
  };
}

export async function getStaticProps({ params }) {
  const { slug } = params;
  let pageTitle = "Products";
  let categories = [];

  try {
    const res = await parentCategoryList(); // Fetch categories dynamically
    categories = res ? res.data : [];
  } catch (error) {
    console.error("Error fetching categories:", error);
  }

  // Generate dynamic paths for category and subcategory
  const subcategories = Object.entries(SUBCATEGORIES).flatMap(
    ([category, subs]) => subs.map((sub) => ({ slug: [category, sub.id] }))
  );

  if (slug?.[0] === "all") {
    pageTitle = "All Products";
  } else if (slug?.length === 1) {
    pageTitle = `${slug[0].replace(/-/g, " ")} Products`;
  } else if (slug?.length === 2) {
    pageTitle = `${slug[1].replace(/-/g, " ")} | ${slug[0].replace(/-/g, " ")}`;
  }

  return {
    props: {
      pageTitle: textCapitalize(pageTitle),
      categories, // Send categories to the page
      subcategories, // Send subcategories if needed
    },
    revalidate: 3600, // ISR: Regenerate every hour
  };
}

export default ProductPages;
