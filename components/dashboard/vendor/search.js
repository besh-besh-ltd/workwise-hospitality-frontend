import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import {  getProductMakeList, parentCategoryList, searchProductsV2, nestedCategoryData, getRandomProducts } from "@/services/products";
import RandomProductsCarousel from '@/components/dashboard/vendor/RandomProductsCarousel';
import SeoTitle from '@/components/dashboard/vendor/SeoTitle';
import SearchItem from "@/components/search/searchItem";
import FullLoader from "@/components/shared/FullLoader";
import { categoryList, categoryListById, vendorApproveList, addProductToDraft, bulkSearchVendorsByCategory, vendorTypes } from "@/services/rfq";
import { toast } from "react-toastify";
import { faTimesCircle } from "@fortawesome/free-regular-svg-icons";
import { useRouter } from "next/router";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import LocationFilter from "@/components/shared/LocationFilter";
import storageInstance from "@/utils/storageInstance";
import { textCapitalize } from "@/utils/sharedFunctions";
import { debounce } from "lodash";
import { getCountries, getStates, getCities } from "@/services/cms";
import NestedCategoryBrowser from "./NestedCategoryBrowser";
import FeatureSEOSection from "./FeatureSEOsection";
import {useAvailableOptions} from "@/utils/elementFunctions"

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

  // Options for the vendor type dropdown
export const subscriptionTypes = [
  {
    label: "Premium",
    subLabel: "(guaranteed response in 24hrs)",
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

  // -----------------------------
  // Props and Library
  // -----------------------------
  const router = useRouter();
  const { slug, s, loggedin } = router.query;

  // -----------------------------
  // useState Section
  // -----------------------------

  const [open, setOpen] = useState({
    input: false,
    vendorType: false,
    approvedBy: false,
  });
  const [categories, setCategories] = useState([]);
  const [bulkRFQVendors, setbulkRFQVendors] = useState([]);
  const [currentSelectedProduct, setcurrentSelectedProduct] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorMetaData, setVendorMetaData] = useState({});
  const [address, setAddress] = useState({
  selectedCountry: null,
  selectedState: null,
  selectedCity: null,
  countryList: [],
  stateList: [],
  cityList: []
  });
  const [vendorTypeList, setVendorTypeList] = useState([]);
  const [vendorTypeFilter, setVendorTypeFilter] = useState("");
  const [selectedVendorTypes, setSelectedVendorTypes] = useState([]);

  const [approvedByList, setApprovedByList] = useState([]);
  const [selectedApprovedBy, setSelectedApprovedBy] = useState([]);
  const [approvedByFilter, setApprovedByFilter] = useState("");

  const [turnOver, setTurnOver] = useState({
    from: -1,
    to: -1
  })
  const [prevWorkedWith, setPrevWorkedWith] = useState('');
  const [makeList, setMakeList] = useState([]);
  const [selectedMakes, setSelectedMakes] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [allAvailableCities, setAllAvailableCities] = useState([]);
  // const vendorRequestIdRef = useRef(0);
  // const categoryCityCacheRef = useRef(new Map());
  // const categoryCityFetchRef = useRef(new Set());

  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [searchCategories, setSearchCategories] = useState([]);
  const [searchSubCategories, setSearchSubCategories] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [myVendorType, setMyVendorType] = useState(null);
  const [searchProduct, setSearchProduct] = useState(""); // For what user is typing
  const [suggestionLoading, setSuggestionLoading] = useState(false); // For suggestion fetch
  const [suggestions, setSuggestions] = useState([]); // Product name suggestions
  const [queryMeta, setQueryMeta] = useState({
    rfq_id: null,
    sheet_id: null,
  });
  // const [allAvailableCities, setAllAvailableCities] = useState([]);
  const [vendorFirstSearch, setVendorFirstSearch] = useState(false);
  const [locationResetKey, setLocationResetKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);


//   const filterSnapshot = useMemo(() => ({
//   country: selectedCountry,
//   state: selectedState,
//   city: selectedCity,
//   vendorTypes: selectedVendorTypes,
//   approvedBy: selectedApprovedBy,
//   makes: selectedMakes,
//   prevWorkedWith,
//   myVendorType,
//   vendorName: debouncedVendorName,
//   turnOver,
//   subscriptionType: selectedSubscription,
// }), [
//   selectedCountry,
//   selectedState,
//   selectedCity,
//   selectedVendorTypes,
//   "value"
//   );

  const availableApprovedBy = useAvailableOptions(
  approvedByList,
  selectedApprovedBy,
  "id"
);

const LIMIT = 20;

const stripLocationSuffix = (slug) => {
  if (!slug) return slug;
  // Remove category<ID> + EVERYTHING after it
  return slug.replace(/(-category\d+)(.*)$/i, '$1');
};

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
    return str.replace(/-category\d+.*$/i, '');
  }



  // -----------------------------
  // useMemo Section
  // -----------------------------

  // 1. Create a STABLE snapshot using only primitive values (ids/strings)
