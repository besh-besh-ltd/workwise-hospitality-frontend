import React, { useEffect, useState } from "react";
import _ from 'lodash';
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlass,
  faEdit
} from "@fortawesome/free-solid-svg-icons";
import { exportProduct, vendorProductList } from "@/services/products";
import Loader from "@/components/shared/Loader";
import { getVendorApproveList } from "@/services/Auth";
import Select from "react-select";
import axiosFormData from "@/lib/axiosFormData";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import { Image } from "react-bootstrap";
import { getVendorMappings } from "@/services/hospitality";
import { BsBuilding, BsChevronDown, BsChevronRight, BsGrid3X3Gap, BsTag } from "react-icons/bs";

const ProductManagement = () => {
  const router = useRouter();
  const id = Date.now().toString();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [vendorApproveList, setVendorApproveList] = useState([]);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState(page);
  const [totalPages, setTotalPages] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [search, setSearch] = useState("");
  const [enableBulkUpload, setEnableBulkUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadProgress, setuploadProgress] = useState(0);
  const [vendorMappings, setVendorMappings] = useState({ hotels: [], categories: { main_categories: [], standalone_subcategories: [] } });
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const fetchVendorMappings = async () => {
    setMappingsLoading(true);
    try {
      const response = await getVendorMappings();
      const mappingsData = response?.data || response;
      setVendorMappings({
        hotels: mappingsData?.hotels || [],
        categories: mappingsData?.categories || { main_categories: [], standalone_subcategories: [] },
      });
    } catch (err) {
      console.error("Error fetching vendor mappings:", err);
    } finally {
      setMappingsLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const uploadToClient = (event) => {
    if (event.target.files && event.target.files[0]) {
      const i = event.target.files[0];
      setFile(i);
    }
  };

  const uploadToServer = async () => {
    if (!file) {
      toast.error("Please select a file!");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    axiosFormData
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/products/bulk-product-create`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setuploadProgress(percentCompleted);
          },
        }
      )
      .then((response) => {
        toast.success(response.message);
        setFile(null);
        setEnableBulkUpload(false);
        getProducts();
      })
      .catch((error) => {
        // console.error(error.response.data.errors.message);
        /* let txt = "";
        for (let x in error?.response?.data?.errors) {
          txt = error?.response?.data?.errors[x];
        } */
        // toast.success(error?.response?.data?.errors?.message);
      });
  };

  const getProducts = () => {
    setLoading(true);
    setProducts([]);
    vendorProductList(limit, page, search, selectedVendor)
      .then((res) => {
        setLoading(false);
        setTotalPages(Math.ceil(res.total_count / limit));
        res.data.map((item) => (item.isChecked = false));
        setProducts(res.data);
      })
      .catch((err) => {
        setLoading(false);
      });
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      height: "52px",
      maxWidth: "300px",
      borderRadius: "6px",
      paddingLeft: "10px",
      marginRight: "15px",
    }),
  };

  const getVendorApproveLists = () => {
    getVendorApproveList().then((res) => {
      let result = res.data.map((item) => ({
        value: item.id,
        label: item.vendor_approve,
      }));
      setVendorApproveList(result);
    });
  };

  const getSubCats = (item) => {
    let cats = "";
    if (item.product_categories.length > 1) {
      item.product_categories.map((cat, index) => {
        if (index > 0) {
          cats = (
            <>
              {cats}
              <span className="badge badge-primary">{cat.category_name}</span>
            </>
          );
        }
      });
    }
    return cats;
  };
  const selectProduct = (e, citem) => {
    let pp = [];
    //item.isChecked = e.target.checked;
    pp = products.map((item) => {
      if (item.id === citem.id) {
        item.isChecked = e.target.checked;
      }
      return item;
    });
    setProducts(pp);
  };
  const selectAllProduct = (e, item) => {
    let pp = [];
    if (e.target.checked) {
      pp = products.map((item) => {
        item.isChecked = true;
        return item;
      });
    } else {
      pp = products.map((item) => {
        item.isChecked = false;
        return item;
      });
    }
    setProducts(pp);
  };

  const exportProducts = () => {
    const checkedProduct = products.reduce(
      (acc, ele) => (ele.isChecked == true ? acc.concat(ele.id) : acc),
      []
    );
    if (checkedProduct.length > 0) {
      setLoading(true);
      exportProduct(
        limit,
        page,
        search,
        selectedVendor,
        checkedProduct.length > 0 ? JSON.stringify(checkedProduct) : [],
        checkedProduct.length > 0 ? false : true
      )
        .then((res) => {
          setLoading(false);
          setProducts((prev) =>
            prev?.map((item) => ({ ...item, isChecked: false }))
          );
          const downloadLink = document.createElement("a");
          downloadLink.href = window.URL.createObjectURL(res);
          downloadLink.setAttribute("download", "export_product.xlsx"); // Set desired file name
          document.body.appendChild(downloadLink);

          // Trigger the download
          downloadLink.click();

          // Cleanup
          document.body.removeChild(downloadLink);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
    }
    else {
      toast.warning("Please select products to export", {position: "top-center"});
    }
  };

  const handleUpdateProducts = (item) => {
    router.push(`/dashboard/vendor/edit-products/${item.id}`);
  };

  // const debouncedSetPage = _.debounce((inputPage) => {
  //   if (inputPage >= 1 && inputPage <= totalPages) {
  //     setPage(inputPage);
  //   } else {
  //     setPage(1);
  //   }
  // }, 300);

  const handlePageChange = (event) => {
    const newValue = event.target.value;
    if (newValue >= 1 || newValue <= totalPages || newValue)
      setPage(newValue)
    else
      setPage(1)

    // setInputValue(newValue);
    // setPage(event.target.value)
    // debouncedSetPage(parseInt(newValue, 10));
  };

  useEffect(() => {
    getProducts();
    getVendorApproveLists();
    fetchVendorMappings();
  }, []);
  useEffect(() => {
    getProducts();
  }, [page, limit]);

  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Product Management</h1>
        </div>
      </section>

      <section className="vendor-mngt-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">


                {/* Vendor Mappings Section */}
                {!mappingsLoading && (vendorMappings.hotels.length > 0 || vendorMappings.categories.main_categories.length > 0 || vendorMappings.categories.standalone_subcategories.length > 0) && (
                  <div style={{ marginTop: '24px', marginBottom: '8px' }}>
                    <span className="title pb-2">Your Hotel & Category Mappings</span>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: vendorMappings.hotels.length > 0 && (vendorMappings.categories.main_categories.length > 0 || vendorMappings.categories.standalone_subcategories.length > 0) ? '1fr 1fr' : '1fr',
                      gap: '16px',
                      marginTop: '12px',
                    }}>
                      {/* Hotels Section */}
                      {vendorMappings.hotels.length > 0 && (
                        <div style={{
                          background: '#fff',
                          border: '1px solid #e9ecef',
                          borderRadius: '10px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '14px 18px',
                            borderBottom: '1px solid #f0f0f0',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
                          }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#e8f4fd',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <BsBuilding size={16} style={{ color: '#0d6efd' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2d3436' }}>Mapped Hotels</div>
                              <div style={{ fontSize: '0.72rem', color: '#6c757d' }}>{vendorMappings.hotels.length} hotel{vendorMappings.hotels.length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {vendorMappings.hotels.map((hotel) => (
                              <div
                                key={hotel.id || hotel.hotel_id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  background: '#f8f9fa',
                                  border: '1px solid #e9ecef',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#28a745',
                                  flexShrink: 0,
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#2d3436' }}>
                                    {hotel.hotel_name || hotel.name}
                                  </div>
                                  {(hotel.city || hotel.location) && (
                                    <div style={{ fontSize: '0.72rem', color: '#6c757d', marginTop: '2px' }}>
                                      {hotel.city || hotel.location}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Categories Section */}
                      {(vendorMappings.categories.main_categories.length > 0 || vendorMappings.categories.standalone_subcategories.length > 0) && (
                        <div style={{
                          background: '#fff',
                          border: '1px solid #e9ecef',
                          borderRadius: '10px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '14px 18px',
                            borderBottom: '1px solid #f0f0f0',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
                          }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#e8f5e9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <BsGrid3X3Gap size={16} style={{ color: '#198754' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2d3436' }}>Subscribed Categories</div>
                              <div style={{ fontSize: '0.72rem', color: '#6c757d' }}>
                                {vendorMappings.categories.main_categories.length} categor{vendorMappings.categories.main_categories.length !== 1 ? 'ies' : 'y'}
                                {vendorMappings.categories.standalone_subcategories.length > 0 && (
                                  <> · {vendorMappings.categories.standalone_subcategories.length} additional sub-categor{vendorMappings.categories.standalone_subcategories.length !== 1 ? 'ies' : 'y'}</>
                                )}
                              </div>
                            </div>
                          </div>
                          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Main Categories with Sub-categories */}
                            {vendorMappings.categories.main_categories.map((cat) => {
                              const isExpanded = !!expandedCategories[cat.category_id];
                              const hasSubs = cat.sub_categories && cat.sub_categories.length > 0;
                              return (
                                <div key={cat.category_id} style={{
                                  borderRadius: '8px',
                                  border: '1px solid #e9ecef',
                                  overflow: 'hidden',
                                  background: isExpanded ? '#fafbfc' : '#f8f9fa',
                                  transition: 'all 0.15s ease',
                                }}>
                                  <div
                                    onClick={() => hasSubs && toggleCategory(cat.category_id)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      padding: '10px 14px',
                                      cursor: hasSubs ? 'pointer' : 'default',
                                      userSelect: 'none',
                                    }}
                                  >
                                    {hasSubs ? (
                                      isExpanded
                                        ? <BsChevronDown size={12} style={{ color: '#6c757d', flexShrink: 0 }} />
                                        : <BsChevronRight size={12} style={{ color: '#6c757d', flexShrink: 0 }} />
                                    ) : (
                                      <BsTag size={12} style={{ color: '#6c757d', flexShrink: 0 }} />
                                    )}
                                    <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#2d3436', flex: 1 }}>
                                      {cat.category_name}
                                    </span>
                                    {hasSubs && (
                                      <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 500,
                                        color: '#6c757d',
                                        background: '#e9ecef',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                      }}>
                                        {cat.sub_categories.length} sub
                                      </span>
                                    )}
                                  </div>
                                  {isExpanded && hasSubs && (
                                    <div style={{
                                      padding: '0 14px 10px 36px',
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '6px',
                                    }}>
                                      {cat.sub_categories.map((sub) => (
                                        <span
                                          key={sub.category_id}
                                          style={{
                                            fontSize: '0.76rem',
                                            fontWeight: 500,
                                            color: '#495057',
                                            background: '#fff',
                                            border: '1px solid #dee2e6',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                          }}
                                        >
                                          {sub.category_name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Standalone Sub-categories */}
                            {vendorMappings.categories.standalone_subcategories.length > 0 && (
                              <>
                                {vendorMappings.categories.main_categories.length > 0 && (
                                  <div style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: '#adb5bd',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    marginTop: '6px',
                                    marginBottom: '2px',
                                  }}>
                                    Other Sub-Categories
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {vendorMappings.categories.standalone_subcategories.map((sub) => (
                                    <span
                                      key={sub.category_id}
                                      style={{
                                        fontSize: '0.76rem',
                                        fontWeight: 500,
                                        color: '#495057',
                                        background: '#f8f9fa',
                                        border: '1px solid #e9ecef',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                      }}
                                    >
                                      {sub.category_name}
                                      {sub.parent_category_name && (
                                        <span style={{ color: '#adb5bd', marginLeft: '4px', fontSize: '0.7rem' }}>
                                          ({sub.parent_category_name})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {mappingsLoading && (
                  <div style={{ marginTop: '24px', marginBottom: '8px' }}>
                    <span className="title pb-2">Your Hotel & Category Mappings</span>
                    <div style={{ textAlign: 'center', padding: '24px', color: '#adb5bd', fontSize: '0.85rem' }}>
                      Loading mappings...
                    </div>
                  </div>
                )}

                <span className="title pt-5 pb-2">Your Product List</span>
                <div className="details-table p-4 ">
                  {loading && <Loader />}
                  <div className="table-header row mb-4">
                    <div className="filter-options col-12 d-flex align-items-center gap-2">
                      <input
                        type="search"
                        name="search"
                        placeholder="Search product by name..."
                        defaultValue={search}
                        style={{ flex: 1 }}
                        onChange={(e) =>
                          setSearch(e.target.value ? e.target.value : "")
                        }
                      />
                      <div className="action-btm">
                        <button
                          id="search_products-product_management-page"
                          className="btn btn-primary"
                          onClick={() => {
                            getProducts();
                          }}
                        >
                          Search
                        </button>
                      </div>
                    </div>
                    </div>
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th scope="col">Name of product</th>
                          <th scope="col">Product Status</th>
                          <th scope="col">Category</th>
                          <th scope="col">Sub Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products &&
                          products.map((item) => {
                            return (
                              <>
                                <tr key={item.id}>
                                  <td>{item.name}</td>
                                  <td>
                                    {item.is_approve == 1
                                      ? "Active"
                                      : "Inactive"}
                                  </td>
                                  <td className="subcatstd">
                                    <span className="badge badge-warning">
                                      {item.product_categories.length > 0
                                        ? item.product_categories[0]
                                          .category_name
                                        : "-"}
                                    </span>
                                  </td>
                                  <td className="subcatstd">
                                    {getSubCats(item)}
                                  </td>
                                  {/* Edit action hidden — vendors should not modify product mappings directly */}
                                </tr>
                              </>
                            );
                          })}
                        {products.length == 0 && (
                          <tr>
                            <td colSpan="4">No products found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination">
                    {Math.ceil(totalPages / limit) > 1 && (
                      <>
                        <div
                          className="arrow-prev"
                          onClick={() => {
                            setPage((prevState) => {
                              return prevState - 1;
                            });
                          }}
                        >
                          <FontAwesomeIcon icon={faChevronLeft} />
                        </div>
                        <div
                          className="arrow-next"
                          onClick={() => {
                            setPage((prevState) => {
                              return prevState + 1;
                            });
                          }}
                        >
                          <FontAwesomeIcon icon={faChevronRight} />
                        </div>
                      </>
                    )}

                    <span>Page</span>
                    <input type="number" min={1} max={totalPages} value={page} onChange={handlePageChange} />
                    <span> of {totalPages}</span>
                  </div>
                  {/* <Pagination pageNo={page} totalPages={totalPages} /> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ProductManagement;
