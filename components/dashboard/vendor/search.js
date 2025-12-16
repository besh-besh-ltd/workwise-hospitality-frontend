import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import {  getProductMakeList, parentCategoryList, searchProductsV2, nestedCategoryData, getRandomProducts } from "@/services/products";
import Slider from 'react-slick';
import RandomProductsCarousel from '@/components/dashboard/vendor/RandomProductsCarousel';
import SeoTitle from '@/components/dashboard/vendor/SeoTitle';
import SearchItem from "@/components/search/searchItem";
import FullLoader from "@/components/shared/FullLoader";
import { categoryList, categoryListById, vendorApproveList, addProductToDraft, bulkSearchVendorsByCategory } from "@/services/rfq";
import { useDispatch } from "react-redux";
import {
  setDefaultVAB,
} from "@/redux/slice";
import { toast } from "react-toastify";
import { faTimesCircle } from "@fortawesome/free-regular-svg-icons";
import { useRouter } from "next/router";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import LocationFilter from "@/components/shared/LocationFilter";
import storageInstance from "@/utils/storageInstance";
import Head from "next/head";
import { textCapitalize } from "@/utils/sharedFunctions";
import { debounce } from "lodash";
import Select from 'react-select';
import axiosInstance from "@/lib/axios";
import { BusinessTypes } from "@/utils/constants";
import { getCountries, getStates, getCities } from "@/services/cms";
import { AllCategoriesSection } from "@/components/products/utils/AllCategoriesSection";
import { SecurityFeatures } from "@/pages/why-workwise/TrustSecurity";
import NestedCategoryBrowser from "./NestedCategoryBrowser";
import FeatureSEOSection from "./FeatureSEOsection";


export const vendorConditions = [
  {
    label: "Previously Finalized Vendors",
    value: "prev_finalized",
  },
  {
    label: "Sent RFQ atleast once",
    value: "rfq_sent",
  },
]

export const subscriptionTypes = [
  {
    label: "Premium",
    value: "premium",
  },
]

  // Options for the dropdown
  const optionVendors = [
    { value: 'is_private', label: 'My Private Vendor' },
    { value: 'is_public', label: 'My Public Vendor' },
    { value: 'both', label: 'Both' },
  ];