const filterSnapshot = useMemo(() => {
  return JSON.stringify({
    country: address?.selectedCountry ?? null,
    state: (address?.selectedState || []),
    city: (address?.selectedCity || []),
    vendorTypes: selectedVendorTypes,
    approvedBy: selectedApprovedBy,
    makes: selectedMakes,
    prevWorkedWith: prevWorkedWith || null,
    myVendorType: myVendorType?.value || null,
    vendorName: vendorName.trim(),
    turnoverFrom: turnOver.from,
    turnoverTo: turnOver.to,
  });
}, [
  address?.selectedCountry?.id,
  JSON.stringify(address?.selectedState),
  JSON.stringify(address?.selectedCity),
  selectedVendorTypes,
  JSON.stringify(selectedApprovedBy),
  JSON.stringify(selectedMakes),
  prevWorkedWith,
  myVendorType?.value,
  vendorName,
  turnOver.from,
  turnOver.to,
  myVendorType,
  // debouncedVendorName,
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

  // const topLevelCategoryIds = useMemo(
  //   () => (categoriesLoaded ? categories.map((cat) => cat.id) : []),
  //   [categoriesLoaded, categories]
  // );

  // const isTopLevelCategory = useMemo(() => {
  //   if (!categoryIdFromSlug) return false;
  //   if (!categoriesLoaded) return true;
  //   return topLevelCategoryIds.includes(categoryIdFromSlug);
  // }, [categoryIdFromSlug, topLevelCategoryIds, categoriesLoaded]);

  const showCategoryBrowser = useMemo(() => {
  // Show browser when:
  // - We are on /vendor/all
  if (slugStr === 'all') return true;
  
  // - OR we are on any category page (top-level or nested)
  if (isCategorySlug) return true; // ✅ Show for all categories
  
  // - OR we have a product selected (for showing related categories)
  if (currentSelectedProduct?.name) return false;

  return false;
}, [slugStr, isCategorySlug, currentSelectedProduct]);

const locationBaseSlug = useMemo(() => {
  if (currentSelectedProduct?.slug) {
    return stripLocationSuffix(currentSelectedProduct.slug);
  }
  if (isCategorySlug && slugStr) {
    return stripLocationSuffix(removeCategorySuffix(slugStr));
  }

  // On first render (SSR + first client render), selectedProduct is null → fallback
  if (!currentSelectedProduct) return "all";

  return stripLocationSuffix(cleanAndAddHyphen(currentSelectedProduct.name || ""));
}, [
  currentSelectedProduct?.slug,
  isCategorySlug,
  slugStr,
  currentSelectedProduct
]);


  // -----------------------------
  // useRef Section
  // -----------------------------

  const vendor_area_ref = useRef();
  const searchRef = useRef(null);
  const searchLabelRef = useRef(null);
  const categoryCityCacheRef = useRef(new Map());
  const categoryCityFetchRef = useRef(new Set());
  const vendorRequestIdRef = useRef(0);
  const tempProdRef = useRef(null);
  const categoryLvlRef = useRef(new Map());
  const vendorTypeRef = useRef(null);
  const vendorApprovedByRef = useRef(null);
  const hasRedirected = useRef(false);
  const prevFiltersRef = useRef(null);
  const debouncedFetchSuggestions = useRef(
  debounce(async (val) => {
    const trimmed = val.trim();

    setSuggestionLoading(true);
    try {
      const rsp = await searchProductsV2({ search_key: trimmed }, "products");
      setSuggestions(rsp.data || []);
      setSearchCategories(rsp.categoryData || []);
    } catch (error) {
      console.error("Suggestion fetch failed:", error);
      setSuggestions([]);
      setSearchCategories([]);
    } finally {
      setSuggestionLoading(false);
    }
  }, 300)
).current;


  // -----------------------------
  // useEffect Section
  // -----------------------------

  // Only read localStorage and set the currentselectedProduct on mount, when slug changes.
  useEffect(() => {

    // If slug is "all" do nothing, and clear all fields.
  if (slugStr === "all") {
    storageInstance.removeStorege("search-key");
    localStorage.removeItem("location_filter_city");
    setcurrentSelectedProduct(null);
    setSearchProduct('');
    return;
  }

  const extractId = (slug = "") => {
  const match = slug.match(/category(\d+)/i);
  return match ? match[1] : null;
}

const category_id = extractId(slugStr);

  // If slug is of category set category_id, else set product name, varient id.
  if(category_id){
    setcurrentSelectedProduct({category_id : category_id});
  }
  else{
  const raw = storageInstance.getStorageObj("search-key");
    if (!raw || raw === "" || raw === "null" || raw === "undefined") {
      setcurrentSelectedProduct(null);
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
      if (parsed) {
        setcurrentSelectedProduct(parsed);
      }
    } catch (error) {
      console.error("Failed to parse search-key, clearing...", error);
      storageInstance.removeStorege("search-key");
      router.push('/vendor/all');
    }
  }
}, [slugStr]);


  useEffect(() => {
    const { rfq_id, sheet_id } = router.query;
    setQueryMeta({
      rfq_id,
      sheet_id,
    });
  }, [router.query]);

  function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return;

    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler, active]);
}


  // Initially load countries, then states & cities based on selection of country and state respectively
    useEffect(() => {

      const { selectedCountry, selectedState } = address;

      // Load countries on first mount
      if (!selectedCountry && !!currentSelectedProduct) {
        getCountries().then(res =>
          setAddress(prev => ({
            ...prev,
            countryList: res.data || []
          }))
        );
        return;
      }

      // Load states when country is chosen
      if (selectedCountry && !selectedState?.length) {
        getStates(selectedCountry.id).then(res =>
          setAddress(prev => ({
            ...prev,
            stateList: res.data || []
          }))
        );
        return;
      }

      // Load cities when state is chosen
      if (!!selectedState?.length) {
        getCities(selectedState.id).then(res =>
          setAddress(prev => ({
            ...prev,
            cityList: res.data || []
          }))
        );
      }
    }, [address.selectedCountry, address.selectedState]);


