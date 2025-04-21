import { searchProductsV2 } from "@/services/products";
import { useState, useEffect, useRef, useCallback } from "react";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";

export default function ProductSearchModal({ reviewData, setReviewData, formData, handleFormChange, projects }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [error, setError] = useState("");
  const categoryLvlRef = useRef(new Map());

  // Debounce function to reduce API calls
  const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  // API call to fetch products based on user input
  const getProducts = useCallback(
    debounce((search_key) => {
      if (!search_key.trim()) {
        setProducts([]);
        setError(""); // Clear error when input is cleared
        return;
      }

      setLoading(true);
      setError("");
      categoryLvlRef.current = new Map();

      searchProductsV2(
        {
          cat_id: null,
          search_key,
          vendor_name: "",
          is_private: "",
          preferred_vendor: "",
        },
        "products"
      )
        .then((rsp) => {
          setLoading(false);
          if (rsp?.data?.length === 0) {
            setError("No products found");
          }
          let data = rsp.data.map((item) => {
            item.selected = false;
            return item;
          });

          setProducts(data);
        })
        .catch((error) => {
          setLoading(false);
          setError("Failed to fetch products. Please try again.");
        });
    }, 500),
    []
  );

  // Fetch vendors for the selected product and append to reviewData.products
  const fetchVendorsAndSetProduct = (product) => {
    setVendorLoading(true);
    setError("");

    searchProductsV2(
      {
        cat_id: null,
        search_key: product.product_name,
        approved_by: null,
        state: null,
        city: null,
        vendor_name: "",
        is_private: "",
        preferred_vendor: "",
      },
      "vendors"
    )
      .then((rsp) => {
        setVendorLoading(false);

        // Extract existing products with the same name
        const existingProducts = (reviewData?.products || []).filter(
          (p) => p.name === product.product_name
        );

        // Find the highest variant number
        const highestVariant = existingProducts.length
          ? Math.max(...existingProducts.map((p) => p.variant))
          : 0;

        // Create product object with fetched vendors
        const productObject = {
          product_id: product.product_id,
          name: product.product_name,
          variant: highestVariant + 1,
          spec: [
            { title: "Size", value: "" },
            { title: "Spec", value: "" },
            { title: "Quantity", value: "" },
            { title: "Unit", value: "" },
          ],
          vendors: rsp.data.map((vendor) => ({
            user_id: vendor.id,
            name: vendor.vendor_name,
            email: vendor.email,
            mobile: vendor.mobile,
            company_name: vendor.company_name,
            address: vendor.address,
            about: vendor.about,
            is_private: vendor.is_private,
            website: vendor.website,
            city_name: vendor.city_name,
            state_name: vendor.state_name,
            image_url: vendor.image_url,
            is_linked_with_buyer: vendor.is_linked_with_buyer,
          })),
        };

        // Append new product to reviewData.products without overriding existing products
        setReviewData((prevReviewData) => ({
          ...prevReviewData,
          products: [...(prevReviewData.products || []), productObject],
        }));

        setQuery("");

        toast.success(product.product_name + " - Added Successfully!");
      })
      .catch((error) => {
        setVendorLoading(false);
        setError("Failed to fetch vendors.");
        toast.error(product.product_name + " - Not Added");
      });
  };

  // Handle input change and trigger API call with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    getProducts(value);
  };

  // Handle product selection
  const handleProductClick = (product) => {
    setQuery(product.product_name);
    setProducts([]); // Hide suggestions after selection
    fetchVendorsAndSetProduct(product); // Fetch vendors first, then add product to reviewData
  };

  return (
    <div style={{
      display: 'flex',
      gap: "1rem",
      alignItems: 'center'
    }}>
      {/* Button to open modal */}
        <h3 style={{textWrap: 'nowrap', fontSize: 17, marginBottom: 0}}>Select Project</h3>
        <select
          name="project_id"
          id="project_id"
          className="form-control border border-dark-subtle"
          style={{
            maxWidth: 220
          }}
          value={formData.project_id}
          onChange={handleFormChange}
        >
          <option value={-1}>Select Project</option>
          {projects &&projects.length > 0 &&
            projects.map((projectItem) => {
              return (
                <option
                  value={projectItem.value}
                  key={projectItem.value}
                >
                  {projectItem.label}
                </option>
              );
            })}
        </select>
      <button
        className="btn btn-primary btn-sm"
        style={{ padding: "0.5rem", width: "270px", textWrap: 'nowrap' }}
        onClick={() => setModalIsOpen(true)}
      >
        Add More Product
      </button>

      {/* Product Search Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        contentLabel="Product Search"
        ariaHideApp={false} // Only required if using SSR
        style={{
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
          content: {
            position: "relative",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "800px", // Adjust this value as needed
            width: "auto", // Set to 'auto' or a specific value based on your design
            maxHeight: "90vh", // Adjust this value as needed
            border: "none",
            background: "transparent",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px",
          },
        }}
      >
        <div className="modal-content bg-white p-2 rounded-3">
          <div className="modal-header mx-3 ">
            <h3 className="modal-title">Add More Products</h3>

            <button
              className="border-0 bg-transparent p-0"
              style={{ width: "32px", height: "32px", color: "black" }}
              onClick={() => setModalIsOpen(false)}
            >
              <FontAwesomeIcon icon={faCircleXmark} size="xl" />
            </button>
          </div>

          <div className="modal-body">
            <input
              type="text"
              className="form-control border border-dark-subtle"
              value={query}
              onChange={handleInputChange}
              placeholder="Search for a product..."
            />

            {/* Loading Indicator */}
            {loading && (
              <div className="mt-2 text-primary">Loading products...</div>
            )}

            {/* Display Error Message */}
            {error && <div className="mt-2 text-danger">{error}</div>}

            {/* Display Recommendations */}
            {products.length > 0 && (
              <ul
                className="list-group mt-2 shadow bg-white"
                style={{ maxHeight: "300px", overflowY: "auto" }}
              >
                {products.map((item, index) => (
                  <li
                  role="button"
                    key={`mp_${index}`}
                    className="list-group-item list-group-item-action ps-2 "
                    onClick={() => handleProductClick(item)}
                    title={`${item.product_name} - ${item.description}`}
                  >
                    <div>
                      <h3 className="h6 mb-0 ">{item.product_name}</h3>
                      <p className="mb-0">
                        <small className="text-primary">
                          {item.category_name}
                        </small>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Vendor Loading Indicator */}
            {vendorLoading && (
              <div className="mt-2 text-primary">Adding Product...</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
