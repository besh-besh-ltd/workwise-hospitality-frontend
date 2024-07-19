import {
  addProductsReviewAPI,
  reviewProductListAPI,
} from "@/services/reviewProducts";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";

const ProductReview = () => {
  const router = useRouter();
  const [productReviewList, setProductReviewList] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [limit, setlimit] = useState(10);
  const [page, setpage] = useState(1);
  const [totalPages, settotalPages] = useState(null);

  const handleGetProductReview = () => {
    reviewProductListAPI(limit, page)
      .then((res) => {
        settotalPages(Math.ceil(res.total_count / limit));
        setProductReviewList(res.data);
      })
      .catch((error) => {
        let txt = "";
        for (let x in error?.error?.response?.data?.errors) {
          txt = error?.error?.response?.data?.errors[x];
        }
        toast.error(txt);
      });
  };

  // Function to handle select all products
  const selectAllProduct = (e) => {
    const isChecked = e.target.checked;
    const updatedSelectedProducts = isChecked
      ? productReviewList?.map((item) => item.id)
      : [];
    setSelectedProducts(updatedSelectedProducts);
  };

  // Function to handle select individual product
  const selectProduct = (e, item) => {
    const productId = item.id;
    const isChecked = e.target.checked;
    let updatedSelectedProducts = [...selectedProducts];

    if (isChecked) {
      updatedSelectedProducts.push(productId);
    } else {
      updatedSelectedProducts = updatedSelectedProducts.filter(
        (id) => id !== productId
      );
    }

    setSelectedProducts(updatedSelectedProducts);
  };

  // Function to check if all products are selected
  const isAllProductsSelected =
    selectedProducts?.length === productReviewList?.length;

  const handleReviewProduct = () => {
    if (selectedProducts?.length > 0) {
      const payload = {
        all: selectedProducts?.length === productReviewList?.length,
        products: selectedProducts,
      };
      addProductsReviewAPI(payload)
        .then((res) => {
          handleGetProductReview();
          setSelectedProducts([]);
          toast.success(res?.message);
        })
        .catch((error) => {
          let txt = "";
          for (let x in error?.error?.response?.data?.errors) {
            txt = error?.error?.response?.data?.errors[x];
          }
          toast.error(txt);
        });
    } else {
      toast.error("Please select products to review");
    }
  };

  useEffect(() => {
    handleGetProductReview();
  }, [page]);
  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Product Review</h1>
        </div>
      </section>

      <section className="vendor-mngt-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
                <div className="row justify-content-end">
                  <div className="col-sm-2 mb-4">
                    <button
                      type="button"
                      onClick={() => handleReviewProduct()}
                      className="btn btn-primary mr-2"
                    >
                      Review
                    </button>
                  </div>
                </div>
                <div className="details-table">
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th scope="col">
                            <input
                              type="checkbox"
                              name="select_all_products"
                              checked={isAllProductsSelected}
                              value=""
                              onClick={(e) => selectAllProduct(e)}
                            />
                            <a>Select all</a>
                          </th>
                          <th>Name</th>
                          <th>Manufacturer</th>
                          <th>Vendor Name</th>
                          <th>Review Status</th>
                          <th>Availability</th>
                          <th>Product Categories</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productReviewList &&
                          productReviewList?.map((item) => {
                            return (
                              <tr key={item.id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    name="select_product"
                                    checked={selectedProducts.includes(item.id)}
                                    value=""
                                    onClick={(e) => selectProduct(e, item)}
                                  />
                                </td>
                                <td>{item?.name}</td>
                                <td>
                                  {item?.manufacturer
                                    ? item?.manufacturer.trim()
                                    : ""}
                                </td>
                                <td>{item?.vendor_name}</td>
                                <td>
                                  {item?.is_review === 1
                                    ? "Reviewed"
                                    : "Not Reviewed"}
                                </td>
                                <td>
                                  {item?.availability === 1
                                    ? "Available"
                                    : "Not Available"}
                                </td>
                                <td>
                                  {item.product_categories.map(
                                    (cat, planIndex) => (
                                      <span
                                        key={planIndex}
                                        className="badge bg-primary me-2"
                                      >
                                        {cat?.category_name}
                                      </span>
                                    )
                                  )}
                                </td>
                                <td>
                                  <span
                                    role="button"
                                    className="cursor-pointer"
                                    onClick={() =>
                                      router.push(
                                        `/dashboard/vendor/edit-products-review/${item?.id}`
                                      )
                                    }
                                  >
                                    Edit
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    <nav aria-label="Page navigation example">
                      <ul className="pagination">
                        {Array.from(Array(totalPages), (e, i) => {
                          if (i + 1 === page) {
                            return (
                              <li className="active page-item" key={i + 1}>
                                <a
                                  className="page-link"
                                  href=""
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setpage(i + 1);
                                  }}
                                >
                                  {i + 1}
                                </a>
                              </li>
                            );
                          } else {
                            return (
                              <li className="page-item" key={i + 1}>
                                <a
                                  className="page-link"
                                  href=""
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setpage(i + 1);
                                  }}
                                >
                                  {i + 1}
                                </a>
                              </li>
                            );
                          }
                        })}
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ToastContainer />
    </>
  );
};

export default ProductReview;