useEffect(() => {

  const filters = JSON.parse(filterSnapshot);

  if (!currentSelectedProduct) {
    setVendors([]);
    setVendorFirstSearch(false);
    setAllAvailableCities([]);
    return;
  }

  setCurrentPage(1);
  setIsLoading(true);

  // If user is browsing category only
  if (currentSelectedProduct.category_id) {
    getVendors('', currentSelectedProduct.category_id);
    return;
  }

  const productName = stripLocationSuffix(
    removeCategorySuffix(currentSelectedProduct.name)
  );

  const catId = categoryIdFromSlug || null;

  //---------------------------------------------------
  // ⭐ Use FILTERS from the decoded filterSnapshot
  //---------------------------------------------------
  searchProductsV2(
    {
      null: catId,
      search_key: productName,
      approved_by: filters.approvedBy || [],
      state: filters.state || [],                   // now IDs only
      city: filters.city || [],                     // now IDs only
      country: filters.country ? [filters.country] : [],
      turnOver: {
        from: filters.turnoverFrom,
        to: filters.turnoverTo
      },
      vendorType: filters.vendorTypes || [],
      prevWorkedWith: filters.prevWorkedWith,
      vendor_name: filters.vendorName,
      myVendorType: filters.myVendorType,
      selectedMakes: filters.makes || []
    },
    "vendors"
  )
    .then((rsp) => {
      if (rsp?.data?.length > 0) {
        setVendorFirstSearch(true);
      }

      const vendorsWithSelected = (rsp.data || []).map((item) => ({
        ...item,
        selected: bulkRFQVendors.some((v) => v.id === item.id),
      }));

      setVendors(vendorsWithSelected);
      setVendorMetaData(rsp);

      const cities = buildCityListFromVendors(vendorsWithSelected);
      setAllAvailableCities(cities);
    })
    .catch(() => {
      setVendors([]);
      setAllAvailableCities([]);
    })
    .finally(() => {
      setIsLoading(false);
    });
}, [filterSnapshot, currentSelectedProduct, categoryIdFromSlug]);


// ADD THIS — dedicated effect for makes only
useEffect(() => {
  if (currentSelectedProduct?.variant_id) {
    getMakeList(currentSelectedProduct.variant_id);
  } else {
    setMakeList([]);
    setSelectedMakes([]);
  }
}, [currentSelectedProduct?.variant_id]);


    useEffect(() => {
    if (localStorage.getItem("token")) {
      setIsLoggedIn(true);
    }
    if (redirectAfterLogin) {
      const url = redirectAfterLogin;
      router.push(url);
    }
    setRedirectAfterLogin(null);
  }, [router, loggedin]);


  // -----------------------------
  // Component Function Section
  // -----------------------------

useClickOutside(searchRef, () => setOpen({...open, input : false}), open.input);
useClickOutside(vendorTypeRef, () => setOpen({...open, vendorType : false}), open.vendorType);
useClickOutside(vendorApprovedByRef, () => setOpen({...open, approvedBy : false}), open.approvedBy);


//some issue in this function, need to check again.
const updateCitiesFromVendors = (vendorsList) => {
  console.log("Updating cities from vendors list:", vendorsList); // Debug log
  const cities = buildCityListFromVendors(vendorsList);
  console.log("Updating cities:", cities); // Debug log
  setAllAvailableCities(cities);
};

