import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faMagnifyingGlass,
  faPlus,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { searchProducts, searchProductsV2 } from "@/services/products";
import SearchItem from "@/components/search/searchItem";
import FullLoader from "@/components/shared/FullLoader";
import { categoryList, categoryListById, vendorApproveList } from "@/services/rfq";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import {
  addRfqProduct,
  addVendor,
  removeRfqProduct,
  setDefaultVAB,
} from "@/redux/slice";
import { toast } from "react-toastify";
import { faTimesCircle } from "@fortawesome/free-regular-svg-icons";
import { faLightbulb as faSolidLightbulb } from '@fortawesome/free-solid-svg-icons';
import { getProfile } from "@/services/Auth";
import { useRouter } from "next/router";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import LocationFilter from "@/components/shared/LocationFilter";
import storageInstance from "@/utils/storageInstance";
import ProductOverview from "@/components/shared/ProductOverview";


const customSelectStyles = {
  control: (base) => ({
    ...base,
    height: 50,
    minHeight: 50,
  }),
};

const Search = ({ title = "Preffered Vendors", type }) => {
  const router = useRouter();
  const { slug, s, loggedin } = router.query;
  const vendor_area_ref = useRef();
  const id = Date.now().toString();
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const searchLabelRef = useRef(null);
  const rfqProductsFromStore = useSelector((data) => data.rfqProducts);
  const dispatch = useDispatch();
  const [cat_id, setCat_id] = useState("");
  const [search_key, setSearch_key] = useState("");
  const [approved_by, setApproved_by] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setloading] = useState(false);
  const [selectedVbaa, setselectedVbaa] = useState("");
  const [catloading, setcatloading] = useState(false);
  const [vabloading, setvabloading] = useState(false);
  const [bulkRFQVendors, setbulkRFQVendors] = useState([]);
  const [currentSelectedProduct, setcurrentSelectedProduct] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorMetaData, setVendorMetaData] = useState({});
  const [parentCategories, setParentCategories] = useState([]);
  const [levelZeroCat, setlevelZeroCat] = useState([]);
  const [levelOneCat, setlevelOneCat] = useState([]);
  const [levelTwoCat, setlevelTwoCat] = useState([]);
  const [levelThreeCat, setlevelThreeCat] = useState([]);
  const [levelFourCat, setlevelFourCat] = useState([]);
  const [levelFiveCat, setlevelFiveCat] = useState([]);
  const [levelSixCat, setlevelSixCat] = useState([]);
  const [userProfile, setuserProfile] = useState(null);

  const [selectedState, setselectedState] = useState(0);

  const [selectedCity, setselectedCity] = useState(0);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const tempProdRef = useRef(null);
  const [searchCategories, setSearchCategories] = useState([]);
  const [searchSubCategories, setSearchSubCategories] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const categoryLvlRef = useRef(new Map());
  const [firstVisit, setFirstVisit] = useState(true);
  const [showInsights, setShowInsights] = useState(false);


  const handleRedirect = (e) => {
    if (!vendorMetaData?.logged_In)
      setOpenAuthModal(true);
    else if (!vendorMetaData?.subscription)
      router.push('dashboard/buyer/subscription');
  }

  useEffect(() => {
    if (s && s != "") {
      setSearch_key(s.split("+").join(" "));
      setTimeout(() => {
        searchRef.current.focus();
        searchLabelRef.current.click();
      }, 1000);

      // getProducts();
    }
    if (localStorage.getItem("token")) {
      setIsLoggedIn(true);
    }
    if (redirectAfterLogin) {
      const url = redirectAfterLogin;
      router.push(url);
    }
    setRedirectAfterLogin(null);
  }, [router, loggedin]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearchClick = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    getProfileDetails();
    getProducts(slug);
    getCategories();
    getVendorApprovedby();
  }, []);


  useEffect(() => {
    getVendors();
  }, [
    currentSelectedProduct,
    selectedVbaa,
    cat_id,
    selectedState,
    selectedCity,
    isLoggedIn
  ]);

  useEffect(() => {
    if (currentSelectedProduct) {
      dispatch(
        setDefaultVAB({
          product_id: currentSelectedProduct.product_id,
          selectedVbaa: selectedVbaa,
        })
      );
    }
  }, [selectedVbaa]);

  const cleanAndAddHyphen = (input) => {
    let lowerCaseString = input.toLowerCase();
    let cleanedString = lowerCaseString.replace(/[\s\-\/()]+/g, ' ').trim();
    return cleanedString.replace(/\s+/g, '-');
  }

  const getProfileDetails = () => {
    setloading(true);
    getProfile().then((res) => {
      setloading(true);
      setuserProfile(res.data);
    });
  };

  const addToRFQ = (item) => {
    if (currentSelectedProduct.product_id == tempProdRef.current?.product_id) {
      dispatch(
        addVendor({
          product_id: currentSelectedProduct.product_id,
          id: item.id,
          name: item.vendor_name,
        })
      );
      toast.success(
        <h6>
          <b>{item.vendor_name}:</b> Successfully added to RFQ list!
        </h6>,
        {
          position: "top-right",
        }
      );
    } else {
      dispatch(addRfqProduct(currentSelectedProduct));
      dispatch(
        addVendor({
          product_id: currentSelectedProduct.product_id,
          id: item.id,
          name: item.vendor_name,
        })
      );
      toast.success(
        <h6>
          <b>{item.vendor_name}:</b> Successfully added to RFQ list!
        </h6>,
        {
          position: "top-right",
        }
      );
      tempProdRef.current = currentSelectedProduct;
    }
  };

  const handleBulkAddToRFQ = (e) => {
    e.preventDefault();

    if (currentSelectedProduct.product_id != tempProdRef.current?.product_id)
      dispatch(addRfqProduct(currentSelectedProduct));

    if (bulkRFQVendors.length > 0) {
      bulkRFQVendors.map((item) => {
        dispatch(
          addVendor({
            product_id: currentSelectedProduct.product_id,
            id: item.id,
            name: item.name,
          })
        );
      });
      toast.success(
        <h6>
          <b>{bulkRFQVendors.length} vendors</b> Successfully added to RFQ
          list!
        </h6>,
        {
          position: "top-right",
        }
      );
    }
    tempProdRef.current = currentSelectedProduct;
  };
  const getVendors = () => {
    setloading(true);
    setVendors([]);
    setSearchSubCategories([]);

    // changes by mukul jatav 29-08-2024 
    setbulkRFQVendors([]);

    if (search_key != "") {
      searchProductsV2(
        {
          cat_id,
          search_key,
          approved_by: selectedVbaa,
          state: selectedState,
          city: selectedCity,
        },
        "vendors"
      )
        .then((rsp) => {

          setloading(false);
          let d = rsp.data.map((item) => {
            item.selected = false;
            return item;
          });
          setVendors(d);
          setVendorMetaData(rsp)
          currentSelectedProduct
            ? vendor_area_ref.current.scrollIntoView({ behavior: "smooth" })
            : null;
        })
        .catch((error) => {
          setloading(false);
          setVendorMetaData(error?.response?.data)
        });
    }
  };
  const getProducts = (s_key = search_key) => {
    setloading(true);
    categoryLvlRef.current = new Map();
    searchProductsV2(
      {
        cat_id,
        search_key: s_key,
        // approved_by: selectedVbaa,
      },
      type
    )
      .then((rsp) => {
        setloading(false);
        let d = rsp.data.map((item) => {
          item.selected = false;
          return item;
        });
        if (slug && slug != "all" && firstVisit) {
          handleAutocompleteClick(d[0])
          setFirstVisit(false);
        } else {
          setProducts(d);
          setSearchCategories(rsp.categoryData);
        }
      })
      .catch((error) => {
        setloading(false);
      });
  };

  const getCategoriesById = (category_id, category_name) => {
    setloading(true)
    categoryLvlRef.current.set(category_id, category_name)

    categoryListById({ category_id })
      .then((res) => {
        setProductsList(res.productList);
        setcurrentSelectedProduct(null);
        setSearchSubCategories(res.subCategoryList);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setloading(false)
        setIsOpen(false);

        // Update the URL to include the selected product's name
        const newUrl = `/vendor/${cleanAndAddHyphen(category_name)}`;
        window.history.pushState(null, null, newUrl);

      })
  };

  const getCategories = () => {
    setcatloading(true);
    categoryList()
      .then((rsp) => {
        setcatloading(false);
        let options = [];
        let parentOptions = [];
        rsp.data.map((item) => {
          options.push({ value: item?.id, label: item?.title });
          if (item.parent_id == 0) {
            parentOptions.push({ value: item?.id, label: item?.title });
          }
        });
        setCategories(rsp.data);
        setParentCategories(parentOptions);
      })
      .catch((error) => {
        setcatloading(false);
      });
  };

  const getVendorApprovedby = () => {
    setvabloading(true);
    vendorApproveList()
      .then((rsp) => {
        setvabloading(false);
        setApproved_by(rsp.data);
      })
      .catch((error) => {
        setvabloading(false);
      });
  };
  const handleSearchChange = (e) => {
    setSearch_key(e.target.value);
    setProductsList([]);
    setSearchCategories([]);
    getProducts(e.target.value);
  };
  const handleSearch = (e) => {
    e.preventDefault();
    getProducts();
  };
  const handleBulkAllSelect = (e, items) => {
    if (e.target.checked) {
      let d = items.map((item) => {
        item.selected = true;
        return item;
      });
      setbulkRFQVendors(d);
    } else {
      let d = items.map((item) => {
        item.selected = false;
        return item;
      });
      setbulkRFQVendors([]);
    }
  };

  const handleAutocompleteClick = (item) => {
    setIsOpen(false);

    // Check if the clicked product is already selected
    if (item.product_name === currentSelectedProduct?.product_name) return;

    // Set the search key and update the selected product
    setSearch_key(item.product_name);
    setcurrentSelectedProduct(null);
    setcurrentSelectedProduct(item);
    setShowInsights(true);
    tempProdRef.current = null;

    // Update the URL to include the selected product's slug
    const newUrl = `/vendor/${item.slug}`;
    window.history.pushState(null, null, newUrl);
    storageInstance.setStorage("product_name", slug);
  };

  const getChildCategories = (id, level) => {
    let childItems = categories.filter((item) => item.parent_id == id);
    let options = [];
    if (childItems.length > 0) {
      childItems.map((item) => {
        options.push({ value: item?.id, label: item?.title });
      });
    }
    if (level == 1) {
      setlevelOneCat(options);
    } else if (level == 2) {
      setlevelTwoCat(options);
    } else if (level == 3) {
      setlevelThreeCat(options);
    } else if (level == 4) {
      setlevelFourCat(options);
    } else if (level == 5) {
      setlevelFiveCat(options);
    } else if (level == 6) {
      setlevelSixCat(options);
    } else {
    }
  };

  const handleRemoveCurrentSelected = () => {
    dispatch(removeRfqProduct(currentSelectedProduct));
    setcurrentSelectedProduct(null);
    setSearch_key("");
  };

  const clearCategoriesLevels = () => {
    setlevelZeroCat([]);
    setlevelOneCat([]);
    setlevelTwoCat([]);
    setlevelThreeCat([]);
    setlevelFourCat([]);
    setlevelFiveCat([]);
    setlevelSixCat([]);
    setCat_id("");
  };

  const setLevelZeroValue = (id) => {
    let selectedItem = categories.filter((item) => item.id == id);

    setlevelZeroCat({
      label: selectedItem[0].title,
      value: selectedItem[0].id,
    });
  };

  const clearLocationFilter = () => {
    setselectedState(0);
    setselectedCity(0);
  };

  const mapEntries = Array.from(categoryLvlRef.current.entries());

  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid  text-center">
          <h1 className="heading">{title}</h1>
          <div className="d-flex justify-content-end">


            {/* <Link
              href="/dashboard/buyer/rfq-management?tab=create-rfq"
              className="page-link backBtn"
              onClick={(e) => {
                e.preventDefault();
                router.back()
              }
              }
            >
              {" "}
              <FontAwesomeIcon icon={faArrowLeft} /> Go back
            </Link> */}

            <Link
              href="#"
              className="page-link backBtn btn btn-secondary text-white px-2 "
              style={{ minWidth: "280px" }}
              onClick={(e) => {
                e.preventDefault();
                if (!isLoggedIn) {
                  setOpenAuthModal(true)
                  setRedirectAfterLogin("/dashboard/buyer/magic-search")
                }
                else router.push("/dashboard/buyer/magic-search")
              }}
            >
              {" "}
              <FontAwesomeIcon icon={faWandMagicSparkles} className="me-2" /> Generate RFQ from BOQ
            </Link>
          </div>
        </div>
      </section>

      <section className="search-sec-1">
        <div className="container-fluid product-search">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
                <form onSubmit={handleSearch}>
                  <div className="row filter">
                    <div className="col-md-1"></div>
                    <div className="col-md-8 searchbox " ref={searchRef}>
                      <i>
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                      </i>
                      <label ref={searchLabelRef} htmlFor="search"></label>
                      <input
                        type="search"
                        name="search"
                        id="search"
                        placeholder="Ex. Flanges"
                        onChange={handleSearchChange}
                        onFocus={handleSearchChange}
                        autoComplete="off"
                        value={search_key}
                        onClick={handleSearchClick}
                      />

                      {isOpen && (
                        <div className="search_results_autocomplete">
                          {loading && (
                            <p>
                              {" "}
                              <div
                                className="spinner-border text-primary spinner-border-sm mr-4"
                                role="status"
                              ></div>{" "}
                              Fetching..
                            </p>
                          )}
                          {!loading && search_key === "" && (
                            <p className="mb-0">Start Typing Product Name...</p>
                          )}
                          {!loading && search_key !== "" && products.length == 0 && searchCategories.length == 0 && (
                            <p className="mb-0">No Products found!</p>
                          )}
                          {!loading && search_key !== "" && (products.length > 0 || searchCategories.length > 0) && (
                            <>
                              <p className="text-center fw-bold " style={{ color: "var(--secondary-color)" }}>Select an option from dropdown</p>
                              <div className="row">
                                <div className="col-7">
                                  <div className="container">
                                    <h4 className="sticky-top fw-semibold text-center text-white py-1 rounded-2">Product List</h4>
                                    <ul>
                                      {products.map((item, index) => {
                                        return (
                                          <li
                                            key={`mp_${index}`}
                                            className="ps-2"
                                            onClick={() =>
                                              handleAutocompleteClick(item)
                                            }
                                            title={`${item.product_name} - ${item.description}`}
                                          >
                                            {/* <i>
                                              <FontAwesomeIcon icon={faPlus} />
                                            </i> */}
                                            <div>
                                              <h4>{item.product_name}</h4>
                                              <p>
                                                <small>
                                                  <b>{item.category_name} </b>
                                                  {(item.description && item.description != 'null') ? `| ${item.description}` : ""}
                                                </small>
                                              </p>
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                </div>
                                <div className="col-5">
                                  <div className="container">
                                    <h4 className="sticky-top fw-semibold text-center text-white py-1 rounded-2">Category List</h4>
                                    <ul>
                                      {searchCategories.map((item, index) => {
                                        return (
                                          <li
                                            key={`search_cat_${index}`}
                                            onClick={() =>
                                              getCategoriesById(item.category_id, item.category_name)
                                            }
                                            title={`${item.category_name}`}
                                          >
                                            <i>
                                              <FontAwesomeIcon icon={faPlus} />
                                            </i>
                                            <div>
                                              <h4>{item.category_name}</h4>
                                              <p>
                                                <small>
                                                  <b>{item.parent_category_name} </b>
                                                </small>
                                              </p>
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {isOpen && (
                        <div
                          className="blur-overlay"
                          onClick={() => {
                            setIsOpen(false);
                          }}
                        />
                      )}
                    </div>

                    <div className="col-md-3 hasNoBlur">
                      <div className="action-top mb-0">
                        {vabloading && (
                          <select>
                            <option value="">Loading List</option>
                          </select>
                        )}
                        {!vabloading && (
                          <select
                            name="vab"
                            id="vab"
                            value={selectedVbaa}
                            onChange={(e) => {
                              localStorage.setItem(
                                "selected_vab",
                                e.target.value
                              );
                              setselectedVbaa(e.target.value);
                            }}
                          >
                            <option value="">Vendor Approved By</option>
                            {approved_by &&
                              approved_by.map((item) => {
                                if (item.show_in_website == 1 && item.vendor_approve && item.vendor_approve != 'null') {
                                  return (
                                    <option value={item.id} key={`va_${item.id}`}>
                                      {item.vendor_approve}
                                    </option>
                                  );
                                }
                              })}
                          </select>
                        )}

                        {/* <span>
                          <Link
                            href="#"
                            className="btn btn-secondary mt-0 mb-0"
                            onClick={handleSearch}
                          >
                            Search
                          </Link>
                        </span> */}
                      </div>
                    </div>
                  </div>
                </form>
                {/* <div className="searchCategories">             
                  {catloading && (
                    <div className="filter-options mt-4">
                      {" "}
                      <span>Loading filter options</span>{" "}
                    </div>
                  )}
                  {!catloading && (
                    <div className="filter-options mt-4">
                      
                      <Select
                        id={id}
                        options={parentCategories}
                        placeholder="Select Category"
                        isClearable={true}
                        styles={customSelectStyles}
                        onChange={(e) => {
                          setlevelOneCat([]);
                          setlevelTwoCat([]);
                          setlevelThreeCat([]);
                          setlevelFourCat([]);
                          setlevelFiveCat([]);
                          setlevelSixCat([]);
                          getChildCategories(e.value, "1");
                          if (e && e.value) {
                            setCat_id(e.value);
                          } else {
                            setCat_id("");
                          }
                        }}
                      />
                      {levelOneCat && levelOneCat.length > 0 && (
                        <Select
                          options={levelOneCat}
                          placeholder="Select Sub Category"
                          isClearable={true}
                          styles={customSelectStyles}
                          onChange={(e) => {
                            getChildCategories(e.value, "2");
                            if (e && e.value) {
                              setCat_id(e.value);
                            } else {
                              setCat_id("");
                            }
                          }}
                        />
                      )}
                      {levelTwoCat && levelTwoCat.length > 0 && (
                        <Select
                          options={levelTwoCat}
                          placeholder="Select Sub Category"
                          isClearable={true}
                          styles={customSelectStyles}
                          onChange={(e) => {
                            getChildCategories(e.value, "3");
                            if (e && e.value) {
                              setCat_id(e.value);
                            } else {
                              setCat_id("");
                            }
                          }}
                        />
                      )}
                      {levelThreeCat && levelThreeCat.length > 0 && (
                        <Select
                          options={levelThreeCat}
                          placeholder="Select Sub Category"
                          isClearable={true}
                          styles={customSelectStyles}
                          onChange={(e) => {
                            getChildCategories(e.value, "4");
                            if (e && e.value) {
                              setCat_id(e.value);
                            } else {
                              setCat_id("");
                            }
                          }}
                        />
                      )}
                      {levelFourCat && levelFourCat.length > 0 && (
                        <Select
                          options={levelFourCat}
                          placeholder="Select Sub Category"
                          isClearable={true}
                          styles={customSelectStyles}
                          onChange={(e) => {
                            getChildCategories(e.value, "5");
                            if (e && e.value) {
                              setCat_id(e.value);
                            } else {
                              setCat_id("");
                            }
                          }}
                        />
                      )}
                      {levelFiveCat && levelFiveCat.length > 0 && (
                        <Select
                          options={levelFiveCat}
                          placeholder="Select Sub Category"
                          isClearable={true}
                          styles={customSelectStyles}
                          onChange={(e) => {
                            getChildCategories(e.value, "6");
                            if (e && e.value) {
                              setCat_id(e.value);
                            } else {
                              setCat_id("");
                            }
                          }}
                        />
                      )}
                      {levelSixCat && levelSixCat.length > 0 && (
                        <Select
                          options={levelSixCat}
                          placeholder="Select Sub Category"
                          isClearable={true}
                          styles={customSelectStyles}
                          onChange={(e) => {
                            getChildCategories(e.value, "7");
                            if (e && e.value) {
                              setCat_id(e.value);
                            } else {
                              setCat_id("");
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="search-sec-2">
        <div className="container-fluid">

          {/* Search Categories Section */}
          {searchSubCategories.length > 0 && (
            <div className=" col-md-12 bg-white rounded-5 p-4">
              <div className="search-sec-3-mdl my-3">
                <div className="search-sec-3-mdl-con ">
                  <div className="container">
                    <h3>Sub Categories List</h3>
                    <div className="parent-categories">
                      {
                        mapEntries?.map(([category_id, category_name], index) => {
                          const isLastItem = index === mapEntries?.size - 1;
                          return (
                            <p
                              role="button"
                              key={category_id}
                              className="fs-6 badge text-bg-warning mx-1 px-3 py-2"
                              onClick={() => {
                                categoryLvlRef.current = new Map(mapEntries.slice(0, index + 1));
                                getCategoriesById(category_id, category_name)
                              }}
                            >
                              {category_name}
                              <span className="ms-1">{!isLastItem ? " > " : ""}</span>
                            </p>
                          );
                        })
                      }
                    </div>
                    {loading && !currentSelectedProduct && <FullLoader />}
                    {!loading && searchSubCategories.length <= 1 && productsList.length == 0
                      ? <p className="text-center my-4">No Products Found.....! Please search for different product/category.</p>
                      : searchSubCategories.map((item) => {
                        if (!categoryLvlRef.current.has(item.id)) {
                          return (
                            <p
                              role="button"
                              key={item.id}
                              className="badge text-bg-primary mx-1 px-3 py-2 "
                              onClick={() => getCategoriesById(item.id, item.title)}
                            >
                              {item.title}
                            </p>
                          )
                        }
                      })}

                    {productsList.length > 0 && (
                      <>
                        <h3 className="mt-4">Product List</h3>
                        <div className="row">
                          {productsList.map((item, index) => {
                            return (
                              <div className="col-md-6 col-lg-4">
                                <p
                                  role="button"
                                  key={`srch_prod_${index}`}
                                  className={`border border-2 rounded-3 px-3 py-2 ${item.product_name == (tempProdRef.current?.product_name || currentSelectedProduct?.product_name) ? "bg-success border-success text-white" : ""}`}

                                  onClick={() => handleAutocompleteClick(item)}
                                >
                                  {item.product_name}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Price Stats Section */}
          {isLoggedIn && currentSelectedProduct && showInsights && (
            <div className=" col-md-12 bg-white rounded-5 p-4">
              <div className="search-sec-3-mdl mt-2 mb-0">
                <div className="search-sec-3-mdl-con ">
                  <div className="container">
                    <h3>
                      Product Insight{"  "}
                      <FontAwesomeIcon icon={faSolidLightbulb} color={"#FFD700"} />
                    </h3>
                    <ProductOverview data={currentSelectedProduct} setShowInsights={setShowInsights} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* vendor List Section */}
          <div className="row" id="vendors_area" ref={vendor_area_ref}>
            {currentSelectedProduct && (
              <div className="col-md-3">
                <aside>
                  <h4>Filter</h4>
                  <div className="search-con-right-1">
                    <p>Location</p>
                    {selectedState != 0 && (
                      <Link
                        href="#"
                        className="clearFilter"
                        onClick={(e) => {
                          e.preventDefault();
                          clearLocationFilter();
                        }}
                      >
                        <FontAwesomeIcon icon={faTimesCircle} /> clear
                      </Link>
                    )}

                    <div className="hasFullLoader">
                      <LocationFilter
                        selectedState={selectedState}
                        setselectedState={setselectedState}
                        selectedCity={selectedCity}
                        setselectedCity={setselectedCity}
                        vendorMetaData={vendorMetaData}
                        setOpenAuthModal={setOpenAuthModal}
                      />
                    </div>

                  </div>
                  <div className="search-con-right-1">
                    <p>Vendor Approved By</p>
                    <div>
                      {vabloading && (
                        <select>
                          <option value="">Loading List</option>
                        </select>
                      )}
                      {!vabloading && (
                        <select
                          name="vab"
                          id="vab"
                          value={selectedVbaa}
                          onChange={(e) => {
                            if (!vendorMetaData.logged_In || !vendorMetaData.subscription)
                              setOpenAuthModal(true)
                            else {
                              localStorage.setItem(
                                "selected_vab",
                                e.target.value
                              );
                              setselectedVbaa(e.target.value);
                            }
                          }}
                        >
                          <option value="">Select Vendor</option>
                          {approved_by &&
                            approved_by.map((item) => {
                              if (item.show_in_website == 1 && item.vendor_approve && item.vendor_approve != 'null') {
                                return (
                                  <option value={item.id} key={`va_${item.id}`}>
                                    {item.vendor_approve}
                                  </option>
                                );
                              }
                            })}
                        </select>
                      )}
                      {selectedVbaa && (
                        <Link
                          className="clearFilter"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setselectedVbaa("");
                          }}
                        >
                          <FontAwesomeIcon icon={faTimesCircle} /> clear
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="search-con-right-1 search-con-right-2">
                    <p>Category</p>
                    {catloading && (
                      <div className="filter-options mt-4">
                        {" "}
                        <span>Loading filter options</span>{" "}
                      </div>
                    )}
                    {!catloading && (
                      <div className="filter-options mt-4">
                        {cat_id && (
                          <Link
                            href="#"
                            className="clearFilter"
                            onClick={(e) => {
                              e.preventDefault();
                              clearCategoriesLevels();
                            }}
                          >
                            <FontAwesomeIcon icon={faTimesCircle} /> clear
                          </Link>
                        )}
                        {/* <span>Filter by category</span> */}
                        <Select
                          className="mt-2"
                          id={id}
                          options={parentCategories}
                          placeholder="Select Category"
                          isClearable={false}
                          value={levelZeroCat}
                          styles={customSelectStyles}
                          onChange={(e) => {
                            if (!vendorMetaData.logged_In || !vendorMetaData.subscription)
                              setOpenAuthModal(true)
                            else {
                              setLevelZeroValue(e.value);
                              setlevelOneCat([]);
                              setlevelTwoCat([]);
                              setlevelThreeCat([]);
                              setlevelFourCat([]);
                              setlevelFiveCat([]);
                              setlevelSixCat([]);
                              getChildCategories(e.value, "1");
                              if (e && e.value) {
                                setCat_id(e.value);
                              } else {
                                setCat_id("");
                              }
                            }
                          }}
                        />

                        {levelOneCat && levelOneCat.length > 0 && (
                          <Select
                            className="mt-2"
                            options={levelOneCat}
                            placeholder="Select Sub Category"
                            isClearable={false}
                            styles={customSelectStyles}
                            onChange={(e) => {
                              getChildCategories(e.value, "2");
                              if (e && e.value) {
                                setCat_id(e.value);
                              } else {
                                setCat_id("");
                              }
                            }}
                          />
                        )}
                        {levelTwoCat && levelTwoCat.length > 0 && (
                          <Select
                            className="mt-2"
                            options={levelTwoCat}
                            placeholder="Select Sub Category"
                            isClearable={false}
                            styles={customSelectStyles}
                            onChange={(e) => {
                              getChildCategories(e.value, "3");
                              if (e && e.value) {
                                setCat_id(e.value);
                              } else {
                                setCat_id("");
                              }
                            }}
                          />
                        )}
                        {levelThreeCat && levelThreeCat.length > 0 && (
                          <Select
                            className="mt-2"
                            options={levelThreeCat}
                            placeholder="Select Sub Category"
                            isClearable={false}
                            styles={customSelectStyles}
                            onChange={(e) => {
                              getChildCategories(e.value, "4");
                              if (e && e.value) {
                                setCat_id(e.value);
                              } else {
                                setCat_id("");
                              }
                            }}
                          />
                        )}
                        {levelFourCat && levelFourCat.length > 0 && (
                          <Select
                            className="mt-2"
                            options={levelFourCat}
                            placeholder="Select Sub Category"
                            isClearable={false}
                            styles={customSelectStyles}
                            onChange={(e) => {
                              getChildCategories(e.value, "5");
                              if (e && e.value) {
                                setCat_id(e.value);
                              } else {
                                setCat_id("");
                              }
                            }}
                          />
                        )}
                        {levelFiveCat && levelFiveCat.length > 0 && (
                          <Select
                            className="mt-2"
                            options={levelFiveCat}
                            placeholder="Select Sub Category"
                            isClearable={false}
                            styles={customSelectStyles}
                            onChange={(e) => {
                              getChildCategories(e.value, "6");
                              if (e && e.value) {
                                setCat_id(e.value);
                              } else {
                                setCat_id("");
                              }
                            }}
                          />
                        )}
                        {levelSixCat && levelSixCat.length > 0 && (
                          <Select
                            className="mt-2"
                            options={levelSixCat}
                            placeholder="Select Sub Category"
                            isClearable={false}
                            styles={customSelectStyles}
                            onChange={(e) => {
                              getChildCategories(e.value, "7");
                              if (e && e.value) {
                                setCat_id(e.value);
                              } else {
                                setCat_id("");
                              }
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
            <div className={currentSelectedProduct ? `col-md-9` : `col-md-12`}>
              <div className="row">
                {currentSelectedProduct && (
                  <div className="col-md-12">
                    {vendors && vendors.length > 0 && (
                      <div className="row search-sec-3-top">
                        {currentSelectedProduct && <h4>Available Vendors</h4>}
                        <div className="col-md-2">
                          <label>
                            <input
                              type="checkbox"
                              onClick={(e) => handleBulkAllSelect(e, vendors)}
                            />
                            <span>Select all vendors</span>
                          </label>
                        </div>
                        <div className="col-md-10">
                          {vendorMetaData.subscription && (
                            <div className="actions">
                              {bulkRFQVendors.length > 0 && (
                                <Link
                                  href="#"
                                  className={`btn btn-primary ${!vendorMetaData.subscription
                                    ? `disabled`
                                    : ``
                                    }`}
                                  onClick={handleBulkAddToRFQ}
                                >
                                  Add To All RFQs
                                </Link>
                              )}
                              <Link
                                href="/dashboard/buyer/rfq-management?tab=create-rfq"
                                className={`btn btn-primary ${!vendorMetaData.subscription
                                  ? `disabled`
                                  : ``
                                  }`}
                              >
                                View All RFQs{" "}
                                {rfqProductsFromStore.length > 0 && (
                                  <small style={{ display: "none" }}>
                                    ({rfqProductsFromStore.length}{" "}
                                    {`item${rfqProductsFromStore.length > 1 ? "s" : ""
                                      }`}
                                    )
                                  </small>
                                )}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <hr />

                    {loading && <FullLoader />}

                    <div className="search-sec-3-mdl hasFullLoader">
                      <div className="search-sec-3-mdl-con all-products-wrap hasFullLoader">
                        {loading && <FullLoader />}
                        {!loading && vendors.length == 0 && (
                          <p className="text-center pt-4">
                            No vendors found. Please modify your search
                          </p>
                        )}
                        {vendors &&
                          vendors.map((item) => {
                            return (
                              <SearchItem
                                handleRemoveCurrentSelected={handleRemoveCurrentSelected}
                                currentSelectedProduct={currentSelectedProduct}
                                setbulkRFQVendors={setbulkRFQVendors}
                                bulkRFQVendors={bulkRFQVendors}
                                type={"vendors"}
                                data={item}
                                vendorMetaData={vendorMetaData}
                                setOpenAuthModal={setOpenAuthModal}
                                addToRFQ={addToRFQ}
                              />
                            );
                          })}
                      </div>

                      {!loading && (!vendorMetaData?.logged_In || !vendorMetaData?.subscription) &&
                        <div className="container text-center my-4 ">
                          {/* <p>Total Vendors Found - {vendorMetaData?.total}</p> */}
                          <button
                            type="button"
                            className="btn btn-primary w-50"
                            onClick={handleRedirect}
                          >
                            {!vendorMetaData?.logged_In ? `Register to view ${vendorMetaData?.total > 0 ? vendorMetaData?.total : ""} more vendors` : `Please Buy Subscription to View ${vendorMetaData?.total > 0 ? vendorMetaData?.total : ""} more Vendors`}
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                )}
                {!currentSelectedProduct && (
                  <div className="col-md-12 hasblankpadding">
                    <h4 className="text-center">
                      <b>Search & Select a product</b>
                      <br /> to see the available vendors!
                    </h4>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ------------- Auth Modal ------------- */}
        <LoginContainer
          loading={loading}
          setloading={setloading}
          openAuthModal={openAuthModal}
          setOpenAuthModal={setOpenAuthModal}
          activeAuthTab={activeAuthTab}
          setActiveAuthTab={setActiveAuthTab}
        />

      </section>
    </>
  );
};

export default Search;
