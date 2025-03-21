import { searchProductsV2 } from "@/services/products";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export const ProductSearchBar = () => {
  const router = useRouter(); // Initialize router
  const [searchTerm, setSearchTerm] = useState("");
  const [productList, setProductList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct , setSelectedProduct] = useState(null);

  useEffect(() => {
    if (searchTerm.length > 2) {
      const fetchProducts = async () => {
        try {
          const res = await searchProductsV2({ search_key: searchTerm });
          setProductList(res.data);
          setShowDropdown(true);
        } catch (err) {
          console.error("Error fetching products:", err);
          setShowDropdown(false);
        }
      };

      const debounceFetch = setTimeout(fetchProducts, 300);
      return () => clearTimeout(debounceFetch);
    } else {
      setShowDropdown(false);
      setProductList([]);
    }
  }, [searchTerm]);

  const handleProductSelect = (product) => {
    setSearchTerm(product.product_name);
    setShowDropdown(false);
    setSelectedProduct(product)
   
  };

  const handleRedirect = () => {
    if (selectedProduct) {
      router.push(`product-detailPage?product_id=${selectedProduct.product_id}`);
    }
  };
  

  return (
    <div className="d-flex flex-column align-items-center my-4 position-relative" style={{ maxWidth: "450px", width: "100%" }}>
      {/* Search Bar */}
      <div className="input-group shadow-sm w-100 item-center">
        <input
          type="text"
          placeholder="Search for products..."
          className="form-control border-2 border-primary rounded-start-pill px-3 py-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ fontSize: "1.1rem" }}
        />
        <button 
        className="btn btn-primary rounded-end-pill" 
        style={{maxWidth:"80px"}}
        onClick={handleRedirect}>
         <span><FontAwesomeIcon icon={faSearch} /></span> 
        </button>
      </div>

      {/* Product List Dropdown */}
      {showDropdown && productList.length > 0 && (
        <div 
          className="dropdown-menu show w-100 shadow" 
          style={{ 
            position: "absolute", 
            top: "100%", 
            zIndex: 1000, 
            maxHeight: "400px", 
            overflowY: "auto",
            border: "2px solid rgba(0,0,0,0.15)",
            borderRadius: "0.5rem",
            marginTop: "0.25rem"
          }}
        >
          <h6 className="dropdown-header text-white bg-primary py-2" style={{ fontSize: "1rem" }}>
            Matching Products ({productList.length})
          </h6>
          {productList.map((product, index) => (
            <button 
              key={index} 
              className="dropdown-item d-flex flex-column py-2" 
              onClick={() => handleProductSelect(product)}
              style={{ transition: "all 0.2s" }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-medium" style={{ fontSize: "1rem" }}>{product.product_name}</span>
                <span className="badge bg-secondary" style={{ fontSize: "0.75rem" }}>
                  {product.category_name}
                </span>
              </div>
              
            </button>
          ))}
        </div>
      )}
    </div>
  );
};