const handleRedirect = (e) => {
    if (!isLoggedIn)
      setOpenAuthModal(true);
    else if (!vendorMetaData?.subscription)
      router.push('/dashboard/buyer/subscription');
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

  const handleOpenApprovedBy =()=>{
    setOpen({...open, approvedBy : true});
    setApprovedByFilter(""); // reset search when opening
    getVendorApprovedby();
  }

  const handleOpenVendorTypes = () => {
    getVendorTypeList();
    setOpen(prev => ({ ...prev, vendorType: true }))
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

  const getVendors = async (overrideSearchKey = null, overrideCatId = null, page = 1) => {
  const effectiveCatId = 
  overrideCatId ||
  currentSelectedProduct?.category_id ||
  overrideCatId ||
  categoryIdFromSlug ||
  null;

  // If we're on a top-level category page with no product → just show category browser, no vendors
  if (!effectiveCatId) {
    setVendors([]);
    setIsLoading(false);
    return;
  }

  // Preload city list for pure category pages
  // if (effectiveCatId) {
  //   ensureCategoryCityList(effectiveCatId);
  // }

  // const shouldUseCategoryVendors =
  //   currentSelectedProduct?.category_id &&
  //   effectiveCatId &&
  //   (isCategorySlug || overrideCatId !== null);

  // ——————————————————————————————————
  // CASE 1: Pure category search (no product selected)
  // ——————————————————————————————————
  if (!!effectiveCatId && (!currentSelectedProduct?.name || overrideCatId !== null)) {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    const requestId = ++vendorRequestIdRef.current;

    try {
      const response = await bulkSearchVendorsByCategory({
        category_id: effectiveCatId,
        approved_by_id: selectedApprovedBy.map(x => x.id),
        state: !!address?.selectedState?.length ? address.selectedState : [],
        city: !!address?.selectedCity?.length ? address.selectedCity : [],
        country: address.selectedCountry ? [address.selectedCountry.id] : [],
        turnOver,
        vendorType: selectedVendorTypes,
        prevWorkedWith,
        vendor_name: vendorName,
        myVendorType: myVendorType?.value || null,
        productMakes: selectedMakes,
        page,
        limit: LIMIT
      });

      if (requestId !== vendorRequestIdRef.current) return;

      const bulkRFQVendorIds = new Set(bulkRFQVendors.map(v => v.id));
      const vendorsWithSelected = (response?.data || []).map(vendor => ({
        ...vendor,
        selected: bulkRFQVendorIds.has(vendor.id)
      }));

      setVendors(prev => page === 1 ? (vendorsWithSelected || []) : [...prev, ...(vendorsWithSelected || [])]);
      setVendorFirstSearch(true);
      const totalVendors = response?.total || 0;
      setHasNextPage((page * LIMIT) < totalVendors);
      
      setVendorMetaData({
        data: vendorsWithSelected,
        total: response?.total || 0,
        logged_In: isLoggedIn,
        subscription: response?.subscription ?? vendorMetaData.subscription ?? false
      });

      // Cache cities for location filter
     const cities = buildCityListFromVendors(vendorsWithSelected);
      setAllAvailableCities(cities);

    } catch (error) {
      if (requestId !== vendorRequestIdRef.current) return;
      console.error("Error fetching category vendors:", error);
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
    return;
  }

  // ——————————————————————————————————
  // CASE 2: Product-specific search (or free text with searchProduct)
  // ——————————————————————————————————
  const getSearchTerm = () => {
    if (overrideSearchKey !== null) return overrideSearchKey;
    if (!!currentSelectedProduct?.name) {
      return currentSelectedProduct.name || currentSelectedProduct.product_name || "";
    }

    if (searchProduct.trim()) return searchProduct.trim();
    if (isCategorySlug && slugStr) {
      return removeCategorySuffix(stripLocationSuffix(slugStr));
    }
    return "";
  };

  const searchTerm = getSearchTerm();

  // Nothing to search for → clear results
  if (!searchTerm && !effectiveCatId) {
    setVendors([]);
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  const requestId = ++vendorRequestIdRef.current;

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

    const vendorsWithSelected = (response.data || []).map(item => ({
      ...item,
      selected: bulkRFQVendors.some(v => v.id === item.id)
    }));

    setVendors(prev => page === 1 ? vendorsWithSelected : [...prev, ...vendorsWithSelected]);

    const totalVendors = response?.total || 0;
    setHasNextPage((page * ITEMS_PER_PAGE) < totalVendors);

    // updateCitiesFromVendors(vendorsWithSelected);
    setVendorMetaData(response);

    const cities = buildCityListFromVendors(vendorsWithSelected);
    setAllAvailableCities(cities);


  } catch (error) {
    if (requestId !== vendorRequestIdRef.current) return;
    console.error("Error fetching vendors:", error);
    setVendors([]);
    setVendorMetaData(error?.response?.data || {});
  } finally {
    setIsLoading(false);
    setIsLoadingMore(false);
  }
};

const getProducts = async (s_key = searchProduct.trim()) => {
    setIsLoading(true);
    categoryLvlRef.current = new Map();
    return searchProductsV2(
      {
        search_key: s_key,
        vendor_name: vendorName,
        // is_private: is_private,
        // preferred_vendor: preferred_vendor,
      },
      type
    )
      .then((rsp) => {
        setIsLoading(false);
        let d = rsp.data.map((item) => {
          item.selected = false;
          return item;
        });
        setSearchCategories(rsp.categoryData);
        // Only set currentSelectedProduct if this is not a "category result"
        // If rsp.isCategoryResult is true, do NOT set currentSelectedProduct
        return rsp;
      })
      .catch((error) => {
        setIsLoading(false);
        throw error;
      });
  };

  const getCategoriesById = (category_id, category_name) => {
    setIsLoading(true);
    categoryLvlRef.current.set(category_id, category_name);

    categoryListById({ category_id })
      .then((res) => {
        setProductsList(res.productList);
        // Keep product selection ONLY if user is navigating categories without picking a product
        // if (!currentSelectedProduct?.variant_id) {
        //   setcurrentSelectedProduct(null);
        // }
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
        setIsLoading(false);
        setOpen({...open, input : false});

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
  setIsLoading(true)
  parentCategoryList()
    .then((res) => {
      setCategories(res.data.parentCategories);
      setProductsList([]);
      setIsLoading(false)
      
      // ONLY redirect to /vendor/all if current path is exactly /vendor
      // and we don't have a specific product slug
      const currentPath = router?.asPath || "";
      const isRootVendorPath = currentPath === '/vendor' || currentPath === '/vendor/';
      const hasSpecificSlug = slug && slug !== 'all';
      
      if (!hasRedirected.current && isRootVendorPath && !hasSpecificSlug) {
        hasRedirected.current = true;
        localStorage.removeItem("search-key");
        setSearchKey(false);
        router.push("/vendor/all");
      }
      
      setOpen({ ...open, input: false });
    })
    .catch((error) => {
      setIsLoading(false)
      console.error("Error fetching categories:", error);
    });
};

  const getCategories = () => {
    // setcatloading(true);
    categoryList()
      .then((rsp) => {
        // setcatloading(false);
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
        // setcatloading(false);
      });
  };

  // Random products carousel logic extracted to RandomProductsCarousel component
  const getVendorApprovedby = () => {
    vendorApproveList(currentSelectedProduct?.variant_id)
      .then((rsp) => {
        setApprovedByList(rsp.data);
      })
      .catch((error) => {
        toast.error("Can't get the Approved List!");
        // Optionally handle the error here (e.g., show a toast)
      });
  };

const clearVendorFilters = () => {
  setMyVendorType(null);
};

const getVendorTypeList = () => {
  vendorTypes()
  .then((res)=>{
    setVendorTypeList(res.data)
  })
}

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

  // Handle search input changes
  const handleSearchChange = (e) => {
  const val = e.target.value;
  setSearchProduct(val);                    // User is typing → update input instantly

  // Fetch suggestions only if length > 2
  if (val.length > 2) {
    debouncedFetchSuggestions(val);
    setOpen({ ...open, input: true });     // Show dropdown
  } else {
    debouncedFetchSuggestions.cancel();
    setSuggestions([]);
    setSearchCategories([]);
  }
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
  setOpen(prev => ({ ...prev, input: false }));
  setVendorFirstSearch(false);

  const displayName = item.variant_name || item.product_name || "";

  if (!displayName) {
    toast.error("Invalid product selected");
    return;
  }

  // Store the name and varient_id in Localstorage for future vendor & Product-Make list.
  const store = {
    name : displayName,
    variant_id : item.variant_id || null
  }
  // Save via storageInstance
  storageInstance.setStorageObj("search-key", JSON.stringify(store));

  setVendorName("");
  setSelectedMakes([]);
  setSelectedVendorTypes([]);
  setSelectedApprovedBy([]);
  setPrevWorkedWith(null);
  setMyVendorType(null);
  setTurnOver({ from: -1, to: -1 });
  clearLocationFilter();

  const baseSlug = item.slug || cleanAndAddHyphen(displayName);

  let locationSuffix = "";

if (address.selectedCity || address.selectedState) {
  const parts = [];

  if (address.selectedCity?.name) {
    parts.push(createLocationSlug(address.selectedCity.name));
  }

  if (address.selectedState?.name) {
    parts.push(createLocationSlug(address.selectedState.name));
  }

  locationSuffix = parts.length ? `-${parts.join("-")}` : "";
}


  const newSlug = `${baseSlug}${locationSuffix}`;

  const { rfq_id, sheet_id } = router.query;

  router.push(
    {
      pathname: `/vendor/${newSlug}`,
      query: {
        ...(rfq_id && { rfq_id }),
        ...(sheet_id && { sheet_id }),
      },
    },
    undefined,
    { shallow: false }
  );
};

const clearLocationFilter = () => {
  setAddress({
    selectedCountry: null,
    selectedState: [],
    selectedCity: [],
    countryList: address.countryList,
    stateList: [],
    cityList: []
  });

  setLocationResetKey(prev => prev + 1); // 🔥 triggers reset in child

    // if (currentSelectedProduct) {
    //   const baseSlug = stripLocationSuffix(
    //     currentSelectedProduct.slug ||
    //       cleanAndAddHyphen(
    //         currentSelectedProduct.variant_name || currentSelectedProduct.product_name || ""
    //       )
    //   );
    //   const { rfq_id, sheet_id } = router.query;
    //   const queryStr = rfq_id && sheet_id ? `?rfq_id=${rfq_id}&sheet_id=${sheet_id}` : rfq_id ? `?rfq_id=${rfq_id}` : '';
    //   router.replace(`/vendor/${baseSlug}${queryStr}`, undefined, { shallow: true });
    // }
  };

  // --- Search bar: always editable ---
  const getProductTitle = () => {
    if (currentSelectedProduct) {
      const title = currentSelectedProduct.name || null;
      return title;
    }
    return '';
  };

  const buildCityListFromVendors = (vendorsList = []) => {
    const cityMap = new Map();
    vendorsList.forEach(vendor => {
        if(!!vendor?.location?.length && vendor?.location[0]?.city_name && vendor.location[0]?.state_name) {
        const cityKey = `${vendor.location[0]?.city_name.toLowerCase()}-${vendor.location[0]?.state_name.toLowerCase()}`;
        if (!cityMap.has(cityKey)) {
          cityMap.set(cityKey, {
            city_name: vendor.location[0]?.city_name,
            city_id: vendor.location[0]?.city_id,
            state_name: vendor.location[0]?.state_name,
            state_id: vendor.location[0]?.state_id
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

      setVendorFirstSearch(true);
      setVendors(response?.data);
      setcurrentSelectedProduct({category_id : categoryId});
      const cities = buildCityListFromVendors(vendorsWithSelected);
      setAllAvailableCities(cities);
      setVendorFirstSearch(true);
    } catch (error) {
      console.error("Error preloading category cities:", error);
    } finally {
      categoryCityFetchRef.current.delete(categoryId);
    }
  };

  const getCategoryTitle = () => {
    if (!slugStr) return '';
    const baseSlug = stripLocationSuffix(removeCategorySuffix(slugStr));
    return baseSlug.replace(/-/g, ' ');
  };

  const getLocationBaseSlug = (city) => {
    let baseSlug = "";
    if (currentSelectedProduct?.slug) baseSlug = currentSelectedProduct.slug;
    else if (isCategorySlug) baseSlug = slugStr || "";
    else {
      const localObject = localStorage.getItem("search-key");
    let search_key = '';
    let variant_id = '';
    if(localObject){
      search_key = JSON.parse(localObject).name;
      variant_id = JSON.parse(localObject).variant_id;
    }
      baseSlug = cleanAndAddHyphen(removeCategorySuffix(search_key || ""));}
    return stripLocationSuffix(baseSlug);
  };

  const handleLoadMore = useCallback(() => {
  if (!isLoadingMore && hasNextPage) {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    // getVendors(null, null, nextPage);
  }
  return Promise.resolve();
}, [isLoadingMore, hasNextPage, currentPage]);

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <>
    {/* -----------------------------
         HERO section with Generate RFQ button
       ----------------------------- */}
      <section className="vendor-common-header sc-pt-80" aria-label="header">
        <div className="container-fluid  text-center">
          <SeoTitle
            slug={slug}
            currentSelectedProduct={currentSelectedProduct}
            address={address}
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

      {/* -----------------------------
         Search bar with Product Dropdown
       ----------------------------- */}
      <section className="search-sec-1" aria-label="search-box">
        <div className="container-fluid product-search">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
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
                        value={searchProduct}
                      />

                    {/* Product Dropdown opens on typing */}
                      {open.input && (
                        <div className="search_results_autocomplete">
                          {suggestionLoading && (
                            <div>
                              {" "}
                              <div
                                className="spinner-border text-primary spinner-border-sm mr-4"
                                role="status"
                              ></div>{" "}
                              Fetching..
                            </div>
                          )}
                          {!suggestionLoading && searchProduct === "" && (
                            <p className="mb-0">Start Typing Product Name...</p>
                          )}
                          {!suggestionLoading &&
                            searchProduct.length < 3 &&
                            searchProduct.length > 0 && (
                              <p className="mb-0">
                                Please enter at least 3 characters...
                              </p>
                            )}
                            {
                            !suggestionLoading &&
                            searchProduct !== "" &&
                            searchProduct.length >= 3 &&
                            suggestions.length == 0 && (
                               <p className="mb-0">
                                Nothing was Found!
                              </p>
                            )
                            }
                          {!suggestionLoading &&
                            searchProduct !== "" &&
                            (suggestions.length > 0 || searchCategories.length > 0) && (
                              <>
                                <p
                                  className="text-center fw-bold "
                                  style={{ color: "var(--secondary-color)" }}
                                >
                                  Select an option from dropdown
                                </p>
                                <div className="row">
                                  {/* Product List Column */}
                                  <div className="col-7">
                                    <div className="container">
                                      <h2 className="sticky-top fw-semibold text-center text-white py-1 rounded-2 bg-black" >
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
                                  {/* Category List Column */}
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
                      {open.input && (
                        <div
                          className="blur-overlay"
                          onClick={() => {
                            setOpen({ ...open, input: false });
                          }}
                        />
                      )}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </section>

       {/* -----------------------------
         Vendor List with Filter Section
       ----------------------------- */}
      <section className="search-sec-2" aria-label="product-categories-section">
        <div className="container-fluid">
          {/* Nested categories fetched dynamically from backend (now in NestedCategoryBrowser) */}
          {showCategoryBrowser && 
            <NestedCategoryBrowser
              onGetProducts={getProducts}
              onGetVendors={getVendors}
            />}
          
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
                    {isLoading && !currentSelectedProduct && <FullLoader />}
                    {!isLoading &&
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
          
 
          {/* Vendor List Section */}
         {(!!currentSelectedProduct) &&
         (
          (isLoading && !vendorFirstSearch ) ? 
         <FullLoader/>
         :
         vendorFirstSearch ? (
          <div className="row" id="vendors_area" ref={vendor_area_ref}>
            {/* START : Filter side bar */}

              <div className="col-md-3">
                <aside>
                  <h4 className=" text-center mb-4 fw-semibold border-bottom border-bottom-2px  py-2 ">
                    Filters
                  </h4>

                  <div className="search-con-right-1">
                    <div>
                      {subscriptionTypes.map((t) => (
                        <div key={t.value} className="d-flex gap-1">
                          <input
                            type="radio"
                            style={{width: "fit-content", height: "fit-content", marginRight: "4px", marginTop: "4px"}}
                            name="subscriptionType"
                            id={`subscription-${t.value}`}
                            value={t.value}
                            checked={selectedSubscription?.value == t.value}
                            onChange={(e) => {
                              if (!vendorMetaData || !vendorMetaData.logged_In) {
                                setOpenAuthModal(true);
                                return;
                              }

                              const selectedValue = e.target.value;
                              const selected = subscriptionTypes.find(
                                (option) => option.value == selectedValue
                              );

                              if (selected) {
                                setSelectedSubscription(selected);
                              }
                            }}
                          />
                          <div className="d-flex flex-column">
                            <label
                              className="form-check-label"
                              htmlFor={`subscription-${t.value}`}
                            >
                              {t.label}
                            </label>
                            {t.subLabel && (
                                <small className="text-muted">{t.subLabel}</small>
                              )}
                          </div>
                        </div>
                      ))}

                      {/* Clear filter */}
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
                  {makeList?.length > 0 && (
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
                          if (!isLoggedIn)
                            setOpenAuthModal(true);
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

                  {/* START: Location filter */}
                  <div className="search-con-right-1">
                    <p className="fw-semibold  mb-2">Location</p>
                    {address.selectedCountry && (
                      <p
                        className="clearFilter"
                        onClick={(e) => {
                          e.preventDefault();
                          clearLocationFilter();
                        }}
                      >
                        <FontAwesomeIcon icon={faTimesCircle} /> clear
                      </p>
                    )}

                    <div className="hasFullLoader">
                      <LocationFilter
                        address={address}
                        setAddress={setAddress}
                        resetKey={locationResetKey}
                      />
                    </div>
                  </div>
                  {/* END: Location filter */}

                  {/* START: Vendor Type */}
                 <div className="search-con-right-1">
                    <p className="fw-semibold mb-2">Vendor Type</p>
                    <div ref={vendorTypeRef} className="selection-dropdown">
                      {/* Search Input */}
                      <input
                        type="text"
                        value={vendorTypeFilter} 
                        onChange={(e) => setVendorTypeFilter(e.target.value)}
                        onFocus={handleOpenVendorTypes}
                        placeholder="Search vendor types..."
                        className="mb-2"
                      />

                      {/* Selected Tags */}
                      <div className="d-flex gap-2 flex-wrap mt-2">
                        {selectedVendorTypes.map((type) => (
                          <div key={type.value} className="selected-country">
                            {type.label}
                            <button
                              onClick={() => {
                                if (!isLoggedIn) return setOpenAuthModal(true);
                                setSelectedVendorTypes(prev =>
                                  prev.filter(t => t.value !== type.value)
                                );
                              }}
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Dropdown with Live Search */}
                      {open.vendorType && (
                        <ul className="dropdown" style={{ maxWidth: 315, maxHeight: 200, overflowY: "auto" }}>
                          {availableVendorTypes
                            .filter(type =>
                              type.label.toLowerCase().includes(vendorTypeFilter.toLowerCase())
                            )
                            .map((type) => (
                              <li
                                key={type.value}
                                onClick={() => {
                                  if (!isLoggedIn) return setOpenAuthModal(true);

                                  // Prevent duplicates
                                  if (selectedVendorTypes.some(t => t.value === type.value)) return;

                                  setSelectedVendorTypes(prev => [...prev, type]);
                                }}
                                style={{
                                  fontWeight: selectedVendorTypes.some(t => t.value === type.value)
                                    ? "bold"
                                    : "normal",
                                  color: selectedVendorTypes.some(t => t.value === type.value)
                                    ? "var(--primary-color)"
                                    : "inherit"
                                }}
                              >
                                {type.label}
                              </li>
                            ))}

                          {availableVendorTypes.filter(type =>
                            type.label.toLowerCase().includes(vendorTypeFilter.toLowerCase())
                          ).length === 0 && (
                            <li className="text-muted text-center">No vendor types found</li>
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
                            setPrevWorkedWith(null);
                          }}
                        >
                          <FontAwesomeIcon icon={faTimesCircle} /> clear
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* END: Previously Worked With */}

                  {/* START: Vendor Approved By */}
                  {(currentSelectedProduct || !!vendors.length) && (
                    <div className="search-con-right-1">
                      <p className="fw-semibold mb-2">Vendor Approved By</p>
                      <div
                        ref={vendorApprovedByRef}
                        className="selection-dropdown"
                      >
                        <input
                          type="text"
                          value={approvedByFilter}
                          onChange={(e) => setApprovedByFilter( e.target.value)}
                          placeholder="Search Approved Vendors"
                          onFocus={handleOpenApprovedBy}
                        />
                        {/* Selected tags */}
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

                        {/* Dropdown — LIVE FILTER + EXCLUDE SELECTED */}
                        {open.approvedBy && (
                            <ul className="dropdown" style={{ maxWidth: 315 }}>
                              {(() => {
                                const filteredList = availableApprovedBy.filter(item =>
                                  item.vendor_approve &&
                                  item.vendor_approve.toLowerCase().includes(approvedByFilter.toLowerCase())
                                );

                                // Case 1 — NOTHING matches search text
                                if (filteredList.length === 0) {
                                  return <li className="text-muted text-center">Nothing was found</li>;
                                }

                                // Case 2 — All matches are already selected
                                const unselectedList = filteredList.filter(
                                  item => !selectedApprovedBy.some(sel => sel.id === item.id)
                                );

                                if (unselectedList.length === 0) {
                                  return <li className="text-muted text-center">Already added</li>;
                                }

                                // Case 3 — Normal: Show unselected items
                                return unselectedList.map(approveBy => (
                                  <li
                                    key={approveBy.id}
                                    onClick={() => {
                                      if (!isLoggedIn) return setOpenAuthModal(true);
                                      setSelectedApprovedBy(prev => [...prev, approveBy]);
                                    }}
                                  >
                                    {approveBy.vendor_approve}
                                  </li>
                                ));
                              })()}
                            </ul>
                          )}

                      </div>
                    </div>
                  )}
                  {/* END: Vendor Approved By */}
                </aside>
            </div>  
            {/* END: Filter side bar */}

        {isLoading && vendorFirstSearch && <div className=" col-md-9 text-center ">  <FullLoader /> </div>} 

                 {!isLoading && vendorFirstSearch && vendors.length === 0 && (
                    <div className=" col-md-9">
                            <h2 className="fs-5 text-center text-muted">
                              <b>No Vendors Found</b>
                              <br />
                              <small>Try adjusting filters or searching for a vendor name</small>
                            </h2>
                    </div>
                  )
                }



            {/* START:  vendor list*/}
            {
            !isLoading && !!vendors.length &&
            <div className={vendors && !!vendors.length ? `col-md-9` : `col-md-12`}>
            
              <div className="row">
                { !isLoading && !!vendors?.length && (
                  <div className="col-md-12">
                    <h2 className="fs-5">
                      Available Vendors for{" "}
                      <span style={{ fontWeight: "500" }}>
                        {currentSelectedProduct?.name
                          ? getProductTitle()
                          : textCapitalize(getCategoryTitle())}
                      </span>
                    </h2>

                    {vendors && !!vendors.length && (
                      <div className="row search-sec-3-top">
                        {
                        !!currentSelectedProduct?.name &&
                        <div className="col-md-3">
                          <label>
                            <input
                              type="checkbox"
                              onClick={(e) => handleBulkAllSelect(e, vendors)}
                              id="select_all_vendors-vendor_list-vendor_search_page"
                            />
                            <span>Select all vendors</span>
                          </label>
                        </div>
                        }

                        <div className={`col-md-9 ${!!currentSelectedProduct?.name ? '' : "w-100"}`}>
                          <div className="actions">
                            {bulkRFQVendors.length > 0 && !!currentSelectedProduct?.name && (
                              <Link
                                id="add_vendors_to_rfq-vendor_actions-vendor_search_page"
                                style={{ minWidth: "230px" }}
                                href="#"
                                className={`btn btn-primary ${isLoading ? "disabled" : ""}`}
                                onClick={handleBulkAddToRFQ}
                              >
                                {isLoading
                                  ? "Adding..."
                                  : `Add ${bulkRFQVendors.length} Vendors To RFQ`}
                              </Link>
                            )}

                            {isLoggedIn && vendorMetaData?.subscription && (
                              <Link
                                id="view_current_rfq-vendor_actions-vendor_search_page"
                                href={
                                  !!queryMeta.rfq_id && queryMeta.rfq_id != null
                                    ? `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${queryMeta.rfq_id}${
                                        queryMeta.sheet_id ? `&sheet_id=${queryMeta.sheet_id}` : ""
                                      }`
                                    : "/dashboard/buyer/rfq-management?tab=draft-rfq"
                                }
                                className={`btn btn-primary ${isLoading ? "disabled" : ""}`}
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

                    {isLoading && <FullLoader />}

                    <div className="search-sec-3-mdl hasFullLoader">
                      <div className="search-sec-3-mdl-con all-products-wrap hasFullLoader">
                        {isLoading && <FullLoader />}
                        <div 
                          style={{ height: '800px', overflowY: 'auto' }}
                          onScroll={(e) => {
                            const { scrollTop, scrollHeight, clientHeight } = e.target;
                            if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isLoadingMore) {
                              handleLoadMore();
                            }
                          }}
                          className="search-sec-3-mdl-con all-products-wrap"
                        >
                          {vendors.map((item) => (
                            <SearchItem
                              key={item.id}
                              type={"vendors"}
                              data={item}
                              vendorMetaData={vendorMetaData}
                              setOpenAuthModal={setOpenAuthModal}
                              addToRFQ={addToRFQ}
                              selectedProduct={currentSelectedProduct}
                              handleRemoveCurrentSelected={()=>{}}
                              isLoggedIn={isLoggedIn}
                            />
                          ))}
                          {/* Need to stop loader when no vendor is left */}
                          {/* {hasNextPage && (
                            <div className="text-center py-4">
                              <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading more...</span>
                              </div>
                            </div>
                          )} */}
                        </div>
                      </div>

                      {!isLoading &&
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
              </div>
            </div>
            }
          </div>
        )
        :
          (
            <div className="text-center pt-4">
              <p className="mb-3 text-muted">
                No vendors found for "<strong>{searchProduct.trim().toUpperCase()}</strong>"
              </p>
              <a
                className="btn btn-outline-primary"
                href="/dashboard/buyer/vendor-management/?newVendor=true"
                target="_blank"
                rel="noopener noreferrer"
              >
                Add "{searchProduct.trim()}" to your vendor list now
              </a>
            </div>
          )
        )}
        </div>

        {/* ------------- Auth Modal ------------- */}
        <LoginContainer
          loading={isLoading}
          setIsLoading={setIsLoading}
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

      {!!allAvailableCities?.length && (
        <div className="container my-4">
          <h3 className="fw-bold text-center text-uppercase my-4 text-primary">
            {currentSelectedProduct ? getProductTitle() : textCapitalize(getCategoryTitle())}{" "}
            Vendors by City
          </h3>

          <div className="row g-3">
            {allAvailableCities.map((city) => {
              const productSlug = getLocationBaseSlug(city);
              const citySlug = createLocationSlug(city.city_name);
              const stateSlug = createLocationSlug(city.state_name);
              const url = `/vendor/${[productSlug, citySlug, stateSlug]
                .filter(Boolean)
                .join('-')}`;

              return (
                <div key={`${city.city_name}-${city.state_name}`} className="col-md-3 col-sm-4 col-6">
                  <button
                    className="btn btn-outline-primary w-100 text-capitalize"
                    style={{ minHeight: "50px" }}
                    onClick={() => {

                      localStorage.setItem('location_filter_city', JSON.stringify({
                        city_id: city.city_id,
                        city_name: city.city_name,
                        state_id: city.state_id,
                        state_name: city.state_name
                      }));

                      router.push(url, undefined, { shallow: true });
                    }}
                  >
                    {city.city_name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        )}

      <h3 className="fw-bold text-center text-uppercase my-4 text-primary">
  Why Trust Us
</h3>
<FeatureSEOSection/>
    </>
  );
};

export default Search;