const Search = ({ title = "Preffered Vendors", type }) => {
  const router = useRouter();
  const { slug, s, loggedin } = router.query;

  const vendor_area_ref = useRef();
  const id = Date.now().toString();
  const [isOpen, setIsOpen] = useState(false);
  const [vendorTypeOpen, setVendorTypeOpen] = useState(false);
  const [approvedByOpen, setApprovedByOpen] = useState(false);
  const [internalVendorTypes, setInternalVendorTypes] = useState(BusinessTypes)
  const [internalApprovedBy, setInternalApprovedBy] = useState([])
  const searchRef = useRef(null);
  const searchLabelRef = useRef(null);
  const dispatch = useDispatch();
  const [cat_id, setCat_id] = useState(null);
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
  const [vendorTypes, setVendorTypes] = useState(BusinessTypes);

  const [selectedCountry, setselectedCountry] = useState([]);
  const [selectedState, setselectedState] = useState([]);
  const [selectedCity, setselectedCity] = useState([]);
  const [selectedVendorTypes, setSelectedVendorTypes] = useState([]);
  const [selectedApprovedBy, setSelectedApprovedBy] = useState([]);
  const [turnOver, setTurnOver] = useState({
    from: -1,
    to: -1
  })
  const [prevWorkedWith, setPrevWorkedWith] = useState(null);
  const [makeList, setMakeList] = useState([]);
  const [selectedMakes, setSelectedMakes] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [allAvailableCities, setAllAvailableCities] = useState([]);
  const vendorRequestIdRef = useRef(0);
  const categoryCityCacheRef = useRef(new Map());
  const categoryCityFetchRef = useRef(new Set());

  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const tempProdRef = useRef(null);
  const [searchCategories, setSearchCategories] = useState([]);
  const [searchSubCategories, setSearchSubCategories] = useState([]);
  // Nested categories state for dynamic rendering from backend
  const [nestedCategories, setNestedCategories] = useState([]);
  // Nested category browsing moved to NestedCategoryBrowser component
  // fetchNestedCategories logic moved to NestedCategoryBrowser
  const [productsList, setProductsList] = useState([]);
  // random products carousel state moved to RandomProductsCarousel component
  const categoryLvlRef = useRef(new Map());
  const [firstVisit, setFirstVisit] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [debouncedVendorName, setDebouncedVendorName] = useState(vendorName);
  const [is_private, setIs_private] = useState(false);
  const [myVendorType, setMyVendorType] = useState(null);
  const [preferred_vendor, setPreferred_vendor] = useState(false);
  const [inputValue, setInputValue] = useState(""); // For what user is typing
  const [suggestionLoading, setSuggestionLoading] = useState(false); // For suggestion fetch
  const [suggestions, setSuggestions] = useState([]); // Product name suggestions
    const [showBrowser, setShowBrowser] = useState(true);
    const [vendorFirstSearch, setVendorFirstSearch] = useState(false);

  const [queryMeta, setQueryMeta] = useState({
    rfq_id: null,
    sheet_id: null,
  })
  
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const vendorTypeRef = useRef(null);
  const vendorApprovedByRef = useRef(null);

  const prevFiltersRef = useRef(null);

  const filterSnapshot = useMemo(() => ({
  country: selectedCountry,
  state: selectedState,
  city: selectedCity,
  vendorTypes: selectedVendorTypes,
  approvedBy: selectedApprovedBy,
  makes: selectedMakes,
  prevWorkedWith,
  myVendorType,
  vendorName: debouncedVendorName,
  turnOver,
  subscriptionType: selectedSubscription,
}), [
  selectedCountry,
  selectedState,
  selectedCity,
  selectedVendorTypes,
  selectedApprovedBy,
  selectedMakes,
  prevWorkedWith,
  myVendorType,
  debouncedVendorName,
  turnOver,
  selectedSubscription
]);


  const slugStr = useMemo(() => {
    if (Array.isArray(slug)) return slug.join("/");
    return typeof slug === "string" ? slug : "";
  }, [slug]);
  const categoryIdFromSlug = useMemo(() => {
    if (!slugStr) return null;
    const match = slugStr.match(/-category(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }, [slugStr]);
  const isCategorySlug = useMemo(() => !!categoryIdFromSlug, [categoryIdFromSlug]);
  const categoriesLoaded = Array.isArray(categories) && categories.length > 0;
  const topLevelCategoryIds = useMemo(
    () => (categoriesLoaded ? categories.map((cat) => cat.id) : []),
    [categoriesLoaded, categories]
  );
  const isTopLevelCategory = useMemo(() => {
    if (!categoryIdFromSlug) return false;
    if (!categoriesLoaded) return true;
    return topLevelCategoryIds.includes(categoryIdFromSlug);
  }, [categoryIdFromSlug, topLevelCategoryIds, categoriesLoaded]);

  useEffect(() => {
    if (categoryIdFromSlug && categoryIdFromSlug !== cat_id) {
      setCat_id(categoryIdFromSlug);
      setcurrentSelectedProduct(null);
    }
  }, [categoryIdFromSlug, cat_id]);

  useEffect(() => {
    if (!isCategorySlug) return;
    const label = removeCategorySuffix(slugStr || "").replace(/-/g, " ").trim();
    if (label && label !== search_key) {
      setSearch_key(label);
      setInputValue(label);
    }
  }, [isCategorySlug, slugStr, search_key]);

  const handleRedirect = (e) => {
    if (!isLoggedIn)
      setOpenAuthModal(true);
    else if (!vendorMetaData?.subscription)
      router.push('/dashboard/buyer/subscription');
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedVendorName(vendorName);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [vendorName]);

  useEffect(() => {
    const { rfq_id, sheet_id } = router.query;
    setQueryMeta({
      rfq_id,
      sheet_id,
    })
  }, [router.query])

  useEffect(() => {
    if (s && s != "") {
      setSearch_key(s.split("+").join(" "));
      setTimeout(() => {
        searchRef.current.focus();
        searchLabelRef.current.click();
      }, 1000);

      getProducts();
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
      if(vendorTypeRef.current && !vendorTypeRef.current.contains(event.target)) {
        setVendorTypeOpen(false);
      }
      if(vendorApprovedByRef.current && !vendorApprovedByRef.current.contains(event.target)) {
        setApprovedByOpen(false);
      }
    };

    // axiosInstance.get('/rfq/vendor-types/').then(res => {
    //   const {data} = res;
    //   setVendorTypes(data)
    //   setInternalVendorTypes(data)
    // }).catch((e) => {
    //   console.error(e)
    // })

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

 useEffect(() => {
  setInternalVendorTypes(
    vendorTypes.filter(type => !selectedVendorTypes.some(t => t.value === type.value))
  );
}, [selectedVendorTypes, vendorTypes]);


  useEffect(() => {
    setInternalApprovedBy(approved_by)
  }, [approved_by])

  useEffect(() => {
    setInternalApprovedBy(approved_by?.filter(approveBy => !selectedApprovedBy.some(_approvedBy => approveBy.vendor_approve == _approvedBy.vendor_approve)))
  }, [selectedApprovedBy])

useEffect(() => {
  if (categoryIdFromSlug && categoryIdFromSlug !== cat_id) {
    setCat_id(categoryIdFromSlug);
    setcurrentSelectedProduct(null);
  }
}, [categoryIdFromSlug]);

useEffect(() => {
 if (!slugStr || slugStr === 'all') {
   setcurrentSelectedProduct(null);
   setVendors([]);
   setApproved_by([]);
   setAllAvailableCities([]);
   setShowBrowser(true);
   return;
 }

 if (!isCategorySlug) {
   getVendorApprovedby();
   getVendors();
   setShowBrowser(false);
   return;
 }

 if (!categoriesLoaded) {
   return;
 }

 setcurrentSelectedProduct(null);
 setApproved_by([]);
 setAllAvailableCities([]);
 if (!isTopLevelCategory && categoryIdFromSlug) {
   const label = removeCategorySuffix(slugStr || '').replace(/-/g, ' ').trim();
   if (label && label !== search_key) {
     setSearch_key(label);
     setInputValue(label);
   }
   getVendors('', categoryIdFromSlug);
 }
 setShowBrowser(true);
}, [
  slugStr,
  isCategorySlug,
  isTopLevelCategory,
  categoryIdFromSlug,
  categoriesLoaded,
  search_key
]);


  // When a new product is selected, update the search bar value
  useEffect(() => {
    if (currentSelectedProduct) {
      const productName = currentSelectedProduct.variant_name || currentSelectedProduct.product_name || '';
      if (search_key !== productName) {
        setSearch_key(productName);
      }
    }
  }, [currentSelectedProduct]);

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

  const normalizeLocationValue = (input = "") =>
    input.toLowerCase().replace(/[\s\-\/()]+/g, "");

  const createLocationSlug = (input = "") => normalizeLocationValue(input);

  const removeCategorySuffix = (str) => {
    if (!str) return str;
    return str.replace(/-category\d+/gi, '');
  }

 

  const canAddItem = () => {
    if (!isLoggedIn) {
      setOpenAuthModal(true);
      return false;
    } else if (!vendorMetaData.subscription) {
      router.push('/dashboard/buyer/subscription');
      return false;
    }
    return true;
  }


  const addToRFQ = async (selected, item) => {
    if (!canAddItem()) return;

        vendors.map((venItem) => {
      if (venItem.id == item.id)
        venItem.selected = selected
      return venItem;
    })

    setbulkRFQVendors((prevBulk) => 
        selected 
            ? [...prevBulk.filter(v => v.id !== item.id), item] // Add or update
            : prevBulk.filter(v => v.id !== item.id) // Remove if deselected
    );
};

const addRfqIdParam = (rfq_id) => {
    const currentPath = router.pathname;
    const currentQuery = { ...router.query, rfq_id };

    router.push({
      pathname: currentPath,
      query: currentQuery,
    }, undefined, { shallow: true }); // shallow avoids getServerSideProps/data reloading
  };


  const handleBulkAddToRFQ = async (e) => {
    e.preventDefault();
    if (bulkRFQVendors.length === 0) {
      toast.error(
        <h6>Please select at least one vendor to add to RFQ.</h6>,
        { position: "top-right" }
      );
      return;
    }

    if (!vendorMetaData.logged_In || !vendorMetaData.subscription) {
      toast.error("You need to purchase subscription to perform this action.",
        { position: "top-right" }
      );
      return;
    }

    try {
      setIsLoading(true);

      // Get the rfq_id from the URL if it exists
      const { rfq_id, sheet_id } = queryMeta;
      
      const payload = {
        variant_id: currentSelectedProduct.variant_id,
        vendors: bulkRFQVendors.map(vendor => ({
          vendor_id: vendor.id
        })),
        filters: { ...filterSnapshot } // Include current filter snapshot
      };
      
      // Only include rfq_id in payload if it exists and is valid
      // This ensures a new RFQ is created when no rfq_id is provided
      if (rfq_id && !isNaN(parseInt(rfq_id))) {
        payload.rfq_id = parseInt(rfq_id);
      }

      if (sheet_id && !isNaN(parseInt(sheet_id))) {
        payload.sheet_id = parseInt(sheet_id);
      }

      const response = await addProductToDraft(payload);
      const rfqResponse = response.data;
      if(rfqResponse && rfqResponse.isNew) {
        addRfqIdParam(rfqResponse.rfq_id)
      }
      
      toast.success(
        <h6>
          <b>{bulkRFQVendors.length} vendors</b> Successfully added to RFQ list!
        </h6>,
        { position: "top-right" }
      );

      setbulkRFQVendors([]);
      setVendors(prev => prev.map(vendor => ({
        ...vendor,
        selected: false,
      })));
      
    } catch (error) {
      toast.error(
        <h6>Failed to add vendors to RFQ. Please try again.</h6>,
        { position: "top-right" }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getVendors = async (overrideSearchKey = null, overrideCatId = null) => {
    const effectiveCatId =
      currentSelectedProduct?.category_id ??
      overrideCatId ??
      cat_id ??
      categoryIdFromSlug ??
      null;

    if (isCategorySlug && (isTopLevelCategory || !effectiveCatId)) {
      setloading(false);
      setVendors([]);
      return;
    }

    if (!currentSelectedProduct && effectiveCatId) {
      ensureCategoryCityList(effectiveCatId);
    }

    const hasCategoryIdOverride = overrideCatId !== null;
    const shouldUseCategoryVendors =
      !currentSelectedProduct &&
      effectiveCatId &&
      (isCategorySlug || hasCategoryIdOverride);

    if (shouldUseCategoryVendors) {
      setloading(true);
      const requestId = ++vendorRequestIdRef.current;

      if(!vendorFirstSearch){
        setVendorFirstSearch(true)
      }


      try {
        const response = await bulkSearchVendorsByCategory({
          category_id: effectiveCatId,
          approved_by_id: selectedApprovedBy,
          state: selectedState?.length > 0 ? selectedState : [],
          city: selectedCity?.length > 0 ? selectedCity : [],
          country: selectedCountry?.length > 0 ? selectedCountry : [],
          turnOver,
          vendorType: selectedVendorTypes,
          prevWorkedWith,
          vendor_name: vendorName,
          myVendorType,
          productMakes: selectedMakes,
          subscriptionType: selectedSubscription?.value,
          page: 1,
          limit: 20
        });

        if (requestId !== vendorRequestIdRef.current) return;

        const bulkRFQVendorIds = new Set(bulkRFQVendors.map(item => item.id));
        const vendors = (response?.data || []).map(vendor => ({
          ...vendor,
          selected: bulkRFQVendorIds.has(vendor.id)
        }));

        const cityMap = new Map();
        vendors.forEach(vendor => {
          if (vendor.city_name && vendor.state_name) {
            const cityKey = `${vendor.city_name.toLowerCase()}-${vendor.state_name.toLowerCase()}`;
            if (!cityMap.has(cityKey)) {
              cityMap.set(cityKey, {
                city_name: vendor.city_name,
                state_name: vendor.state_name,
                city_id: vendor.city_id,
                state_id: vendor.state_id
              });
            }
          }
        });

        const cachedCities = categoryCityCacheRef.current.get(effectiveCatId);
        if (cachedCities) {
          setAllAvailableCities(cachedCities);
        } else {
          const cities = buildCityListFromVendors(vendors);
          categoryCityCacheRef.current.set(effectiveCatId, cities);
          setAllAvailableCities(cities);
        }

        setloading(false);
        setVendors(vendors);
        setVendorMetaData({
          data: vendors,
          total: response?.total || 0,
          logged_In: isLoggedIn,
          subscription: response?.subscription ?? vendorMetaData.subscription ?? false
        });
        if(vendors.length > 0) {
          return;
        }
      } catch (error) {
        if (requestId !== vendorRequestIdRef.current) return;
        console.error("Error fetching category vendors:", error);
        setloading(false);
        setVendors([]);
        setAllAvailableCities([]);
      }
    }

    let canonicalSearchKey = overrideSearchKey !== null ? overrideSearchKey : search_key;
    
    if (currentSelectedProduct && !hasCategoryIdOverride) {
      canonicalSearchKey = currentSelectedProduct.variant_name || currentSelectedProduct.product_name || search_key;
    } else if (!canonicalSearchKey && !hasCategoryIdOverride && products && products.length > 0) {
      canonicalSearchKey = products[0].variant_name || products[0].product_name || search_key;
    }

    if (!canonicalSearchKey && isCategorySlug && effectiveCatId) {
      try {
        const fallbackRes = await categoryListById({ category_id: effectiveCatId });
        const fallbackProduct = fallbackRes?.productList?.[0];
        if (fallbackProduct) {
          canonicalSearchKey =
            fallbackProduct.variant_name ||
            fallbackProduct.product_name ||
            removeCategorySuffix(slugStr || '').replace(/-/g, ' ');
        }
      } catch (err) {
        console.error("Error fetching fallback product for category:", err);
      }
    }

    if (!canonicalSearchKey && isCategorySlug) {
      canonicalSearchKey = removeCategorySuffix(slugStr || '').replace(/-/g, ' ');
    }

    if (canonicalSearchKey !== "" || effectiveCatId) {
      setloading(true);

      if(!vendorFirstSearch){
        setVendorFirstSearch(true)
      }

      const stateFilter = selectedState?.length > 0 ? selectedState : [];
      const cityFilter = selectedCity?.length > 0 ? selectedCity : [];
      const countryFilter = selectedCountry?.length > 0 ? selectedCountry : [];
      const requestId = ++vendorRequestIdRef.current;

      // searchProductsV2(
      //   {
      //     cat_id: effectiveCatId,
      //     search_key: canonicalSearchKey,
      //     approved_by: [],
      //     state: [],
      //     city: [],
      //     country: [],
      //     turnOver: { from: -1, to: -1 },
      //     vendorType: [],
      //     prevWorkedWith: null,
      //     vendor_name: "",
      //     myVendorType: null,
      //     selectedMakes: []
      //   },
      //   "vendors"
      // )
      //   .then((allRsp) => {
      //     const cityMap = new Map();
      //     allRsp.data.forEach(vendor => {
      //       if (vendor.city_name && vendor.state_name) {
      //         const key = `${vendor.city_name.toLowerCase()}-${vendor.state_name.toLowerCase()}`;
      //         if (!cityMap.has(key)) {
      //           cityMap.set(key, {
      //             city_name: vendor.city_name,
      //             state_name: vendor.state_name,
      //             city_id: vendor.city_id,
      //             state_id: vendor.state_id
      //           });
      //         }
      //       }
      //     });
      //     setAllAvailableCities(Array.from(cityMap.values()).sort((a, b) => a.city_name.localeCompare(b.city_name)));
      //   })
      //   .catch((error) => console.error("Error fetching cities:", error));
      
      searchProductsV2(
        {
          cat_id: effectiveCatId,
          search_key: canonicalSearchKey,
          approved_by: selectedApprovedBy,
          state: stateFilter,
          city: cityFilter,
          country: countryFilter,
          turnOver,
          vendorType: selectedVendorTypes,
          prevWorkedWith,
          vendor_name: vendorName,
          myVendorType,
          selectedMakes,
          subscriptionType: selectedSubscription,
        },
        "vendors"
      )
        .then((rsp) => {
          if (requestId !== vendorRequestIdRef.current) return;
          setloading(false);
          const vendors = rsp.data.map((item) => ({
            ...item,
            selected: bulkRFQVendors.some(vendor => vendor.id === item.id)
          }));
          setVendors(vendors);
          setVendorMetaData(rsp);
          currentSelectedProduct ? vendor_area_ref.current.scrollIntoView({ behavior: "smooth" }) : null;
        })
        .catch((error) => {
          if (requestId !== vendorRequestIdRef.current) return;
          setVendors([]);
          setloading(false);
          setVendorMetaData(error?.response?.data);
        });
    }
  };
  const getProducts = (s_key = search_key) => {
    setloading(true);
    categoryLvlRef.current = new Map();
    return searchProductsV2(
      {
        cat_id,
        search_key: s_key,
        vendor_name: vendorName,
        is_private: is_private,
        preferred_vendor: preferred_vendor,
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
        setProducts(d);
        setSearchCategories(rsp.categoryData);
        // Only set currentSelectedProduct if this is not a "category result"
        // If rsp.isCategoryResult is true, do NOT set currentSelectedProduct
        if (d.length > 0 && !rsp.isCategoryResult) {
          setcurrentSelectedProduct(d[0]);
        } else {
          setcurrentSelectedProduct(null);
        }
        return rsp;
      })
      .catch((error) => {
        setloading(false);
        throw error;
      });
  };

  const getCategoriesById = (category_id, category_name) => {
    setloading(true);
    categoryLvlRef.current.set(category_id, category_name);

    categoryListById({ category_id })
      .then((res) => {
        setProductsList(res.productList);
        setcurrentSelectedProduct(null);
        setSearchSubCategories(res.subCategoryList);
        
        // Fetch vendors for this category
        if (res.productList && res.productList.length > 0) {
          getVendors('', category_id);
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setloading(false);
        setIsOpen(false);

        // Get the rfq_id from the URL if it exists
        const { rfq_id, sheet_id } = router.query;

        // Update the URL to include the selected category
        const categorySlug = cleanAndAddHyphen(category_name);
        const newUrl = rfq_id && sheet_id
          ? `/vendor/${categorySlug}?rfq_id=${rfq_id}&sheet_id=${sheet_id}` 
          : rfq_id && !sheet_id 
          ? `/vendor/${categorySlug}?rfq_id=${rfq_id}`
          : `/vendor/${categorySlug}`;

        router.push(newUrl, undefined, { shallow: true });
      });
  };
  

 const getParentCategories = () => {
  setloading(true)
  parentCategoryList()
    .then((res) => {
      setCategories(res.data.parentCategories);
      setProductsList([]);
      setloading(false)
      
      // ONLY redirect to /vendor/all if current path is exactly /vendor
      // and we don't have a specific product slug
      const currentPath = router?.asPath || "";
      const isRootVendorPath = currentPath === '/vendor' || currentPath === '/vendor/';
      const hasSpecificSlug = slug && slug !== 'all';
      
      if (isRootVendorPath && !hasSpecificSlug) {
        router.push("/vendor/all");
      }
      
      setIsOpen(false);
    })
    .catch((error) => {
      setloading(false)
      console.error("Error fetching categories:", error);
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
        // setParentCategories(parentOptions);
      })
      .catch((error) => {
        setcatloading(false);
      });
  };
  useEffect(()=>{
    getParentCategories();
  },[])

  // Random products carousel logic extracted to RandomProductsCarousel component
  const getVendorApprovedby = () => {
    // For product-level categories, we might not have a variant_id
    // Only fetch if we have a variant_id
    if (!currentSelectedProduct?.variant_id) {
      setApproved_by([]);
      return;
    }
    
    setvabloading(true);
  
    vendorApproveList(currentSelectedProduct.variant_id)
      .then((rsp) => {
        setvabloading(false);
        setApproved_by(rsp.data);
      })
      .catch((error) => {
        setvabloading(false);
        // Optionally handle the error here (e.g., show a toast)
      });
  };

const clearVendorFilters = () => {
  setMyVendorType(null);
};



  // get product make list for filters
  const getMakeList = (variant_id) => {
  getProductMakeList(variant_id)
    .then((rsp) => {
      setMakeList(rsp); // Set the list of makes
      setSelectedMakes([]); // Clear any previously selected makes (optional)
    })
    .catch((error) => {
      console.error("Error fetching make list:", error);
    });
};

  // Debounced suggestion fetcher
  const debouncedFetchSuggestions = useRef(
    debounce(async (val) => {
      setSuggestionLoading(true);
      // Lightweight API call for product name suggestions (not full search)
      // You may want to replace this with a dedicated endpoint if available
      try {
        const rsp = await searchProductsV2({ search_key: val }, type);
        setSuggestions(rsp.data || []);
        setSearchCategories(rsp.categoryData || []); // Also set category data
      } catch (e) {
        setSuggestions([]);
        setSearchCategories([]); // Clear categories on error
      } finally {
        setSuggestionLoading(false);
      }
    }, 300)
  ).current;

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(!!val);
    setSuggestions([]);
    setSearchCategories([]); // Also clear category data
    if (val.length > 2) {
      debouncedFetchSuggestions(val);
    } else {
      debouncedFetchSuggestions.cancel();
    }
  };
  const handleSearch = (e) => {
    e.preventDefault();
    getProducts();
  };
  const handleBulkAllSelect = (e, items) => {
    if (!isLoggedIn) return setOpenAuthModal(true);

    if (e.target.checked) {
      let d = items.map((item) => {
        item.selected = true;
        return item;
      });

      setbulkRFQVendors(prevBulk => [
          ...prevBulk.filter(v => !d.some(item => item.id === v.id)), // Keep existing vendors not in items
          ...d // Add new items without duplicates
      ]);
    } else {
      items.map((item) => {
        item.selected = false;
        return item;
      });
      setbulkRFQVendors([]);
    }
  };

  const handleAutocompleteClick = (item) => {
    setIsOpen(false);
    // Check if the clicked product is already selected
    if (item.variant_name === currentSelectedProduct?.variant_name) return;

    // Set the search key and update the selected product
    getMakeList(item?.variant_id)
    const productName = item.variant_name || item.product_name || '';
    setSearch_key(productName);
    setCat_id(item.category_id);
    setcurrentSelectedProduct(item);
    setbulkRFQVendors([]);
    getVendorApprovedby();

    tempProdRef.current = null;

    // Get the rfq_id from the URL if it exists
    const { rfq_id, sheet_id } = router.query;

    // Update the URL to include the selected product's slug and preserve rfq_id if it exists
    const productSlug = item.slug || cleanAndAddHyphen(productName);
    const newUrl = rfq_id && sheet_id
      ? `/vendor/${productSlug}?rfq_id=${rfq_id}&sheet_id=${sheet_id}`
      : rfq_id && !sheet_id ? `/vendor/${productSlug}?rfq_id=${rfq_id}` 
      : `/vendor/${productSlug}`;

    router.push(newUrl);
    storageInstance.setStorage("product_name", productSlug);
  };


  // --- Location lists for dropdowns ---
  const [countryList, setCountryList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [cityList, setCityList] = useState([]);

  // Fetch country/state/city lists for dropdowns (unchanged)
  useEffect(() => { getCountries().then(res => setCountryList(res.data || [])); }, []);
  useEffect(() => { getStates().then(res => setStateList(res.data || [])); }, []);
  useEffect(() => { getCities().then(res => setCityList(res.data || [])); }, []);

  useEffect(() => {
    let slugValue = Array.isArray(slug) ? slug.join('/') : typeof slug === 'string' ? slug : '';
    if (!slugValue || slugValue === 'all') {
      setselectedState([]);
      setselectedCity([]);
      setselectedCountry([]);
      return;
    }

    const slugForParsing = removeCategorySuffix(slugValue);

    if (!stateList.length || !cityList.length) {
      setSearch_key(slugForParsing);
      return;
    }

    const normalize = (s) => (s || '').toLowerCase().replace(/[\s-]+/g, '');
    const segments = slugForParsing.split('-');
    let foundState = null, foundCity = null, productSegments = [];

    // Parse from right to left to find state and city
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = normalize(segments[i]);
      
      if (!foundState) {
        const stateMatch = stateList.find(state => normalize(state.state_name) === segment);
        if (stateMatch) { 
          foundState = stateMatch;
          continue; 
        }
      }
      
      if (!foundCity && foundState) {
        const cityMatch = cityList.find(city => 
          normalize(city.city_name) === segment && city.state_id === foundState.id
        );
        if (cityMatch) { 
          foundCity = cityMatch;
          continue; 
        }
      }
      
      productSegments.unshift(segments[i]);
    }
    
    // Set state after parsing to avoid flickering
    if (foundState) {
      setselectedState([{ id: foundState.id, name: foundState.state_name }]);
      const country = countryList.find(c => c.id === foundState.country_id);
      if (country) setselectedCountry([{ id: country.id, name: country.country_name }]);
    } else {
      setselectedState([]);
      setselectedCountry([]);
    }
    
    if (foundCity) {
      setselectedCity([{ id: foundCity.id, name: foundCity.city_name }]);
    } else {
      setselectedCity([]);
    }
    
    const finalSearchKey = productSegments.join('-').replace(/-/g, ' ');
    if (finalSearchKey) {
      setSearch_key(finalSearchKey);
    }
  }, [slug, stateList, cityList, countryList]);

  // When slug changes (including 'all'), fetch nested categories.
  // Nested category handling delegated to NestedCategoryBrowser

  // --- Trigger product search automatically ---
// ✅ Add a ref to track if products were already loaded
const productsLoadedRef = useRef(false);

useEffect(() => {
  if (
    search_key &&
    // slugStr &&
    // slugStr !== 'all' &&
    // !slugStr.includes('-category') &&
    !currentSelectedProduct &&
    !productsLoadedRef.current
  ) {
    productsLoadedRef.current = true;
    getProducts(search_key).finally(() => {
      setTimeout(() => {
        productsLoadedRef.current = false;
      }, 1000);
    });
  }
}, [search_key, slugStr, currentSelectedProduct]);


useEffect(() => {
  if (slugStr === 'all') {
    productsLoadedRef.current = false;
  }
}, [slugStr]);


 useEffect(() => {
  if (!currentSelectedProduct) return;
  if (!selectedCity.length || !selectedState.length) return;

  // Build new slug
  const baseSlug = stripLocationSuffix(
    currentSelectedProduct.slug ||
    cleanAndAddHyphen(currentSelectedProduct.variant_name || currentSelectedProduct.product_name || "")
  );

  const newSlug = `${baseSlug}-${createLocationSlug(selectedCity[0].name)}-${createLocationSlug(selectedState[0].name)}`;

  // If slug already matches, do nothing
  if (slugStr === newSlug) return;

  // Prevent loops
  if (router.asPath.includes(newSlug)) return;

if (slugStr !== newSlug) {
  router.replace(`/vendor/${newSlug}`, undefined, { shallow: true });
}

}, [selectedCity, selectedState]);


  const clearLocationFilter = () => {
    setselectedState([]);
    setselectedCity([]);
    setselectedCountry([]);
    if (currentSelectedProduct) {
      const baseSlug = stripLocationSuffix(
        currentSelectedProduct.slug ||
          cleanAndAddHyphen(
            currentSelectedProduct.variant_name || currentSelectedProduct.product_name || ""
          )
      );
      const { rfq_id, sheet_id } = router.query;
      const queryStr = rfq_id && sheet_id ? `?rfq_id=${rfq_id}&sheet_id=${sheet_id}` : rfq_id ? `?rfq_id=${rfq_id}` : '';
      router.replace(`/vendor/${baseSlug}${queryStr}`, undefined, { shallow: true });
    }
  };

  // --- Search bar: always editable ---
  const getProductTitle = () => {
    if (currentSelectedProduct) {
      const title = currentSelectedProduct.variant_name || currentSelectedProduct.product_name || '';
      return title;
    }
    return '';
  };

  const buildCityListFromVendors = (vendorsList = []) => {
    const cityMap = new Map();
    vendorsList.forEach(vendor => {
      if (vendor.city_name && vendor.state_name) {
        const cityKey = `${vendor.city_name.toLowerCase()}-${vendor.state_name.toLowerCase()}`;
        if (!cityMap.has(cityKey)) {
          cityMap.set(cityKey, {
            city_name: vendor.city_name,
            state_name: vendor.state_name,
            city_id: vendor.city_id,
            state_id: vendor.state_id
          });
        }
      }
    });
    return Array.from(cityMap.values()).sort((a, b) => a.city_name.localeCompare(b.city_name));
  };

  const ensureCategoryCityList = async (categoryId) => {
    if (!categoryId) return;
    if (categoryCityCacheRef.current.has(categoryId)) {
      setAllAvailableCities(categoryCityCacheRef.current.get(categoryId));
      return;
    }
    if (categoryCityFetchRef.current.has(categoryId)) return;

    categoryCityFetchRef.current.add(categoryId);
    try {
      const response = await bulkSearchVendorsByCategory({
        category_id: categoryId,
        approved_by_id: [],
        state: [],
        city: [],
        country: [],
        turnOver: { from: -1, to: -1 },
        vendorType: [],
        prevWorkedWith: null,
        vendor_name: "",
        myVendorType: null,
        productMakes: [],
        page: 1,
        limit: 20
      });
      const cities = buildCityListFromVendors(response?.data || []);
      categoryCityCacheRef.current.set(categoryId, cities);
      setAllAvailableCities(cities);
    } catch (error) {
      console.error("Error preloading category cities:", error);
    } finally {
      categoryCityFetchRef.current.delete(categoryId);
    }
  };

  const stripLocationSuffix = (slugValue) => {
    if (!slugValue) return slugValue;
    const parts = slugValue.split('-');
    if (parts.length < 3) return slugValue;

    const statePart = normalizeLocationValue(parts[parts.length - 1]);
    const cityPart = normalizeLocationValue(parts[parts.length - 2]);

    const matchedState = stateList.find(
      (state) => normalizeLocationValue(state.state_name) === statePart
    );
    if (!matchedState) return slugValue;

    const matchedCity = cityList.find(
      (city) =>
        city.state_id === matchedState.id &&
        normalizeLocationValue(city.city_name) === cityPart
    );

    if (!matchedCity) return slugValue;

    return parts.slice(0, -2).join('-');
  };

  const getCategoryTitle = () => {
    if (!slugStr) return '';
    const baseSlug = stripLocationSuffix(removeCategorySuffix(slugStr));
    return baseSlug.replace(/-/g, ' ');
  };

  useEffect(() => {
    if (!isCategorySlug || currentSelectedProduct) return;
    const rawSlug = removeCategorySuffix(slugStr || '').replace(/-/g, ' ').trim();
    const baseSlug = stripLocationSuffix(removeCategorySuffix(slugStr || '')).replace(/-/g, ' ').trim();
    if (!baseSlug) return;

    const shouldUpdateSearch =
      !search_key ||
      search_key.toLowerCase() === rawSlug.toLowerCase();

    if (shouldUpdateSearch && search_key !== baseSlug) {
      setSearch_key(baseSlug);
    }

    const shouldUpdateInput =
      !inputValue ||
      inputValue.toLowerCase() === rawSlug.toLowerCase();

    if (shouldUpdateInput && inputValue !== baseSlug) {
      setInputValue(baseSlug);
    }
  }, [
    isCategorySlug,
    slugStr,
    currentSelectedProduct,
    search_key,
    inputValue,
    stateList,
    cityList,
  ]);

  useEffect(() => {
    if (!isCategorySlug || currentSelectedProduct) return;
    const targetCategoryId =
      currentSelectedProduct?.category_id ??
      cat_id ??
      categoryIdFromSlug ??
      null;
    if (!targetCategoryId) return;
    ensureCategoryCityList(targetCategoryId);
  }, [
    isCategorySlug,
    currentSelectedProduct,
    cat_id,
    categoryIdFromSlug
  ]);


  const getLocationBaseSlug = () => {
    let baseSlug = "";
    if (currentSelectedProduct?.slug) baseSlug = currentSelectedProduct.slug;
    else if (isCategorySlug) baseSlug = slugStr || "";
    else baseSlug = cleanAndAddHyphen(removeCategorySuffix(search_key || ""));
    return stripLocationSuffix(baseSlug);
  };

useEffect(() => {

  const prev = prevFiltersRef.current;

  // 🔥 Skip if filters did not change deeply
  if (prev && JSON.stringify(prev) === JSON.stringify(filterSnapshot)) {
    return;
  }

  // Save new snapshot
  prevFiltersRef.current = filterSnapshot;

  // Finally call API
  getVendors();

}, [filterSnapshot]);



  useEffect(() => {
    // Update inputValue when a product is selected (after fetch or navigation)
    if (currentSelectedProduct) {
      setInputValue(currentSelectedProduct.variant_name || currentSelectedProduct.product_name || "");
    }
  }, [currentSelectedProduct]);

  useEffect(() => {
    if ( search_key) {
      setInputValue(search_key);
    }
  }, [search_key]);

  return (
    <>
      <section className="vendor-common-header sc-pt-80" aria-label="header">
        <div className="container-fluid  text-center">
          <SeoTitle
            slug={slug}
            search_key={search_key}
            currentSelectedProduct={currentSelectedProduct}
            selectedState={selectedState}
            selectedCity={selectedCity}
          />
          <div className="d-flex justify-content-end">
            <Link
              href="/dashboard/buyer/boq-automation"
              id="generate_rfq_from_boq-vendor_header-vendor_search_page"
              className="page-link backBtn btn btn-secondary text-white px-2 "
              style={{ minWidth: "280px" }}
              onClick={(e) => {
                e.preventDefault();
                if (!isLoggedIn) {
                  setOpenAuthModal(true);
                  setRedirectAfterLogin("/dashboard/buyer/boq-automation");
                } else router.push("/dashboard/buyer/boq-automation");
              }}
            >
              {" "}
              <FontAwesomeIcon
                icon={faWandMagicSparkles}
                className="me-2"
              />{" "}
              Generate RFQ from BOQ
            </Link>
          </div>
        </div>
      </section>

      <section className="search-sec-1" aria-label="search-box">
        <div className="container-fluid product-search">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
                <form onSubmit={handleSearch}>
                  <div className="row filter">
                    <div className="col-md-1"></div>
                    <div className="col-md-10 searchbox " ref={searchRef}>
                      <i>
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                      </i>

                      <label ref={searchLabelRef} htmlFor="search"></label>
                      {/* <div className="d-flex justify-content-between align-items-center"> */}
                      <input
                        className="no-clear"
                        type="text"
                        name="search"
                        id="search_vendors-search_bar-vendor_search_page"
                        placeholder="Ex. Flanges"
                        onChange={handleSearchChange}
                        onFocus={handleSearchChange}
                        autoComplete="off"
                        value={inputValue}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (suggestions.length > 0) {
                              handleAutocompleteClick(suggestions[0]);
                            } else {
                              getProducts(inputValue);
                            }
                          }
                        }}
                      />

                      {isOpen && (
                        <div className="search_results_autocomplete">
                          {suggestionLoading && (
                            <p>
                              {" "}
                              <div
                                className="spinner-border text-primary spinner-border-sm mr-4"
                                role="status"
                              ></div>{" "}
                              Fetching..
                            </p>
                          )}
                          {!suggestionLoading && inputValue === "" && (
                            <p className="mb-0">Start Typing Product Name...</p>
                          )}
                          {!suggestionLoading &&
                            inputValue.length < 3 &&
                            inputValue.length > 0 && (
                              <p className="mb-0">
                                Please enter at least 3 characters...
                              </p>
                            )}
                          {!suggestionLoading &&
                            inputValue !== "" &&
                            (suggestions.length > 0 || searchCategories.length > 0) && (
                              <>
                                <p
                                  className="text-center fw-bold "
                                  style={{ color: "var(--secondary-color)" }}
                                >
                                  Select an option from dropdown
                                </p>
                                <div className="row">
                                  <div className="col-7">
                                    <div className="container">
                                      <h2 className="sticky-top fw-semibold text-center text-white py-1 rounded-2">
                                        Product List
                                      </h2>
                                      <ul>
                                        {suggestions.map((item, index) => {
                                          return (
                                                                                    <li
                                          key={`mp_${index}`}
                                          className="ps-2"
                                          onClick={() =>
                                            handleAutocompleteClick(item)
                                          }
                                          title={
                                            item?.unified_name
                                              ? `${item.unified_name}`
                                              : `${item.variant_name}`
                                          }
                                          id={`product_list_item_${item.product_id || index}-product_list-vendor_search_page`}
                                        >
                                              <div>
                                                <h3>
                                                  {item.variant_name ??
                                                    item.product_name}
                                                </h3>
                                                <p>
                                                  <small>
                                                    <b>
                                                      {item.category_name} |{" "}
                                                      {item.product_name}
                                                    </b>
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
                                      <h2 className="sticky-top fw-semibold text-center text-white py-1 rounded-2">
                                        Category List
                                      </h2>
                                      <ul>
                                        {searchCategories.map((item, index) => {
                                          return (
                                            <li
                                              key={`search_cat_${index}`}
                                              onClick={() =>
                                                getCategoriesById(
                                                  item.category_id,
                                                  item.category_name
                                                )
                                              }
                                              title={`${item.category_name}`}
                                              id={`category_list_item_${item.category_id}-category_list-vendor_search_page`}
                                            >
                                              <i>
                                                <FontAwesomeIcon
                                                  icon={faPlus}
                                                />
                                              </i>
                                              <div>
                                                <h3>{item.category_name}</h3>
                                                <p>
                                                  <small>
                                                    <b>
                                                      {
                                                        item.parent_category_name
                                                      }{" "}
                                                    </b>
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
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="search-sec-2" aria-label="product-categories-section">
        <div className="container-fluid">
          {/* Nested categories fetched dynamically from backend (now in NestedCategoryBrowser) */}
          {showBrowser && (
        <NestedCategoryBrowser
          onGetProducts={getProducts}
          onGetVendors={getVendors}
          setSearchKey={setSearch_key}
          onHide={() => setShowBrowser(false)} // ✅ Pass a callback to hide
        />
      )}
          {/* Search Categories Section */}
          {searchSubCategories.length > 0 && (
            <div className=" col-md-12 bg-white rounded-5 p-4">
              <div className="search-sec-3-mdl my-3">
                <div className="search-sec-3-mdl-con ">
                  <div className="container">
                    <h2 className="fs-3">Sub Categories List</h2>
                    <div className="parent-categories">
                      {Array.from(categoryLvlRef.current.entries()).map(
                        ([category_id, category_name], index) => {
                          const isLastItem = index === categoryLvlRef.current.size - 1;
                          return (
                            <p
                              role="button"
                              key={category_id}
                              className="fs-6 badge text-bg-warning mx-1 px-3 py-2"
                              onClick={() => {
                                const entries = Array.from(categoryLvlRef.current.entries());
                                categoryLvlRef.current = new Map(
                                  entries.slice(0, index + 1)
                                );
                                setVendors([]);
                                setAllAvailableCities([]);
                                getCategoriesById(category_id, category_name);
                              }}
                            >
                              {category_name}
                              <span className="ms-1">
                                {!isLastItem ? " > " : ""}
                              </span>
                            </p>
                          );
                        }
                      )}
                    </div>
                    {loading && !currentSelectedProduct && <FullLoader />}
                    {!loading &&
                    searchSubCategories.length <= 1 &&
                    productsList.length == 0 ? (
                      <p className="text-center my-4">
                        No Products Found.....! Please search for different
                        product/category.
                      </p>
                    ) : (
                      searchSubCategories.map((item) => {
                        if (!categoryLvlRef.current.has(item.id)) {
                          return (
                            <p
                              role="button"
                              key={item.id}
                              className="badge text-bg-primary mx-1 px-3 py-2 "
                              onClick={() =>
                                getCategoriesById(item.id, item.title)
                              }
                            >
                              {item.title}
                            </p>
                          );
                        }
                      })
                    )}

                    {productsList.length > 0 && (
                      <>
                        <h2 className="fs-3 mt-4">Product List</h2>
                        <div className="row">
                          {productsList.map((item, index) => {
                            return (
                              <div className="col-md-6 col-lg-4">
                                <p
                                  role="button"
                                  key={`srch_prod_${index}`}
                                  className={`border border-2 rounded-3 px-3 py-2 ${
                                    item.product_name ==
                                    (tempProdRef.current?.product_name ||
                                      currentSelectedProduct?.product_name)
                                      ? "bg-success border-success text-white"
                                      : ""
                                  }`}
                                  onClick={() => handleAutocompleteClick(item)}
                                >
                                  {item.variant_name ?? item.product_name}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* vendor List Section */}
         {vendorFirstSearch && (
          <div className="row" id="vendors_area" ref={vendor_area_ref}>
            {/* START : Filter side bar */}

              <div className="col-md-3">
                <aside>
                  <h4 className=" text-center mb-4 fw-semibold border-bottom border-bottom-2px  py-2 ">
                    Filters
                  </h4>

                  {/* START: Vender search by name */}
                  <div className="search-con-right-1">
                    <input
                      type="text"
                      name="vendorName"
                      value={vendorName}
                      className="form-control"
                      placeholder="Search vendors"
                      onChange={(e) => setVendorName(e.target.value)}
                      id="search_vendor_name-filters-vendor_search_page"
                    />
                  </div>
                  {/* END: Vender search by name */}

                  {/* START: product make filter */}
                  {currentSelectedProduct && makeList?.length > 0 && (
                    <div className="search-con-right-1">
                      <p className="fw-semibold mb-2 mt-3">Product Make</p>
                      <div>
                        <select
                          name="product_make"
                          id="product_make_filter-filters-vendor_search_page"
                          value={
                            selectedMakes.length > 0 ? selectedMakes[0].id : ""
                          }
                          onChange={(e) => {
                            if (!isLoggedIn) {
                              setOpenAuthModal(true);
                            } else {
                              const selectedId = e.target.value; // Get selected id from option
                              const selected = makeList.find(
                                (option) => option.id == selectedId
                              );
                              if (selected) {
                                // Check if already selected to avoid duplicates
                                if (
                                  !selectedMakes.some(
                                    (item) => item.id === selected.id
                                  )
                                ) {
                                  setSelectedMakes((prev) => [
                                    ...prev,
                                    selected,
                                  ]);
                                }
                              }
                            }
                          }}
                        >
                          <option value="">Select Product Makes</option>
                          {makeList &&
                            makeList.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.make_name}
                              </option>
                            ))}
                        </select>

                        {/* Display clear link if any filter is active */}
                        {selectedMakes.length > 0 && (
                          <Link
                            href="#"
                            className="clearFilter"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedMakes([]);
                            }}
                          >
                            <FontAwesomeIcon icon={faTimesCircle} /> clear
                          </Link>
                        )}
                      </div>

                      <div className="d-flex gap-2 flex-wrap mt-2">
                        {selectedMakes.map((item) => (
                          <div
                            className="selected-country"
                            key={item.make_name}
                          >
                            {item.make_name}
                            <button
                              onClick={() =>
                                setSelectedMakes((prev) =>
                                  prev.filter(
                                    (_item) =>
                                      _item.make_name !== item.make_name
                                  )
                                )
                              }
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* END: product make filter */}

                  {/* START: my vendor filter */}
                  <div className="search-con-right-1">
                    <p className="fw-semibold mb-2 mt-3 ">My Vendors</p>
                    <div>
                      <select
                        name="vendors"
                        id="my_vendors_filter-filters-vendor_search_page"
                        value={myVendorType ? myVendorType.value : ""}
                        onChange={(e) => {
                          if (!isLoggedIn) setOpenAuthModal(true);
                          else {
                            const selected = optionVendors.find(
                              (option) => option.value === e.target.value
                            );
                            setMyVendorType(selected);
                          }
                        }}
                      >
                        <option value="">Select All Vendors</option>
                        {optionVendors &&
                          optionVendors.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </select>

                      {/* Display clear link if any filter is active */}
                      {myVendorType && (
                        <Link
                          href="#"
                          className="clearFilter"
                          onClick={(e) => {
                            e.preventDefault();
                            clearVendorFilters();
                          }}
                        >
                          <FontAwesomeIcon icon={faTimesCircle} /> clear
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* END: my vendor filter */}

                  <div className="search-con-right-1">
                    <p className="fw-semibold mb-2 mt-3">Subscripion Type</p>
                    <div>
                      <select
                        name="product_make"
                        id="product_make_filter-filters-vendor_search_page"
                        value={
                          selectedSubscription?.value ?? ""
                        }
                        onChange={(e) => {
                          if (
                            !vendorMetaData || !vendorMetaData.logged_In
                          ) {
                            setOpenAuthModal(true);
                          } else {
                            const selectedValue = e.target.value; // Get selected id from option
                            const selected = subscriptionTypes.find(
                              (option) => option.value == selectedValue
                            );
                            if (selected) {
                              // Check if already selected to avoid duplicates
                              if (
                                !(selectedSubscription?.value == selected.value)
                              ) {
                                setSelectedSubscription(selected);
                              }
                            }
                          }
                        }}
                      >
                        <option value="">Select Subscription Type</option>
                        {subscriptionTypes.map(t => (
                          <option value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>

                      {/* Display clear link if any filter is active */}
                      {selectedSubscription && (
                        <Link
                          href="#"
                          className="clearFilter"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedSubscription(null);
                          }}
                        >
                          <FontAwesomeIcon icon={faTimesCircle} /> clear
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* START: Location filter */}
                  <div className="search-con-right-1">
                    <p className="fw-semibold  mb-2">Location</p>
                    {selectedCountry != 0 && (
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
                        selectedCountry={selectedCountry}
                        setselectedCountry={setselectedCountry}
                        selectedState={selectedState}
                        setselectedState={setselectedState}
                        selectedCity={selectedCity}
                        setselectedCity={setselectedCity}
                        vendorMetaData={vendorMetaData}
                      />
                    </div>
                  </div>
                  {/* END: Location filter */}

                  {/* START: Vendor Type */}
                  <div className="search-con-right-1">
                    <p className="fw-semibold mb-2">Vendor Type</p>
                    <div ref={vendorTypeRef} className="selection-dropdown">
                      <input
                        type="text"
                        onChange={(e) => {
                          setInternalVendorTypes(
                            vendorTypes.filter((type) => 
                              type.value
                                .toLowerCase()
                                .includes(e.target.value.toLowerCase())
                            )
                          );
                        }}
                        placeholder="Select vendor types"
                        onFocus={() => setVendorTypeOpen(true)}
                      />
                      <div className="d-flex gap-2 flex-wrap mt-2">
                        {selectedVendorTypes.map((type) => (
                          <div className="selected-country">
                            {type.label}
                            <button
                              onClick={() => {
                                if (!isLoggedIn) return setOpenAuthModal(true);

                                setSelectedVendorTypes((prev) =>
                                  prev.filter(
                                    (_type) => !(_type.value == type.value)
                                  )
                                );
                              }}
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>
                      {vendorTypeOpen && (
                        <ul
                          className="dropdown"
                          style={{
                            maxWidth: 315,
                          }}
                        >
                          {internalVendorTypes &&
                          internalVendorTypes.length > 0 ? (
                            internalVendorTypes.map((type) => (
                              <li
                                key={type.value}
                                onClick={() => {
                                  if (!isLoggedIn) return setOpenAuthModal(true);

                                  setSelectedVendorTypes((prev) => [
                                    ...prev,
                                    type,
                                  ]);
                                  setVendorTypeOpen(false);
                                }}
                                className="dropdown-item"
                              >
                                {type.label}
                              </li>
                            ))
                          ) : (
                            <li className="dropdown-item">No results found</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  {/* END: Vendor Type */}

                  {/* START:  Previously Worked With */}
                  <div className="search-con-right-1">
                    <p className="fw-semibold  mb-2">Previously Worked With</p>
                    <div>
                      <select
                        name="prevWorkedWith"
                        id="previously_worked_filter-filters-vendor_search_page"
                        value={prevWorkedWith}
                        onChange={(e) => {
                          if (!isLoggedIn)
                            setOpenAuthModal(true);
                          else {
                            setPrevWorkedWith(e.target.value);
                          }
                        }}
                      >
                        <option value="">Select Vendor Condition</option>
                        {vendorConditions &&
                          vendorConditions.map((item) => (
                            <option value={item.value} key={item.value}>
                              {item.label}
                            </option>
                          ))}
                      </select>
                      {prevWorkedWith && (
                        <Link
                          className="clearFilter"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPrevWorkedWith("");
                          }}
                        >
                          <FontAwesomeIcon icon={faTimesCircle} /> clear
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* END: Previously Worked With */}

                  {/* START: Vendor Approved By */}
                  {currentSelectedProduct && (
                    <div className="search-con-right-1">
                      <p className="fw-semibold mb-2">Vendor Approved By</p>
                      <div
                        ref={vendorApprovedByRef}
                        className="selection-dropdown"
                      >
                        <input
                          // ref={citySelectionRef}
                          type="text"
                          onChange={(e) => {
                            setInternalApprovedBy(
                              approved_by.filter((_) =>
                                _.vendor_approve
                                  .toLowerCase()
                                  .includes(e.target.value)
                              )
                            );
                          }}
                          placeholder="Select vendor types"
                          onFocus={() => setApprovedByOpen(true)}
                        />
                        <div className="d-flex gap-2 flex-wrap mt-2">
                          {selectedApprovedBy.map((approvedBy) => (
                            <div className="selected-country">
                              {approvedBy.vendor_approve}
                              <button
                                onClick={() =>
                                  setSelectedApprovedBy((prev) =>
                                    prev.filter(
                                      (_approvedBy) =>
                                        !(_approvedBy.id == approvedBy.id)
                                    )
                                  )
                                }
                              >
                                X
                              </button>
                            </div>
                          ))}
                        </div>
                        {approvedByOpen && (
                          <ul
                            className="dropdown"
                            style={{
                              maxWidth: 315,
                            }}
                          >
                            {internalApprovedBy.length > 0 ? (
                              internalApprovedBy
                                .filter((item) => {
                                  return (
                                    item.show_in_website == 1 &&
                                    item.vendor_approve &&
                                    item.vendor_approve != "null"
                                  );
                                })
                                .map((approveBy) => (
                                  <li
                                    key={approveBy.id}
                                    onClick={() => {
                                      if (!isLoggedIn) return setOpenAuthModal(true);
                                      setSelectedApprovedBy((prev) => [
                                        ...prev,
                                        approveBy,
                                      ]);
                                      setApprovedByOpen(false);
                                    }}
                                    className="dropdown-item"
                                  >
                                    {approveBy.vendor_approve}
                                  </li>
                                ))
                            ) : (
                              <li className="dropdown-item">No results found</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                  {/* END: Vendor Approved By */}
                </aside>
            </div>  
            {/* END: Filter side bar */}

        {loading && <p className=" col-md-9 text-center ">  <FullLoader /> </p>}

                {!loading && vendors.length == 0 && (
                    <div className=" col-md-9">
                      <h2 className="fs-5 text-center">
                        <b>Vendors Not Found</b>
                      </h2>
                    </div>
                  )
                }



            {/* START:  vendor list*/}
            <div className={vendors && vendors.length > 0 ? `col-md-9` : `col-md-12`}>
            
              <div className="row">
                { !loading && vendors && vendors.length > 0 && (
                  <div className="col-md-12">
                    <h2 className="fs-5">
                      Available Vendors for{" "}
                      <span style={{ fontWeight: "500" }}>
                        {currentSelectedProduct
                          ? getProductTitle()
                          : textCapitalize(getCategoryTitle())}
                      </span>
                    </h2>

                    {currentSelectedProduct && (
                    <div className="row search-sec-3-top">
                      <div className="col-md-3">
                        {vendors && vendors.length > 0 && (
                          <label>
                            <input
                              type="checkbox"
                              onClick={(e) => handleBulkAllSelect(e, vendors)}
                              id="select_all_vendors-vendor_list-vendor_search_page"
                            />
                            <span>Select all vendors</span>
                          </label>
                        )}
                      </div>

                      <div className="col-md-9">
                        <div className="actions">
                          {/* Add Vendors to RFQ Button */}
                          {bulkRFQVendors.length > 0 && (
                            <Link
                              id="add_vendors_to_rfq-vendor_actions-vendor_search_page"
                              style={{ minWidth: "230px" }}
                              href="#"
                              className={`btn btn-primary ${
                                isLoading ? "disabled" : ""
                              }`}
                              onClick={handleBulkAddToRFQ}
                            >
                              {isLoading
                                ? "Adding..."
                                : `Add ${bulkRFQVendors.length} Vendors To RFQ`}
                            </Link>
                          )}

                          {/* View Current RFQ Button (Always Renders) */}
                          {!!vendorMetaData &&
                            vendorMetaData.logged_In &&
                            vendorMetaData.subscription && (
                              <Link
                                id="view_current_rfq-vendor_actions-vendor_search_page"
                                href={
                                  !!queryMeta.rfq_id && queryMeta.rfq_id != null
                                    ? `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${
                                        queryMeta.rfq_id
                                      }${
                                        queryMeta.sheet_id
                                          ? `&sheet_id=${queryMeta.sheet_id}`
                                          : ""
                                      }`
                                    : "/dashboard/buyer/rfq-management?tab=draft-rfq"
                                }
                                className={`btn btn-primary ${
                                  isLoading ? "disabled" : ""
                                }`}
                                role="button"
                                aria-disabled={isLoading}
                              >
                                {!!queryMeta.rfq_id && queryMeta.rfq_id != null
                                  ? `View Current Draft`
                                  : "View My Drafts"}
                              </Link>
                            )}
                        </div>
                      </div>
                    </div>
                    )}

                    <hr />

                    {loading && <FullLoader />}

                    <div className="search-sec-3-mdl hasFullLoader">
                      <div className="search-sec-3-mdl-con all-products-wrap hasFullLoader">
                        {loading && <FullLoader />}
                        {!loading &&
                          vendors.length == 0 &&
                          (debouncedVendorName ? (
                            <a
                              className="text-center pt-4"
                              href="/dashboard/buyer/vendor-management/?newVendor=true"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {`Add "${debouncedVendorName}" to your vendor list Immediately`}
                            </a>
                          ) : (
                            <h2 className="fs-5">
                              <b>No Vendors Found</b>
                            </h2>
                          ))}
                        {vendors &&
                          vendors.map((item) => {
                            return (
                              <SearchItem
                                type={"vendors"}
                                data={item}
                                vendorMetaData={vendorMetaData}
                                setOpenAuthModal={setOpenAuthModal}
                                addToRFQ={addToRFQ}
                                isLoggedIn={isLoggedIn}
                              />
                            );
                          })}
                      </div>

                      {!loading &&
                        (!vendorMetaData?.logged_In ||
                          !vendorMetaData?.subscription) && (
                          <div className="container text-center my-4 ">
                            <button
                              id="register_view_vendors-vendor_redirect-vendor_search_page"
                              type="button"
                              className="btn btn-primary w-50"
                              onClick={handleRedirect}
                            >
                              {!vendorMetaData?.logged_In
                                ? `Register to view ${
                                    vendorMetaData?.total > 0
                                      ? vendorMetaData?.total
                                      : ""
                                  } more vendors`
                                : `Please Buy Subscription to View ${
                                    vendorMetaData?.total > 0
                                      ? vendorMetaData?.total
                                      : ""
                                  } more Vendors`}
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* {!currentSelectedProduct &&  && (
                  <div className="col-md-12 hasblankpadding">
                    <h2 className="fs-5 text-center">
                      <b>Search & Select a product</b>
                      <br /> to see the available vendors!
                    </h2>
                  </div>
                )} */}
              </div>
            </div>
            {/* END:  vendor list*/}
          </div>
        )}
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
     
      {/* Random products carousel (between categories and Why Trust Us) */}
      <div className="container my-4">
        <RandomProductsCarousel className="" />
      </div>

      {/* {allAvailableCities.length > 0 && vendors && vendors.length > 0 && (
        <div className="container my-4">
          <h3 className="fw-bold text-center text-uppercase my-4 text-primary">
            {currentSelectedProduct ? getProductTitle() : textCapitalize(getCategoryTitle())} Vendors by City
          </h3>
          <div className="row">
            {allAvailableCities.map((city, index) => {
              const productSlug = getLocationBaseSlug();
              const citySlug = createLocationSlug(city.city_name);
              const stateSlug = createLocationSlug(city.state_name);
              const cityUrl = `/vendor/${productSlug}-${citySlug}-${stateSlug}`;
              
              return (
                <div key={`city_${city.city_id || index}_${city.city_name}_${city.state_name}`} className="col-md-3 col-sm-4 col-6 mb-3">
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={() => router.push(cityUrl)}
                    style={{ minHeight: '50px' }}
                  >
                    {city.city_name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )} */}

      <h3 className="fw-bold text-center text-uppercase my-4 text-primary">
  Why Trust Us
</h3>
<SecurityFeatures />

<FeatureSEOSection/>



    </>
  );
};

export default Search;

