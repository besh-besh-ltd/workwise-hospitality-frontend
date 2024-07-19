import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faLocation,
  faLocationDot,
  faMagnifyingGlass,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import { searchProducts, searchProductsV2 } from "@/services/products";
import SearchItem from "@/components/search/searchItem";
import FullLoader from "@/components/shared/FullLoader";
import { categoryList, vendorApproveList } from "@/services/rfq";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import {
  addRfqProduct,
  addVendor,
  removeRfqProduct,
  setDefaultVAB,
} from "@/redux/slice";
import { ToastContainer, toast } from "react-toastify";
import Loader from "@/components/shared/Loader";
import { faTimesCircle } from "@fortawesome/free-regular-svg-icons";
import { getProfile } from "@/services/Auth";
import { getCities, getStates } from "@/services/cms";
import { useRouter } from "next/router";

const customSelectStyles = {
  control: (base) => ({
    ...base,
    height: 50,
    minHeight: 50,
  }),
};

const Search = ({ title = "Preffered Vendors", type }) => {
  const router = useRouter();
  const { s } = router.query;
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
  const [bulkRFQProducts, setbulkRFQProducts] = useState([]);
  const [currentSelectedProduct, setcurrentSelectedProduct] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [levelZeroCat, setlevelZeroCat] = useState([]);
  const [levelOneCat, setlevelOneCat] = useState([]);
  const [levelTwoCat, setlevelTwoCat] = useState([]);
  const [levelThreeCat, setlevelThreeCat] = useState([]);
  const [levelFourCat, setlevelFourCat] = useState([]);
  const [levelFiveCat, setlevelFiveCat] = useState([]);
  const [levelSixCat, setlevelSixCat] = useState([]);
  const [userProfile, setuserProfile] = useState(null);

  const [statesLoading, setstatesLoading] = useState(false);
  const [states, setstates] = useState([]);
  const [selectedState, setselectedState] = useState(0);

  const [citiesLoading, setcitiesLoading] = useState(false);
  const [cities, setcities] = useState([]);
  const [selectedCity, setselectedCity] = useState(0);

  useEffect(() => {
    if (s && s != "") {
      setSearch_key(s.split("+").join(" "));
      setTimeout(() => {
        searchRef.current.focus();
        searchLabelRef.current.click();
      }, 1000);

      // getProducts();
    }
  }, [router]);

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
    getProducts();
    getCategories();
    getVendorApprovedby();
    getAllStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      getAllCities();
    }
  }, [selectedState]);

  useEffect(() => {
    getVendors();
  }, [
    currentSelectedProduct,
    selectedVbaa,
    cat_id,
    selectedState,
    selectedCity,
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

  const getProfileDetails = () => {
    setloading(true);
    getProfile().then((res) => {
      setloading(true);
      setuserProfile(res.data);
    });
  };

  const getAllStates = () => {
    setstatesLoading(true);
    getStates().then((res) => {
      setstatesLoading(false);
      setstates(res.data);
    });
  };

  const getAllCities = () => {
    setcitiesLoading(true);
    getCities(selectedState).then((res) => {
      setcitiesLoading(false);
      setcities(res.data);
    });
  };

  const handleBulkAddToRFQ = (e) => {
    e.preventDefault();
    if (bulkRFQProducts.length > 0) {
      bulkRFQProducts.map((item) => {
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
          <b>{bulkRFQProducts.length} vendors</b> Successfully added to RFQ
          list!
        </h6>,
        {
          position: "top-right",
        }
      );
    }
  };
  const getVendors = () => {
    setloading(true);
    setVendors([]);
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
        currentSelectedProduct
          ? vendor_area_ref.current.scrollIntoView({ behavior: "smooth" })
          : null;
      })
      .catch((error) => {
        setloading(false);
        console.log(error);
      });
  };
  const getProducts = (s_key = search_key) => {
    setloading(true);
    searchProductsV2(
      {
        cat_id,
        search_key: s_key,
        approved_by: selectedVbaa,
      },
      type
    )
      .then((rsp) => {
        setloading(false);
        let d = rsp.data.map((item) => {
          item.selected = false;
          return item;
        });
        setProducts(d);
      })
      .catch((error) => {
        setloading(false);
        console.log(error);
      });
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
      setbulkRFQProducts(d);
    } else {
      let d = items.map((item) => {
        item.selected = false;
        return item;
      });
      setbulkRFQProducts([]);
    }
  };

  const handleAutocompleteClick = (item) => {
    setIsOpen(false);
    setSearch_key(item.product_name);
    //dispatch(removeRfqProduct(currentSelectedProduct));
    setcurrentSelectedProduct(null);

    setcurrentSelectedProduct(item);
    dispatch(addRfqProduct(item));
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

  const handleStateChange = (e) => {
    setcities([]);
    setselectedState(e.target.value);
  };
  const handleCityChange = (e) => {
    setselectedCity(e.target.value);
  };
  const clearLocationFilter = (e) => {
    setcities([]);
    setselectedState(0);
    setselectedCity(0);
  };

  return (
    <>
      <ToastContainer />
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid  text-center">
          <h1 className="heading">{title}</h1>
          <Link
            href="/dashboard/buyer/rfq-management?tab=create-rfq"
            className="page-link backBtn"
          >
            {" "}
            <FontAwesomeIcon icon={faArrowLeft} /> Go back
          </Link>
        </div>
      </section>

      <section className="search-sec-1">
        <div className="container-fluid product-search">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
                <form onSubmit={handleSearch}>
                  <div className="row filter">
                    <div className="col-md-2"></div>
                    <div className="col-md-5 searchbox " ref={searchRef}>
                      <i>
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                      </i>
                      <label ref={searchLabelRef} htmlFor="search"></label>
                      <input
                        type="search"
                        name="search"
                        id="search"
                        placeholder="Ex. Deluge Valve"
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
                          {!loading && products.length == 0 && (
                            <p className="mb-0">No Products found!</p>
                          )}
                          {!loading && products.length > 0 && (
                            <ul>
                              {products.map((item, index) => {
                                return (
                                  <li
                                    key={`mp_${index}`}
                                    onClick={() =>
                                      handleAutocompleteClick(item)
                                    }
                                    title={`${item.product_name} - ${item.description}`}
                                  >
                                    <i>
                                      <FontAwesomeIcon icon={faPlus} />
                                    </i>
                                    <div>
                                      <h4>{item.product_name}</h4>
                                      <p>
                                        <small>
                                          <b>{item.category_name} </b> |{" "}
                                          {item.description}
                                        </small>
                                      </p>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
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

                    <div className="col-md-4 hasNoBlur">
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
                                return (
                                  <option value={item.id} key={`va_${item.id}`}>
                                    {item.vendor_approve}
                                  </option>
                                );
                              })}
                          </select>
                        )}

                        <span>
                          <Link
                            href="#"
                            className="btn btn-secondary mt-0 mb-0"
                            onClick={handleSearch}
                          >
                            Search
                          </Link>
                        </span>
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
          {currentSelectedProduct && (
            <div className=" col-md-12">
              <div className="search-sec-3-mdl">
                <div className="search-sec-3-mdl-con ">
                  <SearchItem
                    handleRemoveCurrentSelected={handleRemoveCurrentSelected}
                    selectedProduct={true}
                    setbulkRFQProducts={setbulkRFQProducts}
                    bulkRFQProducts={bulkRFQProducts}
                    type={type}
                    key={`product-item-${currentSelectedProduct.id}`}
                    data={currentSelectedProduct}
                  />
                </div>
              </div>
            </div>
          )}
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
                    <select
                      onChange={(e) => handleStateChange(e)}
                      value={selectedState}
                    >
                      <option value={0}>Select State</option>
                      {states &&
                        states.map((item) => {
                          return (
                            <option key={item.id} value={item.id}>
                              {item.state_name}
                            </option>
                          );
                        })}
                    </select>
                    <div className="hasFullLoader">
                      {citiesLoading && <FullLoader />}
                      <select
                        onChange={(e) => handleCityChange(e)}
                        value={selectedCity}
                        className="mt-2"
                      >
                        <option value={0}>Select City</option>
                        {cities &&
                          cities.map((item) => {
                            return (
                              <option key={item.id} value={item.id}>
                                {item.city_name}
                              </option>
                            );
                          })}
                      </select>
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
                            localStorage.setItem(
                              "selected_vab",
                              e.target.value
                            );
                            setselectedVbaa(e.target.value);
                          }}
                        >
                          <option value="">Select Vendor</option>
                          {approved_by &&
                            approved_by.map((item) => {
                              return (
                                <option value={item.id} key={`va_${item.id}`}>
                                  {item.vendor_approve}
                                </option>
                              );
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
                          {userProfile.subscription_plan_id && (
                            <div className="actions">
                              {bulkRFQProducts.length > 0 && (
                                <Link
                                  href="#"
                                  className={`btn btn-primary ${
                                    !userProfile.subscription_plan_id
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
                                className={`btn btn-primary ${
                                  !userProfile.subscription_plan_id
                                    ? `disabled`
                                    : ``
                                }`}
                              >
                                View All RFQs{" "}
                                {rfqProductsFromStore.length > 0 && (
                                  <small style={{ display: "none" }}>
                                    ({rfqProductsFromStore.length}{" "}
                                    {`item${
                                      rfqProductsFromStore.length > 1 ? "s" : ""
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
                                handleRemoveCurrentSelected={
                                  handleRemoveCurrentSelected
                                }
                                currentSelectedProduct={currentSelectedProduct}
                                setbulkRFQProducts={setbulkRFQProducts}
                                bulkRFQProducts={bulkRFQProducts}
                                type={"vendors"}
                                key={`product-item-${item.id}`}
                                data={item}
                              />
                            );
                          })}
                      </div>
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
      </section>
    </>
  );
};

export default Search;
