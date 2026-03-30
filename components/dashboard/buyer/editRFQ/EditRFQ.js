import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Select from 'react-select';
import { updateRfq, getTerms, vendorApproveList, getRFQById, getVendorsForProduct, addProductToExistingRfq, refreshVendors, previewRefreshVendors } from "@/services/rfq";
import { Form, Formik } from "formik";

import Loader from "@/components/shared/Loader";
import { useDispatch, useSelector } from "react-redux";
import {
  intializeRfq,
  clearRfqState,
  setOtherFormFields,
  setTermsData,
  setAllTerms,

} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getDepartments } from "@/services/rbac";
import { getCountryCodes } from "@/services/cms";
import { getRFQHotels } from "@/services/hospitality";
import * as Yup from "yup";
import { formatISOToDateTimeLocal, getEntityLabel } from "@/utils/sharedFunctions";
import ViewVendorModal from "./ViewVendorModal";
import AddVendorModal from "./AddVendorModal";
import AddProductModal from "./AddProductModal";
import { faAdd, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion } from "react-bootstrap";
import Item from "../createRFQ/Item";
import { editRfqSchema } from "@/utils/schema";
import { cleanUpdatableData } from "../createRFQ/CreateRFQ";
import AddSpecModal from "./AddSpecModal";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import Modal from "react-modal";
import { BsArrowRepeat, BsPeopleFill, BsCheckCircleFill } from "react-icons/bs";
import useModulePermissions from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";

// Add validation schema
const EditRFQSchema = Yup.object().shape({
  title: Yup.string().required("Title is required"),
  contact_number: Yup.string()
    .matches(/^\d+$/, "Please enter only numbers without country code or special characters")
    .min(10, "Contact number must be at least 10 digits")
    .max(15, "Contact number must not exceed 15 digits")
    .required("Contact number is required"),
  response_email: Yup.string()
    .email("Invalid email format")
    .required("Response email is required"),
  contact_name: Yup.string()
    .required("Contact name is required")
    .min(2, "Contact name must be at least 2 characters")
    .max(50, "Contact name must not exceed 50 characters"),
  location: Yup.string()
    .nullable()
    .transform(value => value === null || value === '' ? '' : value),
  bid_end_date: Yup.string().required("Procurement end date is required"),
});

const rfqTypes = [
  {
    label: "None",
    value: '',
  }, 
  {
    label: "Firm",
    value: "firm",
  }, 
  {
    label: "Budgetary",
    value: "budgetary",
  }
]

const binaryType = [
  {
    label: "Enabled",
    value: 1,
  }, 
  {
    label: "Disabled",
    value: 0,
  }
]

const statusType = [
  {
    label: "Open",
    value: 1,
  }, 
  {
    label: "Closed",
    value: 2,
  }
]

const EditRFQ = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(true);
  const [rfqLoading, setRfqLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [rfqData, setRfqData] = useState(null);
  const [products, setProducts] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [dataFetchError, setDataFetchError] = useState(null);

  // Add a ref to track if we've already refreshed terms to avoid infinite loop
  const termRefreshCompletedRef = useRef(false);

  const userProfile = useSelector((state) => state.userProfile);
  const storeLoading = useSelector((state) => state.storeLoading);
  const rfqFormDataFromStore = useSelector((state) => state.rfqFormData || {});
  const allTerms = useSelector((state) => state.allTerms || []);
  const selectedTerms = useSelector((state) => state.rfqFormData?.terms || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [countryCode, setCountryCode] = useState([]);
  const [onecountrycode, setonecountrycode] = useState("");
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddSpecModal, setShowAddSpecModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState([]);
  const [activeKey, setActiveKey] = useState(null);

  const [updatableData, setUpdatableData] = useState({
    products: {
      addable: [],
      deletable: [],
      updatable: {},
    },
    vendors: {},
  })
  const [productAddData, setProductAddData] = useState({
    variant_id: -1,
    specs: {
      quantity: 1,
      unit: 'nos',
    },
  })
  const [vendors, setVendors] = useState([]);
  const [productsWithNoVendors, setProductsWithNoVendors] = useState(new Set());
  const [termsChanged, setTermsChanged] = useState(false);

  // Promps a confirmation if any product is going to be deleted
  const [isUpdateConfirm, setIsUpdateConfirm] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState(null);

  // Refresh vendors modal state
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [refreshStep, setRefreshStep] = useState('confirm');
  const [refreshCount, setRefreshCount] = useState(0);

  // Hotel selection state
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);

  // Add a ref to track if terms have been initialized
  const termsInitializedRef = useRef(false);

  // Permission management - fetch permissions based on mapped hotels
  // Dynamic module key based on is_tender field (1 = tender, 0 = rfq)
  const hotelIds = selectedHotelIds.length > 0
    ? selectedHotelIds
    : rfqData?.mappedHotels?.map(h => h.hotel_id) || [];
  const moduleKey = rfqData?.is_tender === 1 ? "boq" : "rfq";
  const {
    canRead,
    canUpdate,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: moduleKey,
    hotelIds: hotelIds,
    enabled: !!rfqData && hotelIds.length > 0,
  });

  const fetchCountryCodes = () => {
    getCountryCodes()
      .then((response) => {
        if (response?.data) {
          setCountryCode(response.data);
        } else {
          setCountryCode([]);
        }
      })
      .catch((error) => {
        setCountryCode([]);
      });
  };

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      const depts = (response?.data?.data || response?.data || []).map((d) => ({
        value: d.id,
        label: d.title || d.name
      }));
      setDepartments(depts);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchUserHotelMappings = () => {
    const mappings = (userProfile?.hospitality_mappings || []).filter(m => m.hospitality_hotel_id != null);
    setUserHotelMappings(mappings);
  };

  const handleTermChange = (e, item) => {
      try {
        setTermsChanged(true);
        const isChecked = e.target.checked;
        // Always convert ID to string for consistent comparison
        const termId = String(item.id || item.term_id);
        
        // Extract term content with fallbacks
        const termName = item.term_content || item.name || item.term_text || 
                       (item.content && item.content[0] ? item.content[0].title : null) ||
                       `Term ${termId}`;
        
        // Clone the current terms array to avoid direct state mutation
        let updatedTerms = [...(selectedTerms || [])];
        
        if (isChecked) {
          // Make sure term isn't already selected (checking both id and term_id)
          const existingTerm = updatedTerms.find(term => 
            String(term.id) === termId || String(term.term_id) === termId
          );
          
          if (!existingTerm) {
            // IMPORTANT: Only store id and name as required by backend
            updatedTerms.push({
              id: Number(termId), // Convert to number as required by backend
              name: termName
            });
          }
        } else {
          updatedTerms = updatedTerms.filter(term => {
            const cond = term.id != termId
            return cond
          })
        }
        
        // Update Redux with the new terms array
        dispatch(setTermsData(updatedTerms));
        setHasUnsavedChanges(true);
        setTermsChanged(true);
      } catch (error) {
        console.error("Error handling term change:", error);
        toast.error("An error occurred while updating terms. Please try again.");
      }
    };

  const fetchAvailableVendorsForProduct = async (searchTerm = null) => {
    if(!selectedProduct || !selectedProduct.product) return;

    try {
      const body = {
        productId: selectedProduct.product.product_id,
        excludeIds: selectedProduct?.vendors?.map(vendor => vendor.user_id) ?? [],
        searchTerm
      }
      const response = await getVendorsForProduct(body)
      setVendors(response.data)
    } catch (error) {
      toast.error(error.message)
    }
  }
  
  useEffect(() => {
    // Clear Redux store first
    dispatch(clearRfqState());
    
    // Reset refs for a fresh start
    termRefreshCompletedRef.current = false;
    termsInitializedRef.current = false;
    
    // Only start fetching when we have an ID
    if (router.query.id) {
      fetchInitialData();
      fetchCountryCodes();
      fetchDepartments();
      fetchUserHotelMappings();
    }
    
    // Handle beforeunload event
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router.query.id, dispatch]);

  useEffect(() => {
    fetchAvailableVendorsForProduct();
  }, [selectedProduct])

  // useEffect(() => {})


  // Add useEffect to force term reselection after component mounts
  useEffect(() => {
    // Only run this once when the component has loaded and allTerms are available
    // Use the ref to ensure we only do this operation ONCE
    if (allTerms?.length > 0 && selectedTerms?.length > 0 && initialDataLoaded && !termRefreshCompletedRef.current) {
      
      // Mark that we've completed this refresh to prevent infinite loops
      termRefreshCompletedRef.current = true;
      
      // We'll deliberately dispatch the same terms to trigger UI updates
      const refreshedTerms = [...selectedTerms];
      dispatch(setTermsData(refreshedTerms));
    }
  }, [allTerms, initialDataLoaded, selectedTerms]);

  const fetchInitialData = async () => {
    try {
      // If we're re-fetching after an update, don't show loading indicators
      const isRefetch = initialized;
      
      if (!isRefetch) {
        setMainLoading(true);
        setRfqLoading(true);
      }
      
      setDataFetchError(null);

      const id = router.query.id;
      if (!id) {
        throw new Error("No RFQ ID provided");
      }

      // First get all available terms for reference
      const termsResponse = await getTerms();
      let availableTerms = [];
      
      if (termsResponse?.data) {
        // Create a map of all available terms for quick lookup
        availableTerms = termsResponse.data.map(term => ({
          id: term.id,
          term_content: term.term_content || term.name || term.term_text ||
                       (term.content && Array.isArray(term.content) && term.content[0]?.title) ||
                       `Term ${term.id}`,
          name: term.name || term.term_content || term.term_text ||
                (term.content && Array.isArray(term.content) && term.content[0]?.title) ||
                `Term ${term.id}`
        }));
        
        // Store all available terms in Redux
        dispatch(setAllTerms(availableTerms));
      }

      // Get RFQ data which includes selected term IDs
      const rfqResponse = await getRFQById(id, null, true);
      if (!rfqResponse.data) {
        throw new Error("No data received from RFQ endpoint");
      }

      const rfqData = rfqResponse.data;

      // Process selected terms by cross-referencing with available terms
      if (rfqData.terms && rfqData.terms.length > 0 && availableTerms.length > 0) {
        // Create a map of available terms for quick lookup
        const termMap = new Map(availableTerms.map(term => [String(term.id), term]));

        // Filter and map selected terms to include only those that exist in available terms
        const selectedTerms = rfqData.terms
          .map(term => {
            const termId = String(term.id || term.term_id);
            const fullTerm = termMap.get(termId);
            
            if (fullTerm) {
              return {
                id: parseInt(termId),
                term_content: fullTerm.term_content,
                name: fullTerm.name
              };
            }
            return null;
          })
          .filter(term => term !== null); // Remove any terms that weren't found

        // Update terms in rfqData
        rfqData.terms = selectedTerms;
        
        // Update Redux store with selected terms
        dispatch(setTermsData(selectedTerms));
      } else {
        // If no terms or available terms, ensure we have an empty array
        rfqData.terms = [];
        dispatch(setTermsData([]));
      }

      // getRfqById doesn't include mappedHotels — fetch them separately
      try {
        const rfqHotelRes = await getRFQHotels(id);
        rfqData.mappedHotels = rfqHotelRes?.data || [];
      } catch (_) {
        rfqData.mappedHotels = [];
      }

      setRfqData(rfqData);
      setProducts(rfqData?.products ?? []);

      // Pre-fill selected hotel IDs from mapped hotels
      if (rfqData.mappedHotels && rfqData.mappedHotels.length > 0) {
        setSelectedHotelIds(rfqData.mappedHotels.map(h => h.hotel_id));
      }

      // Extract country code and number from contact_number
      if (rfqData.contact_number) {
        let fullContactNumber = rfqData.contact_number.trim();
        
        // Extract using exact format: "+91-8583848726"
        const match = fullContactNumber.match(/^\+(\d+)-(\d+)$/);
        if (match) {
          const countryCode = "+"+match[1];  // "91"
          const phoneNumber = match[2];   // "8583848726"
          
          // Set the values exactly like View RFQ
          rfqData.contact_number = phoneNumber; // Store only the number part
          setonecountrycode(countryCode);
          
        } else {
          // If no match, try to clean the number
          rfqData.contact_number = fullContactNumber.replace(/[^0-9]/g, "");
        }
      }

      const storeData = {
        rfq_id: rfqData.id,
        rfq_form_data: {
          ...rfqData,
          term_and_condition_files: rfqData.term_and_condition_files || []
        },
        rfq_products: rfqData.products || []
      };

      dispatch(intializeRfq(storeData));

      termsInitializedRef.current = true;

      if (!isRefetch) {
        setInitialized(true);
        setInitialDataLoaded(true);
      }
    } catch (error) {
      setDataFetchError(error.message || `Failed to load ${getEntityLabel(rfqData?.is_tender)} data`);
      toast.error(`Failed to load ${getEntityLabel(rfqData?.is_tender)} data. Please try again.`);
      console.error("Error loading RFQ data:", error);
    } finally {
      setRfqLoading(false);
      setMainLoading(false);
    }
  };

  const handleFormFieldChange = (e, selectedOption, actionMeta = null) => {
    try {
      setHasUnsavedChanges(true);
      
      if (actionMeta && actionMeta.name && selectedOption) {
        dispatch(
          setOtherFormFields({
            [actionMeta.name]: selectedOption.value,
          })
        );
        return;
      }
      
      if (e && e.target) {
        let fieldName = e.target.name;
        let fieldValue = e.target.value;
        
        dispatch(
          setOtherFormFields({
            [fieldName]: fieldValue,
          })
        );
      }
    } catch (error) {
      console.error("Error updating form field:", error);
      toast.error("Failed to update field. Please try again.");
    }
  };

  const handleSpecChange = (product, change) => {
    setRfqData((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.product_id == change.product_id
          ? {
              ...product,
              product_specs: !product?.product_specs
                ? [
                    {
                      title: "variant",
                      value: product.variant,
                    },
                    {
                      title: change.title,
                      value: change.value,
                    },
                  ]
                : !product.product_specs.find(
                    (spec) => spec.title == change.title
                  )
                ? [
                    ...product.product_specs,
                    {
                      title: change.title,
                      value: change.value,
                    },
                  ]
                : product.product_specs.map((spec) =>
                    spec.title == change.title
                      ? { ...spec, value: change.value }
                      : spec
                  ),
            }
          : product
      ),
    }));
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          specs: {
            ...(prev.products.updatable?.specs ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.specs?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              [change.title]: change.value,
            },
          },
        },
      },
    }));
  };

  const handleFileChange = (product, change) => {
    setRfqData((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.product_id == change.product_id
          ? {
              ...product,
              [change.type]: change.value,
            }
          : product
      ),
    }));
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          files: {
            ...(prev.products.updatable?.files ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.files?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              [change.type]: change?.value.length > 0 ? change.value : "rm",
            },
          },
        },
      },
    }));
  };

  const handleCommentChange = (product, change) => {
    setRfqData((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.product_id == change.product_id
          ? {
              ...product,
              comment: change.value,
            }
          : product
      ),
    }));
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          comment: {
            ...(prev.products.updatable?.comment ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.comment?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              comment: change.value,
            },
          },
        },
      },
    }));
  };

  const handleClauseChange = (product, change) => {
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          techEval: {
            ...(prev.products.updatable?.techEval ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.techEval?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              techEval: [
                ...(prev.products.updatable?.techEval?.[product.id]?.techEval ??
                  []),
                change.action,
              ],
            },
          },
        },
      },
    }));
  };

  const handleShowVendorModal = (product, stateSetter) => {
    stateSetter(true);
    setSelectedProduct({
      product,
      vendors: product.vendor_details,
    });
  };

  const handleSyncApplyToOtherVariants = async () => {
    const sourceRfqProductId = selectedProduct.product.id?.toString();
    if (!sourceRfqProductId) return;

    const sourceVendorData = updatableData.vendors?.[sourceRfqProductId];

    const sourceDeletable = sourceVendorData?.deletable || [];
    const sourceAddable = sourceVendorData?.addable || [];
    const productId = selectedProduct.product?.product_id;

    // Ensure current vendors of source are loaded
    let sourceCurrentVendors = selectedProduct.vendors;

    // Simulate updated source vendor list
    const updatedSourceVendors = [
      ...sourceCurrentVendors
        .filter(v => !sourceDeletable.includes(v.user_id)),
      ...sourceAddable.map(id => ({ user_id: id }))
    ];

    const updatedSourceVendorIds = updatedSourceVendors.map(v => v.user_id);

    for (const rfqProduct of rfqData.products) {
      if (
        rfqProduct.product_id === productId &&
        rfqProduct.id.toString() !== sourceRfqProductId
      ) {
        const otherRfqProductId = rfqProduct.id.toString();

        // Ensure current vendors of target loaded
        let currentVendors = rfqData.products?.find(product => product.id == otherRfqProductId)?.vendor_details;

        const currentVendorIds = currentVendors.map(v => v.user_id);

        // Vendors that should be added to sync
        const syncAddable = updatedSourceVendorIds.filter(
          id => !currentVendorIds.includes(id)
        );

        // Vendors that should be removed to sync (those in current but not in updated source)
        const syncDeletable = currentVendorIds.filter(
          id => !updatedSourceVendorIds.includes(id)
        );

        // Ensure updatableData entry exists
        if (!updatableData.vendors[otherRfqProductId]) {
          updatableData.vendors[otherRfqProductId] = {
            product_id: rfqProduct.product_id,
            variant: rfqProduct.variant,
            deletable: [],
            addable: [],
          };
        }

        const otherVendorData = updatableData.vendors[otherRfqProductId];

        otherVendorData.deletable = [];
        otherVendorData.addable = [];

        otherVendorData.deletable = syncDeletable;
        otherVendorData.addable = syncAddable;
      }
    }
    toast.info("Success! The change has been applied across all product variants.");

  };

  const handleUpdateRFQ = async (formValues) => {
    try {
      if (!rfqData || !rfqData.id) {
        toast.error(`Original ${getEntityLabel(rfqData?.is_tender)} data not available`);
        return;
      }

      // Block update if any product has no vendors
      if (productsWithNoVendors.size > 0) {
        toast.error("At least one vendor is required for each product. Products without vendors cannot be submitted.");
        return;
      }

      // Project is optional
      const currentProjectId =
        formValues.project_id !== undefined && formValues.project_id !== null
          ? formValues.project_id
          : rfqData.project_id;

      const parsedProjectId =
        currentProjectId !== undefined &&
        currentProjectId !== null &&
        currentProjectId !== "" &&
        !isNaN(parseInt(currentProjectId))
          ? parseInt(currentProjectId)
          : null;

      if (
        rfqData.products.filter(product => !updatableData.products.deletable.includes(product.id)).some(
          (product) =>
            !product.product_specs ||
            product.product_specs.filter((spec)=>!['Size', 'Spec'].includes(spec.title)).some(
              (spec) =>
                !spec.value ||
                String(spec.value).trim().length <= 0 ||
                (spec.title == "Quantity" && !parseInt(spec.value))
            )
        )
      ) {
        toast.error(
          "Some products may be missing Quantity or Unit or mapped incorrectly, recheck and update again!"
        );
        return;
      }

      const cleanedUpdatableData = cleanUpdatableData(updatableData);

      const dataToSend = {
        updatableData: cleanedUpdatableData,
        rfq_id: rfqData.id,
        contact_name: formValues.contact_name || rfqData.contact_name,
        contact_number: formValues.contact_number,
        response_email: formValues.response_email || rfqData.response_email,
        bid_end_date: formValues.bid_end_date || rfqData.bid_end_date || "",
        status: formValues.status || rfqData.status || "",
        termsChanged,
        selectedTerms,
        title: formValues.title !== undefined ? formValues.title : rfqData.title || null,
        comment: formValues.comment !== undefined ? formValues.comment : rfqData.comment,
       };

      // Always include validated project_id (for both RFQ and Tender)
      dataToSend.project_id = parsedProjectId;

      // rfq_type (Firm/Budgetary) is only for RFQs, not tenders
      if (rfqData?.is_tender !== 1) {
        if (formValues.rfq_type && rfqTypes.some(type => formValues.rfq_type == type.value)) {
          dataToSend.rfq_type = formValues.rfq_type;
        } else if (rfqData.rfq_type) {
          dataToSend.rfq_type = rfqData.rfq_type;
        }
      }

      if (formValues.location) {
        dataToSend.location = formValues.location;
      } else if (rfqData.location) {
        dataToSend.location = rfqData.location;
      }

      if (!isNaN(Number(formValues.reverse_auction))) {
        dataToSend.reverse_auction = parseInt(formValues.reverse_auction);
      } else if (rfqData.reverse_auction) {
        dataToSend.reverse_auction = parseInt(rfqData.reverse_auction);
      }

      if (!isNaN(Number(formValues.is_tender))) {
        dataToSend.is_tender = parseInt(formValues.is_tender);
      } else if (rfqData.is_tender !== undefined) {
        dataToSend.is_tender = parseInt(rfqData.is_tender);
      }

      if(dataToSend.reverse_auction && (!formValues.ra_start_date || !formValues.ra_end_date)) {
        toast.error("Auction start and end date is required")
        return;
      }


      if (rfqData.ra_start_date != formValues.ra_start_date)
        dataToSend.ra_start_date = formValues.ra_start_date;
      
      if (rfqData.ra_end_date != formValues.ra_end_date)
        dataToSend.ra_end_date = formValues.ra_end_date;

      // Include publish date and vendor clarification date for both RFQs and tenders
      if (rfqFormDataFromStore.vendor_clarification_date != null)
        dataToSend.vendor_clarification_date = rfqFormDataFromStore.vendor_clarification_date;
      if (rfqFormDataFromStore.tender_publish_date != null)
        dataToSend.tender_publish_date = rfqFormDataFromStore.tender_publish_date;

      // Include hotel_ids for vendor recomputation on hotel change (skip if published to avoid validation error)
      if (rfqData?.is_published !== 1) {
        if (selectedHotelIds.length > 0) {
          dataToSend.hotel_ids = selectedHotelIds;
        } else if (rfqData.mappedHotels && rfqData.mappedHotels.length > 0) {
          dataToSend.hotel_ids = rfqData.mappedHotels.map(h => h.hotel_id);
        }
      }

  //  try {
     

  //    // Use strict() to prevent empty objects from passing
  //    await editRfqSchema
  //      .strict()
  //      .validate({ updatableData }, { abortEarly: false });
     
  //  } catch (validationError) {
  //    // FIXED: Use the caught validationError obje

  //    const errorMessages = validationError.inner
  //      .map((err) => err.message)
  //      .join("\n");
  //    toast.error(
  //      "Validation Error: " +
  //        (validationError.errors?.join(", ") || validationError.message)
  //    );
  //    return;
  //  }

      setLoading(true);

      // Submit the RFQ update
      updateRfq(dataToSend)
        .then((response) => {
          setLoading(false);
          
          // More flexible success detection
          const isSuccess = response && 
            (response.success === true || 
             response.status === 'success' || 
             response.status === 200 || 
             !response.error);
             
          if (isSuccess) {
            toast.info(`${getEntityLabel(rfqData?.is_tender)} has been updated, you can change something else or go back!`);

            // Handle vendor recomputation warnings after hotel change
            const recompResult = response?.data?.vendorRecomputationResult || response?.vendorRecomputationResult;
              if (recompResult && recompResult.recomputed) {
              if (recompResult.productsWithNoVendors && recompResult.productsWithNoVendors.length > 0) {
                const names = recompResult.productsWithNoVendors.map(p => p.product_name).filter(Boolean).join(', ');
                toast.warn(`Warning: Products ${names ? `'${names}'` : ''} have no eligible vendors for the selected business units`);
                setProductsWithNoVendors(new Set(recompResult.productsWithNoVendors.map(p => p.rfq_product_id)));
              } else {
                setProductsWithNoVendors(new Set());
              }
            }

            // Reset initialization flag so we'll re-initialize terms on fetch
            termsInitializedRef.current = false;
            
            // Update local state with the new values - use display format for UI
            setRfqData(prevData => ({
              ...prevData,
              contact_name: formValues.contact_name,
              // Store the FORMATTED version for display
              contact_number: formValues.contact_number,
              response_email: formValues.response_email,
              bid_end_date: formValues.bid_end_date,
              comment: formValues.comment !== undefined ? formValues.comment : prevData.comment,
              project_id: parsedProjectId,
              // Update auction dates if they were changed
              ra_start_date: formValues.ra_start_date || prevData.ra_start_date,
              ra_end_date: formValues.ra_end_date || prevData.ra_end_date,
              reverse_auction: formValues.reverse_auction || prevData.reverse_auction,
              // Keep original values
              // Preserve original terms
            }));
            
            // Clear and update the terms in Redux to prevent duplication
            dispatch(clearRfqState());
            
            // IMPORTANT: Update Redux store - use display format for UI
            dispatch(
              setOtherFormFields({
                contact_name: formValues.contact_name,
                // Store the FORMATTED version for display
                contact_number: formValues.contact_number,
                response_email: formValues.response_email,
                location: rfqData.location || '',
                bid_end_date: formValues.bid_end_date,
                comment: formValues.comment !== undefined ? formValues.comment : rfqData.comment,
                project_id: parsedProjectId,
                // Update auction dates in Redux store
                ra_start_date: formValues.ra_start_date || rfqData.ra_start_date,
                ra_end_date: formValues.ra_end_date || rfqData.ra_end_date,
                reverse_auction: formValues.reverse_auction || rfqData.reverse_auction,
                is_tender: formValues.is_tender !== undefined ? formValues.is_tender : (rfqData.is_tender || 0)
              })
            );
            
            // Set the preserved terms from dataToSend
            if (dataToSend.terms && dataToSend.terms.length > 0) {
              dispatch(setTermsData(dataToSend.terms));
            }
            
            // Navigate after success (without refetch to avoid race conditions)
            // fetchInitialData();
            setUpdatableData({
              products: {
                addable: [],
                deletable: [],
                updatable: {},
              },
              vendors: {},
            });
            setTimeout(() => {
              router.push("/dashboard/buyer/rfq-management");
            }, 100);

          } else {
            console.error("Update failed:", response);
            toast.error(response?.message || `Failed to update ${getEntityLabel(rfqData?.is_tender)}. Please check the form and try again.`);
          }
        })
        .catch((error) => {
          console.error("Error updating RFQ:", error);
          setLoading(false);
          
          if (error.response && error.response.data && error.response.data.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error(`Failed to update ${getEntityLabel(rfqData?.is_tender)}. Please check form fields and try again.`);
          }
        }).finally(() => 
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 10)
      );
        
    } catch (error) {
      setLoading(false);
      console.error("Error in handleUpdateRFQ:", error);
      toast.error(`An error occurred while updating the ${getEntityLabel(rfqData?.is_tender)}: ` + (error.message || "Unknown error"));
    }
  };

  const handleUpdateConfirm = () => {
    if (pendingFormValues) {
      handleUpdateRFQ(pendingFormValues);
      setShowUpdateConfirmModal(false);
      setPendingFormValues(null);
    }
  };

  const handleUpdateCancel = () => {
    setShowUpdateConfirmModal(false);
    setPendingFormValues(null);
  };


  const handleSelectProduct = (product) => {
    setProductAddData(prev => ({
      ...prev,
      variant_id: product.variant_id,
    }))
    setSelectedProduct(prev => ({
      product,
      vendors: [],
    }))
    setShowAddProductModal(false);
    setShowAddSpecModal(true);
  }

  const handleAddSpec = (specData) => {
    if (
      Object.entries(specData).some(
        ([key, value]) =>
          !value ||
          String(value).trim().length <= 0 ||
          (key == "Quantity" && !parseInt(value))
      )
    )
      return toast.error("Invalid Quantity or Unit!");

    setProductAddData((prev) => ({
      ...prev,
      specs: {
        ...prev.specs,
        ...specData,
      },
    }));
    setShowAddSpecModal(false);
    // Directly add the product with auto-mapped vendors (no vendor modal step)
    handleAddProduct(specData);
  };

  const handleAddProduct = async (specData) => {
    if(!rfqData || !rfqData.id) return;

    const hotel_ids = selectedHotelIds.length > 0
      ? selectedHotelIds
      : rfqData.mappedHotels
        ? rfqData.mappedHotels.map(h => h.hotel_id)
        : [];

    const payload = {
      rfqId: rfqData.id,
      variant_id: productAddData.variant_id,
      specs: specData || productAddData.specs,
      hotel_ids,
      is_tender: rfqData.is_tender,
    }

    try {
      const data = await addProductToExistingRfq(payload)
      await fetchInitialData()
      const vendorCount = data?.vendor_count ?? 0;
      if (vendorCount > 0) {
        toast.success(`Product added with ${vendorCount} vendor(s)`);
      } else {
        toast.warn("Product added but no eligible vendors found for the selected business units");
        setProductsWithNoVendors(prev => {
          const next = new Set(prev);
          if (data?.rfqProductId) next.add(data.rfqProductId);
          return next;
        });
      }
      setProductAddData({
        variant_id: -1,
        specs: {
          quantity: 1,
          unit: 'nos',
        },
      })
      setUpdatableData(prev => ({
        ...prev,
        products: {
          ...prev.products,
          addable: [...prev.products.addable, data.rfqProductId]
        }
      }))
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to add product";
      toast.error(errorMsg);
    }
  }


  const handleRemoveExistingVendor = (item) => {
    const totalVendors = rfqData.products?.find(
      (product) => product.id === selectedProduct.product.id)?.vendor_details?.length || 0;

    const deletableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.deletable ?? []).length + 1;
    const addableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.addable ?? []).length;

    if (
      totalVendors + addableVendors - deletableVendors <= 0
    ) {
      toast.error(
        "At least one vendor is required for the product"
      );
      return;
    }
    
    setUpdatableData((prev) => ({
      ...prev,
      vendors: {
        ...prev.vendors,
        [selectedProduct.product.id]: {
          ...(prev.vendors?.[selectedProduct.product.id] ?? {
            product_id: selectedProduct.product.product_id,
            variant: selectedProduct.product.variant,
          }),
          deletable: [
            ...(prev.vendors?.[selectedProduct.product.id]?.deletable ?? []),
            item.user_id,
          ],
        },
      },
    }));
  }
    
    const handleRestoreExistingVendor = (item) =>
      setUpdatableData((prev) => ({
        ...prev,
        vendors: {
          ...prev.vendors,
          [selectedProduct.product.id]: {
            ...(prev.vendors?.[selectedProduct.product.id] ?? {
              product_id: selectedProduct.product.product_id,
              variant: selectedProduct.product.variant,
            }),
            deletable: (
              prev.vendors?.[selectedProduct.product.id]?.deletable ?? []
            ).filter((deletableVendorId) => deletableVendorId != item.user_id),
          },
        },
      }));

    const handleAddVendor = (item) =>
      setUpdatableData((prev) => ({
        ...prev,
        vendors: {
          ...prev.vendors,
          [selectedProduct.product.id]: {
            ...(prev.vendors?.[selectedProduct.product.id] ?? {
              product_id: selectedProduct.product.product_id,
              variant: selectedProduct.product.variant,
            }),
            addable: [
              ...(prev.vendors?.[selectedProduct.product.id]?.addable ?? []),
              item.id,
            ],
          },
        },
      }));

    const handleRemoveAddedVendor = (item) => {
      const totalVendors = rfqData.products?.find(
        (product) => product.id === selectedProduct.product.id)?.vendor_details?.length || 0;

      const deletableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.deletable ?? []).length + 1;
      const addableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.addable ?? []).length;

      if (
        totalVendors + addableVendors - deletableVendors <= 0
      ) {
        toast.error(
          "At least one vendor is required for the product"
        );
        return;
      }
      
      setUpdatableData((prev) => ({
        ...prev,
        vendors: {
          ...prev.vendors,
          [selectedProduct.product.id]: {
            ...(prev.vendors?.[selectedProduct.product.id] ?? {
              product_id: selectedProduct.product.product_id,
              variant: selectedProduct.product.variant,
            }),
            addable: (
              prev.vendors?.[selectedProduct.product.id]?.addable ?? []
            ).filter((deletableVendorId) => deletableVendorId != item.id),
          },
        },
      }));
    }

  // Render product table
  const renderDeletedProductsTable = () => {
    
    if (!updatableData.products?.deletable || updatableData.products?.deletable.length === 0) {
      return;
    }
    
    return (
      <div className="details-table mt-4">
        <div className="table-responsive">
          <h4>Deleted Products</h4>
          <table className="border">
            <thead>
              <tr>
                <th>Name Of Product</th>
                <th>Size & Specifications</th>
                <th>Quantity</th>
                <th>TDS</th>
                <th>QAP</th>
                <th>Comments</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(
                products.filter((product) =>
                  updatableData.products?.deletable?.includes(product.id)
                ) ?? []
              ).length > 0 ? (
                products
                  .filter((product) =>
                    updatableData.products?.deletable?.includes(product.id)
                  )
                  .map((product, index) => {
                    return (
                      <tr key={`product-${index}`}>
                        <td>{product.product_details?.[0]?.name || "---"}</td>
                        <td>
                          <div className="size-specification">
                            Size: {product.size || "---"}
                            <br />
                            Spec:{" "}
                            {product.product_specs
                              ?.map((s) => `${s.title}: ${s.value}`)
                              .join(", ") || "---"}
                          </div>
                        </td>
                        <td>
                          {(() => {
                            // Try to extract from the spec text that's visible in the UI
                            const specText =
                              product.product_specs
                                ?.map((s) => `${s.title}: ${s.value}`)
                                .join(", ") || "";

                            // Look for Quantity: X pattern in the spec text
                            const quantityMatch =
                              specText.match(/Quantity:\s*(\d+)/i);
                            const quantity = quantityMatch
                              ? quantityMatch[1]
                              : null;

                            // Look for Unit: X pattern in the spec text
                            const unitMatch = specText.match(/Unit:\s*(\w+)/i);
                            const unit = unitMatch ? unitMatch[1] : "NB";

                            // If we found quantity and unit in the text, use them
                            if (quantity && unit) {
                              return `${quantity}-${unit}`;
                            }

                            // Try extracting from original spec array if available
                            const quantitySpec = product.spec?.find(
                              (s) => s.title === "Quantity"
                            );
                            const unitSpec = product.spec?.find(
                              (s) => s.title === "Unit"
                            );

                            if (quantitySpec?.value && unitSpec?.value) {
                              return `${quantitySpec.value}-${unitSpec.value}`;
                            }

                            // Fallback to product quantity and hardcoded unit if spec not available
                            return product.quantity
                              ? `${product.quantity}-${product.unit || "NB"}`
                              : "---";
                          })()}
                        </td>
                        <td>
                          {product.datasheet_file?.length > 0
                            ? "Available"
                            : "N/A"}
                        </td>
                        <td>
                          {product.qap_file?.length > 0 ? "Available" : "N/A"}
                        </td>
                        <td>{product.comment || "---"}</td>
                        <td>
                          <button
                            onClick={() => {
                              setUpdatableData((prev) => ({
                                ...prev,
                                products: {
                                  ...prev.products,
                                  deletable: (
                                    prev.products?.deletable ?? []
                                  ).filter(
                                    (productId) => productId != product.id
                                  ),
                                },
                              }));
                            }}
                            className="default-btn"
                            id={`restore_product_${product.id}-product_actions-edit_rfq_page`}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">
                    No products found
                  </td>
                </tr>
              )}
              <ViewVendorModal
                productData={selectedProduct}
                updatableData={updatableData}
                isOpen={showVendorModal}
                onClose={() => setShowVendorModal(false)}
                onAdd={(item) => {
                 
                  if (
                    (
                      updatableData.vendors?.[selectedProduct.product.id]
                        ?.deletable ?? []
                    ).length +
                      1 +
                      (
                        updatableData.vendors?.[selectedProduct.product.id]
                          ?.addable ?? []
                      ).length <
                    1
                  ) {
                    toast.error(
                      "At least one vendor is required for the product"
                    );
                    return;
                  }
                  setUpdatableData((prev) => ({
                    ...prev,
                    vendors: {
                      ...prev.vendors,
                      [selectedProduct.product.id]: {
                        ...(prev.vendors?.[selectedProduct.product.id] ?? {
                          product_id: selectedProduct.product.product_id,
                          variant: selectedProduct.product.variant,
                        }),
                        deletable: [
                          ...(prev.vendors?.[selectedProduct.product.id]
                            ?.deletable ?? []),
                          item.user_id,
                        ],
                      },
                    },
                  }))
                }
                }
                onRemove={(item) => {
                  setUpdatableData((prev) => ({
                    ...prev,
                    vendors: {
                      ...prev.vendors,
                      [selectedProduct.product.id]: {
                        ...(prev.vendors?.[selectedProduct.product.id] ?? {
                          product_id: selectedProduct.product.product_id,
                          variant: selectedProduct.product.variant,
                        }),
                        deletable: (
                          prev.vendors?.[selectedProduct.product.id]?.deletable ??
                          []
                        ).filter(
                          (deletableVendorId) => deletableVendorId != item.user_id
                        ),
                      },
                    },
                  }))
                }
                }
              />
              <AddVendorModal
                headerTitle={`Add Vendor in ${selectedProduct?.product?.name}`}
                vendors={vendors}
                productData={selectedProduct}
                updatableData={updatableData}
                isOpen={showAddVendorModal}
                onClose={() => setShowAddVendorModal(false)}
                onAdd={(item) =>
                  setUpdatableData((prev) => ({
                    ...prev,
                    vendors: {
                      ...prev.vendors,
                      [selectedProduct.product.id]: {
                        ...(prev.vendors?.[selectedProduct.product.id] ?? {
                          product_id: selectedProduct.product.product_id,
                          variant: selectedProduct.product.variant,
                        }),
                        addable: [
                          ...(prev.vendors?.[selectedProduct.product.id]
                            ?.addable ?? []),
                          item.id,
                        ],
                      },
                    },
                  }))
                }
                onRemove={(item) =>
                  setUpdatableData((prev) => ({
                    ...prev,
                    vendors: {
                      ...prev.vendors,
                      [selectedProduct.product.id]: {
                        ...(prev.vendors?.[selectedProduct.product.id] ?? {
                          product_id: selectedProduct.product.product_id,
                          variant: selectedProduct.product.variant,
                        }),
                        addable: (
                          prev.vendors?.[selectedProduct.product.id]?.addable ??
                          []
                        ).filter(
                          (deletableVendorId) => deletableVendorId != item.id
                        ),
                      },
                    },
                  }))
                }
              />
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Handle loading state
  if (mainLoading || rfqLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
        <Loader size="lg" />
      </div>
    );
  }

  // Handle error state
  if (dataFetchError) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          <p><strong>Error loading RFQ data:</strong> {dataFetchError}</p>
          <button 
            className="btn btn-primary mt-3" 
            onClick={() => window.location.reload()}
            id="reload_page-error_actions-edit_rfq_page"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Make sure we have data before rendering the form
  if (!initialized || !rfqData) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          <p>Unable to load {getEntityLabel(rfqData?.is_tender)} data. Please try again.</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            id="reload_page_loading-error_actions-edit_rfq_page"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Handle permission loading state
  if (permissionsLoading && hotelIds.length > 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
        <Loader size="lg" />
        <span className="ms-2">Checking permissions...</span>
      </div>
    );
  }

  // Handle access denied (no read permission)
  if (hotelIds.length > 0 && !permissionsLoading && !canRead) {
    return (
      <div style={{ paddingTop: 80, paddingLeft: 'clamp(16px, 3vw, 40px)', paddingRight: 'clamp(16px, 3vw, 40px)' }}>
        <AccessDeniedPage
          title="Access Denied"
          message={`You do not have permission to view this ${getEntityLabel(rfqData?.is_tender)}. This may be because you are not assigned to the business units associated with this ${getEntityLabel(rfqData?.is_tender)}.`}
        />
      </div>
    );
  }

  const handleRefreshPreview = async () => {
    setRefreshStep('loading');
    try {
      const res = await previewRefreshVendors(rfqData.id);
      setRefreshCount(res?.data?.totalAvailable || 0);
      setRefreshStep('result');
    } catch {
      toast.error("Failed to check for new vendors");
      setShowRefreshModal(false);
      setRefreshStep('confirm');
    }
  };

  const handleRefreshConfirm = async () => {
    setRefreshStep('applying');
    try {
      await refreshVendors(rfqData.id);
      setRefreshStep('done');
    } catch {
      toast.error("Failed to add vendors");
      setShowRefreshModal(false);
      setRefreshStep('confirm');
    }
  };

  const handleRefreshClose = () => {
    const wasDone = refreshStep === 'done';
    setShowRefreshModal(false);
    setRefreshStep('confirm');
    setRefreshCount(0);
    if (wasDone) fetchInitialData();
  };

  const entityLabel = getEntityLabel(rfqData?.is_tender);

  return (
    <>
      <div className="bg-dark-blue text-white p-3 mb-4">
        <div className="container-fluid">
          <h1 className="fs-4 m-0">Edit {entityLabel} #{rfqData?.rfq_no}</h1>
        </div>
      </div>

      {/* Read-only banner - Show when user has read but not update permission */}
      {hotelIds.length > 0 && !canUpdate && canRead && (
        <ReadOnlyBanner
          title="View Only Mode"
          message={`You don't have edit permissions for this ${getEntityLabel(rfqData?.is_tender).toLowerCase()}. Contact your administrator to request access.`}
        />
      )}

      <div className="container-fluid mb-4">
        <div className="d-flex">
          <Link href="/dashboard/buyer/rfq-management" className="me-2 text-decoration-none text-muted">
            Manage Tender / RFQs
          </Link>
          <span className="text-primary">Edit {getEntityLabel(rfqData?.is_tender)}</span>
        </div>
      </div>

      <div className="container-fluid">
        {/* Products table */}
        <div style={{
          borderRadius: 0
        }} className="mb-4">
          <div className="mb-3 d-flex align-items-center justify-content-between">
            <h4 className="mb-0">{getEntityLabel(rfqData?.is_tender)} #{rfqData?.rfq_no} details</h4>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', border: '1px solid #000080', borderRadius: 6,
                background: '#fff', color: '#000080', fontWeight: 500, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onClick={() => setShowRefreshModal(true)}
              onMouseEnter={e => { e.currentTarget.style.background = '#000080'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000080'; }}
              id="refresh_vendors-rfq_actions-edit_rfq_page"
            >
              <BsArrowRepeat size={14} /> Refresh Vendors
            </button>
          </div>
          {/* <div className="p-0">
            {rfqLoading ? (
              <div className="text-center p-4">
                <Loader size="sm" />
                <p className="mt-2">Loading product details...</p>
              </div>
            ) : (
              renderProductTable()
            )}
          </div> */}

          <div
            className=""
            style={{
              height: "fit-content",
              background: "#ffffa",
              border: "2px solid #CCCCCC",
              borderRadius: "10px",
              padding: "10px",
            }}
          >
            <Accordion alwaysOpen flush defaultActiveKey="" activeKey={activeKey} onSelect={(k) => setActiveKey(k)}>
              {rfqData.products &&
                rfqData.products.length > 0 &&
                rfqData.products.map((product) => {
                  if (updatableData.products.deletable.includes(product.id)) {
                    return null;
                  }
                  return (
                    <React.Fragment key={`product-wrapper-${product.id}`}>
                    {productsWithNoVendors.has(product.id) && (
                      <small className="text-danger fw-bold d-block mb-1">
                        No eligible vendors for selected business units
                      </small>
                    )}
                    <Item
                      is_tender={rfqData?.is_tender}
                      // vendorApprovedList={vendorApprovedList}
                      vendors={product.vendor_details}
                      activeKey={activeKey}
                      data={(() => {
                        const productObj = product;
                        const updatedObj = {
                          ...productObj,
                          spec: productObj.product_specs,
                        };

                        delete updatedObj.product_specs;

                        return updatedObj;
                      })()}
                      updatableData={updatableData}
                      rfq_id={rfqData.id}
                      setHasUnsavedChanges={setHasUnsavedChanges}
                      getDraftInitialData={fetchInitialData}
                      saveDraft={() => {}}
                      pageRoute="edit_rfq_page"
                      onSpecValueChange={(change) => {
                        setRfqData((prev) => ({
                          ...prev,
                          products: prev.products.map((product) =>
                            product.product_id == change.product_id && product.variant == change.variant
                              ? {
                                  ...product,
                                  product_specs: !product?.product_specs
                                    ? [
                                        {
                                          title: 'variant',
                                          value: product.variant,
                                        },
                                        {
                                          title: change.title,
                                          value: change.value,
                                        },
                                      ]
                                    : !product.product_specs.find(
                                        (spec) => spec.title == change.title
                                      )
                                    ? [
                                        ...product.product_specs,
                                        {
                                          title: change.title,
                                          value: change.value,
                                        },
                                      ]
                                    : product.product_specs.map((spec) =>
                                        spec.title == change.title
                                          ? { ...spec, value: change.value }
                                          : spec
                                      ),
                                }
                              : product
                          ),
                        }));
                        setUpdatableData(prev => ({
                          ...prev,
                          products: {
                            ...prev.products,
                            updatable: {
                              ...(prev.products.updatable),
                              specs: {
                                ...(prev.products.updatable?.specs ?? {}),
                                [product.id]: {
                                  ...(prev.products.updatable?.specs?.[product.id] ?? {
                                    product_id: product.product_id,
                                    variant: product.variant,
                                  }),
                                  [change.title]: change.value,
                                }
                              }
                            }
                          }
                        }))
                      }}
                      onFilesChange={(change) => {
                        setRfqData((prev) => ({
                          ...prev,
                          products: prev.products.map((product) =>
                            product.product_id == change.product_id && product.variant == change.variant
                              ? {
                                  ...product,
                                  [change.type]: change.value
                                }
                              : product
                          ),
                        }));
                        setUpdatableData(prev => ({
                          ...prev,
                          products: {
                            ...prev.products,
                            updatable: {
                              ...prev.products.updatable,
                              files: {
                                ...(prev.products.updatable?.files ?? {}),
                                [product.id]: {
                                  ...(prev.products.updatable?.files?.[product.id] ?? {
                                    product_id: product.product_id,
                                    variant: product.variant,
                                  }),
                                  [change.type]: change?.value.length > 0 ? change.value : 'rm',
                                }
                              }
                            }
                          }
                        }))
                      }}
                      onCommentChange={(change) => {
                        setRfqData((prev) => ({
                          ...prev,
                          products: prev.products.map((product) =>
                            product.product_id == change.product_id && product.variant == change.variant
                              ? {
                                  ...product,
                                  comment: change.value
                                }
                              : product
                          ),
                        }));
                        setUpdatableData(prev => ({
                          ...prev,
                          products: {
                            ...prev.products,
                            updatable: {
                              ...prev.products.updatable,
                              comment: {
                                ...(prev.products.updatable?.comment ?? {}),
                                [product.id]: {
                                  ...(prev.products.updatable?.comment?.[product.id] ?? {
                                    product_id: product.product_id,
                                    variant: product.variant,
                                  }),
                                  comment: change.value,
                                }
                              }
                            }
                          }
                        }))
                      }}
                      onClauseChange={(change) => {
                        setUpdatableData(prev => ({
                          ...prev,
                          products: {
                            ...prev.products,
                            updatable: {
                              ...prev.products.updatable,
                              techEval: {
                                ...(prev.products.updatable?.techEval ?? {}),
                                [product.id]: {
                                  ...(prev.products.updatable?.techEval?.[product.id] ?? {
                                    product_id: product.product_id,
                                    variant: product.variant,
                                  }),
                                  techEval: [...(prev.products.updatable?.techEval?.[product.id]?.techEval ?? []), change.action],
                                }
                              }
                            }
                          }
                        }))
                      }}
                      handleViewVendorInEdit={null}
                      handleAddVendorInEdit={null}
                      handleRemoveProductInEdit={(data) => {
                        if((updatableData.products.deletable.length + 1) === rfqData?.products?.length)
                          toast.warning(`You cannot delete all products from ${getEntityLabel(rfqData?.is_tender)}, at least one product is required`);
                        else
                        setUpdatableData((prev) => ({
                          ...prev,
                          products: {
                            ...prev.products,
                            deletable: [
                              ...(prev.products?.deletable ?? []),
                              data.id,
                            ],
                          },
                        }));
                      }}
                      type="edit"
                      readOnly={hotelIds.length > 0 && !canUpdate}
                    />
                    </React.Fragment>
                  );
                })}
            </Accordion>
          </div>
          {renderDeletedProductsTable()}
        </div>
        {/* Add Product button - disabled if user doesn't have permission */}
        <div className="mb-4 d-flex justify-content-end">
          <button
            onClick={() => setShowAddProductModal(true)}
            className="btn btn-primary btn-sm"
            id="add_product-product_actions-edit_rfq_page"
            disabled={hotelIds.length > 0 && !canUpdate}
            title={hotelIds.length > 0 && !canUpdate ? "You don't have permission to add products" : ""}
          >
            Add A Product
          </button>
        </div>

        {initialDataLoaded ? (
          <Formik
            initialValues={{
              company_name: rfqFormDataFromStore.company_name || "",
              contact_name: rfqFormDataFromStore.contact_name || "",
              // Only use the number part, without country code (country code is in a separate dropdown)
              contact_number: rfqFormDataFromStore.contact_number || "",
              response_email: rfqFormDataFromStore.response_email || "",
              location: rfqData.location || " ", // Use original location with non-empty fallback
              bid_end_date: rfqFormDataFromStore.bid_end_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.bid_end_date) : "",
              comment: rfqFormDataFromStore.comment || "",
              rfq_type: rfqFormDataFromStore.rfq_type || "",
              is_tender: rfqFormDataFromStore.is_tender || 0,
              title: rfqFormDataFromStore.title || "",
            }}
            validationSchema={EditRFQSchema}
            enableReinitialize={true}
            onSubmit={(values) => {
              const updatedFormData = {
                ...rfqFormDataFromStore,
                contact_name: values.contact_name,
                // IMPORTANT: Send ONLY digits to backend - exactly how View RFQ works
                contact_number: onecountrycode + "-" +values.contact_number,
                response_email: values.response_email,
                bid_end_date: values.bid_end_date,
                comment: values.comment !== undefined ? values.comment : rfqFormDataFromStore.comment,
              };
              setPendingFormValues(updatedFormData);
              setShowUpdateConfirmModal(true);
            }}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue }) => (
              <Form onSubmit={handleSubmit}>
                <fieldset disabled={hotelIds.length > 0 && !canUpdate}>
                <div className="card mb-4">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">{getEntityLabel(rfqData?.is_tender)} Information</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      {/* Company Name - Read Only */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium">Company Name</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={rfqFormDataFromStore.company_name || rfqData.company_name || ""}
                            disabled
                          />
                        </div>
                      </div>

                      {/* Contact Name */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium">Contact Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            name="contact_name"
                            className={`form-control ${
                              touched.contact_name && errors.contact_name
                                ? "is-invalid"
                                : ""
                            }`}
                            value={values.contact_name}
                            onChange={(e) => {
                              handleChange(e);
                              handleFormFieldChange(e);
                            }}
                            onBlur={handleBlur}
                          />
                          {touched.contact_name && errors.contact_name && (
                            <div className="invalid-feedback d-block">
                              {errors.contact_name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* RFQ/Tender Title */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium">{rfqFormDataFromStore.is_tender === 1 ? 'Tender' : 'RFQ'} Title <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            name="title"
                            className="form-control"
                            value={rfqFormDataFromStore.title || ""}
                            onChange={(e) => {
                              handleChange(e);
                              handleFormFieldChange(e);
                            }}
                            placeholder={`Enter ${rfqFormDataFromStore.is_tender === 1 ? 'Tender' : 'RFQ'} Title`}
                          />
                          {touched.title && errors.title && (
                            <div className="invalid-feedback d-block">
                              {errors.title}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quote Submission Deadline */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium">Quote Submission Deadline <span className="text-danger">*</span></label>
                          <input
                            type="datetime-local"
                            name="bid_end_date"
                            className="form-control"
                            value={values.bid_end_date ? formatISOToDateTimeLocal(values.bid_end_date) : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const formatted = val.includes('T') ? val.replace('T', ' ') : val;
                              if (formatted && rfqFormDataFromStore.vendor_clarification_date) {
                                if (new Date(formatted) <= new Date(rfqFormDataFromStore.vendor_clarification_date)) {
                                  toast.warning("Quote Submission End Date is now on or before the Clarification End Date. Please update it.");
                                }
                              }
                              setFieldValue('bid_end_date', formatted);
                              handleFormFieldChange({ target: { name: 'bid_end_date', value: formatted } });
                            }}
                            onBlur={handleBlur}
                          />
                          {touched.bid_end_date && errors.bid_end_date && (
                            <div className="invalid-feedback d-block">
                              {errors.bid_end_date}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Number */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium">
                            Contact Number <span className="text-danger">*</span>
                          </label>
                          <div className="d-flex">
                            <select
                              name="countryCode"
                              className="form-select"
                              style={{
                                maxWidth: "130px",
                                marginRight: "6px",
                                maxHeight: "44px",
                              }}
                              value={onecountrycode}
                              onChange={(e) => {
                                setonecountrycode(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                            >
                              {countryCode.map((country) => (
                                <option
                                  key={country.id}
                                  value={country.phone_code}
                                >
                                  {country.country_code} ({country.phone_code})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              name="contact_number"
                              className={`form-control ${
                                touched.contact_number && errors.contact_number
                                  ? "is-invalid"
                                  : ""
                              }`}
                              placeholder="Enter mobile number"
                              value={values.contact_number}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                setFieldValue('contact_number', numericValue);
                                dispatch(
                                  setOtherFormFields({
                                    contact_number: numericValue
                                  })
                                );
                                setHasUnsavedChanges(true);
                              }}
                              onBlur={handleBlur}
                            />
                          </div>
                          {touched.contact_number && errors.contact_number && (
                            <div className="invalid-feedback d-block">
                              {errors.contact_number}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Response Email */}
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium">Response Email <span className="text-danger">*</span></label>
                          <input
                            type="email"
                            name="response_email"
                            className="form-control"
                            value={values.response_email}
                            onChange={(e) => {
                              handleChange(e);
                              handleFormFieldChange(e);
                            }}
                            onBlur={handleBlur}
                          />
                          {touched.response_email && errors.response_email && (
                            <div className="invalid-feedback d-block">
                              {errors.response_email}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Select Business Units */}
                      {userHotelMappings.length > 0 && (
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label fw-medium">Business Units</label>
                            <Select
                              id="select_hotels-edit_rfq_page"
                              isMulti
                              options={userHotelMappings}
                              value={userHotelMappings.filter(opt =>
                                selectedHotelIds.includes(opt.hospitality_hotel_id)
                              )}
                              onChange={(selectedOptions) => {
                                const ids = selectedOptions
                                  ? selectedOptions.map(opt => opt.hospitality_hotel_id)
                                  : [];
                                setSelectedHotelIds(ids);
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Select Business Units..."
                              closeMenuOnSelect={false}
                              classNamePrefix="react-select"
                              isClearable={rfqData?.is_published !== 1}
                              isDisabled={rfqData?.is_published === 1}
                              formatOptionLabel={(option) => (
                                <div>
                                  <span>{option.hotel_name}</span>
                                </div>
                              )}
                              getOptionValue={(option) => option.hospitality_hotel_id}
                            />
                          </div>
                        </div>
                      )}

                      {rfqData?.is_tender !== 1 && (
                      <div className="col-md-6">
                        {/* RFQ Type - only for RFQs, not tenders */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">RFQ Type</label>
                          <Select
                            options={rfqTypes}
                            value={(() => {
                              if (!rfqFormDataFromStore.rfq_type) return null;
                              const rfqType = rfqFormDataFromStore.rfq_type;
                              const match = rfqTypes.find(p => p.value === rfqType);
                              return match || null;
                            })()}
                            onChange={(selectedOption) => {
                              const rfqType = selectedOption ? selectedOption.value : null;
                              dispatch(setOtherFormFields({ rfq_type: rfqType }));
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Select Rfq Type"
                            className="basic-select"
                            classNamePrefix="select"
                            isClearable={true}
                          />
                        </div>
                      </div>
                      )}

                      <div className="col-md-6">
                        {/* Reverse Auction */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">Reverse Auction</label>
                          <Select
                            options={binaryType}
                            value={(() => {
                              const reverseAuction = parseInt(rfqFormDataFromStore.reverse_auction);
                              const match = binaryType.find(p => p.value == reverseAuction);
                              return match ?? null;
                            })()}
                            onChange={(selectedOption) => {
                              const reverseAuction = selectedOption ? parseInt(selectedOption.value) : null;
                              dispatch(setOtherFormFields({ reverse_auction: reverseAuction }));
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Select Reverse Auction"
                            className="basic-select"
                            classNamePrefix="select"
                            isClearable={true}
                          />
                        </div>
                      </div>

                      {/* Publish Date & Time */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Publish Date & Time</label>
                        <input
                          type="datetime-local"
                          name="tender_publish_date"
                          className="form-control"
                          disabled
                          title="Publish date cannot be changed after creation"
                          style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                          value={rfqFormDataFromStore.tender_publish_date
                            ? formatISOToDateTimeLocal(rfqFormDataFromStore.tender_publish_date)
                            : ""}
                        />
                      </div>

                      {/* Vendor Clarification Deadline */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Vendor Clarification Deadline</label>
                        <input
                          type="datetime-local"
                          name="vendor_clarification_date"
                          className="form-control"
                          value={rfqFormDataFromStore.vendor_clarification_date
                            ? formatISOToDateTimeLocal(rfqFormDataFromStore.vendor_clarification_date)
                            : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const formatted = val ? `${val.replace("T", " ")}:00` : "";
                            if (formatted && rfqFormDataFromStore.bid_end_date) {
                              if (new Date(formatted) >= new Date(rfqFormDataFromStore.bid_end_date)) {
                                toast.error("Clarification End Date must be before the Quote Submission End Date.");
                                return;
                              }
                            }
                            dispatch(setOtherFormFields({ vendor_clarification_date: formatted || null }));
                            setHasUnsavedChanges(true);
                          }}
                        />
                      </div>

                      {(departments.length > 0 || rfqFormDataFromStore.department_id) && (
                        <div className="col-md-6">
                          {/* Department */}
                          <div className="mb-3">
                            <label className="form-label fw-medium">Department</label>
                            <Select
                              options={departments}
                              value={departments.find(d => d.value === rfqFormDataFromStore.department_id) || null}
                              onChange={(selected) => {
                                dispatch(setOtherFormFields({
                                  field_name: "department_id",
                                  value: selected?.value || null
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Select Department"
                              className="basic-select"
                              classNamePrefix="select"
                              isClearable={rfqData?.is_published !== 1}
                              isDisabled={rfqData?.is_published === 1}
                            />
                          </div>
                        </div>
                      )}

                      {
                        !!rfqFormDataFromStore.reverse_auction && parseInt(rfqFormDataFromStore.reverse_auction) && (
                          <>
                            <div className="col-md-6">  
                              <div className="mb-3">
                                <label className="form-label fw-medium">Auction Start Date & Time</label>
                                <input
                                  type="datetime-local"
                                  name="ra_start_date"
                                  className="form-control"
                                  value={formatISOToDateTimeLocal(rfqFormDataFromStore.ra_start_date)}
                                  onChange={handleFormFieldChange}
                                  min={rfqFormDataFromStore.bid_end_date
                                    ? formatISOToDateTimeLocal(rfqFormDataFromStore.bid_end_date)
                                    : new Date().toISOString().slice(0, 16)
                                  }
                                />
                              </div>
                            </div>  
                            <div className="col-md-6">  
                              <div className="mb-3">
                                <label className="form-label fw-medium">Auction End Date & Time</label>
                                <input
                                  type="datetime-local"
                                  name="ra_end_date"
                                  className="form-control"
                                  value={formatISOToDateTimeLocal(rfqFormDataFromStore.ra_end_date)}
                                  onChange={handleFormFieldChange}
                                  min={rfqFormDataFromStore.ra_start_date
                                    ? formatISOToDateTimeLocal(rfqFormDataFromStore.ra_start_date)
                                  : ""}
                                  disabled={!rfqFormDataFromStore.ra_start_date}
                                />
                              </div>
                            </div>  
                          </>
                        )
                      }

                      {/* Delivery Location - Full Width - Now Read Only */}
                      <div className="col-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium">Delivery Location  </label>
                          <input
                            type="text"
                            name="location"
                            className="form-control"
                            value={rfqFormDataFromStore.location}
                            onChange={handleFormFieldChange}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium">{getEntityLabel(rfqData?.is_tender)} Status  </label>
                          <Select
                            options={statusType}
                            value={(() => {
                              const rfqStatus = parseInt(rfqFormDataFromStore.status);
                              const match = statusType.find(p => p.value == rfqStatus);
                              return match ?? null;
                            })()}
                            onChange={(selectedOption) => {
                              const rfqStatus = selectedOption ? parseInt(selectedOption.value) : null;
                              dispatch(setOtherFormFields({ status: rfqStatus }));
                              setHasUnsavedChanges(true);
                            }}
                            placeholder={`Select ${getEntityLabel(rfqData?.is_tender)} Status`}
                            className="basic-select"
                            classNamePrefix="select"
                            isClearable={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Terms & Conditions - Now Read Only */}
                <div className="card mb-4">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">Terms & Conditions</h5>
                  </div>
                  <div className="card-body">
                    {/* Selected Terms Display */}
                    <div className="mb-4">
                      <h6 className="mb-3 fw-medium">Selected Terms  </h6>
                      <div className="terms-list border rounded p-3">
                        {selectedTerms && selectedTerms.length > 0 ? (
                          <ol style={{
                            listStyle: 'none',
                            paddingLeft: 8,
                          }}>
                            {allTerms.map((item) => {
                              // Use consistent term content extraction
                              const termContent =
                                item.term_content ||
                                item.name ||
                                item.term_text ||
                                (item.content &&
                                  Array.isArray(item.content) &&
                                  item.content[0]?.title) ||
                                `Term ${item.id}`;

                              // Check if term is selected using consistent ID comparison
                              const isSelected = selectedTerms?.some(
                                (term) =>
                                  String(term.id || term.term_id) ===
                                  String(item.id || item.term_id)
                              );

                              return (
                                <li key={`term-${item.id}`}>
                                  <div className="form-check">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      id={`term-${item.id}`}
                                      checked={isSelected}
                                      onChange={(e) =>
                                        handleTermChange(e, item)
                                      }
                                    />
                                    <label
                                      className="form-check-label"
                                      htmlFor={`term-${item.id}`}
                                    >
                                      {termContent}
                                    </label>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        ) : (
                          <p className="text-muted mb-0">No terms have been selected for this {getEntityLabel(rfqData?.is_tender)}.</p>
                        )}
                      </div>
                    </div>

                    {/* Additional Terms - Editable */}
                    <div>
                      <h6 className="mb-3 fw-medium">Additional Terms</h6>
                      <textarea
                        name="comment"
                        className="form-control border rounded p-3"
                        rows={4}
                        placeholder="Enter additional terms and conditions (optional)"
                        value={values.comment ?? ""}
                        onChange={(e) => {
                          setFieldValue("comment", e.target.value);
                          dispatch(
                            setOtherFormFields({
                              comment: e.target.value,
                            })
                          );
                          setHasUnsavedChanges(true);
                        }}
                        onBlur={handleBlur}
                      />
                    </div>
                    
                    {/* Term & Condition Files - If present */}
                    {rfqData?.term_and_condition_files && rfqData.term_and_condition_files.length > 0 && (
                      <div className="mt-4">
                        <h6 className="mb-3 fw-medium">Terms & Conditions Files  </h6>
                        <div className="row g-2">
                          {rfqData.term_and_condition_files.map((file, idx) => (
                            <div key={`file-${idx}`} className="col-md-6 col-lg-4">
                              <a 
                                href={file} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="d-flex align-items-center border rounded p-2 text-decoration-none bg-light"
                              >
                                <span className="text-truncate flex-grow-1">
                                  {file.split('/').pop()}
                                </span>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </fieldset>

                <div className="d-flex justify-content-between mb-4">
                  {/* Update button - disabled if user doesn't have permission */}
                  <div className="d-flex flex-column">
                    <button
                      type="submit"
                      className="btn btn-success px-4"
                      disabled={storeLoading || loading || (hotelIds.length > 0 && !canUpdate)}
                      onClick={(e) => {
                        // Ensure form validation is triggered
                        if (Object.keys(errors).length > 0) {
                          // Display validation errors to user
                          Object.keys(errors).forEach(key => {
                            toast.error(`${key}: ${errors[key]}`);
                          });
                          e.preventDefault();
                        }
                        if(!isUpdateConfirm && updatableData.products.deletable.length > 0) {
                          setIsUpdateConfirm(true);
                          e.preventDefault();
                        }
                      }}
                      id="update_rfq-rfq_actions-edit_rfq_page"
                      title={hotelIds.length > 0 && !canUpdate ? `You don't have permission to update this ${getEntityLabel(rfqData?.is_tender)}` : ""}
                    >
                      {storeLoading || loading ? "Updating..." : `Update ${getEntityLabel(rfqData?.is_tender)}`}
                    </button>
                    {isUpdateConfirm && (
                      <span className="text-danger mt-2">Updation have deletable products,<br/>click again to confirm.</span>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{ height: "fit-content" }}
                    className="btn btn-danger px-4"
                    onClick={() => router.push("/dashboard/buyer/rfq-management")}
                    id="cancel_edit-rfq_actions-edit_rfq_page"
                  >
                    {(hotelIds.length === 0 || canUpdate) ? "Cancel" : "Go Back"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="alert alert-info">
            <p className="mb-2">Loading {getEntityLabel(rfqData?.is_tender)} form data. Please wait...</p>
            <div className="progress">
              <div 
                className="progress-bar progress-bar-striped progress-bar-animated" 
                role="progressbar" 
                style={{width: "100%"}}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ViewVendorModal
        productData={selectedProduct}
        updatableData={updatableData}
        setUpdatableData={setUpdatableData}
        isOpen={showVendorModal}
        applyToOtherVariants={handleSyncApplyToOtherVariants}
        onClose={() => setShowVendorModal(false)}
        onSelectAll={(isChecked) => {
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                deletable: [
                  ...(isChecked ? selectedProduct.vendors.map(vendor => vendor.user_id) : [])
                ],
              },
            },
          }));
        }}
        onAdd={(item) => {
          const totalVendors = rfqData.products?.find(
            (product) => product.id === selectedProduct.product.id)?.vendor_details?.length || 0;
          
          const deletableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.deletable ?? []).length + 1;
          const addableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.addable ?? []).length;
          
          if (
            totalVendors + addableVendors - deletableVendors <= 0
          ) {
            toast.error(
              "At least one vendor is required for the product"
            );
            return;
          }
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                deletable: [
                  ...(prev.vendors?.[selectedProduct.product.id]
                    ?.deletable ?? []),
                  item.user_id,
                ],
              },
            },
          }))
        }
        }
        onRemove={(item) =>
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                deletable: (
                  prev.vendors?.[selectedProduct.product.id]?.deletable ??
                  []
                ).filter(
                  (deletableVendorId) => deletableVendorId != item.user_id
                ),
              },
            },
          }))
        }
      />
      <AddVendorModal
        headerTitle={`Add Vendor in ${selectedProduct?.product?.name}`}
        vendors={vendors}
        productData={selectedProduct}
        updatableData={updatableData}
        isOpen={showAddVendorModal}
        applyToOtherVariants={handleSyncApplyToOtherVariants}
        onClose={() => setShowAddVendorModal(false)}
        onAdd={(item) =>
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                addable: [
                  ...(prev.vendors?.[selectedProduct.product.id]
                    ?.addable ?? []),
                  item.id,
                ],
              },
            },
          }))
        }
        fetchVendors={fetchAvailableVendorsForProduct}
        onSelectAll={(isChecked) => {
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                addable: [
                  ...(isChecked ? vendors.map(vendor => vendor.id) : [])
                ],
              },
            },
          }));
        }}
        onRemove={(item) => {
          const totalVendors = rfqData.products?.find(
            (product) => product.id === selectedProduct.product.id)?.vendor_details?.length || 0;
          
          const deletableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.deletable ?? []).length;
          const addableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.addable ?? []).length - 1;
          
          if (
            totalVendors + addableVendors - deletableVendors <= 0
          ) {
            toast.error(
              "At least one vendor is required for the product"
            );
            return;
          }
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                addable: (
                  prev.vendors?.[selectedProduct.product.id]?.addable ??
                  []
                ).filter(
                  (deletableVendorId) => deletableVendorId != item.id
                ),
              },
            },
          }))
        }
        }
        addedVendorsList={(updatableData?.vendors?.[
          selectedProduct?.product?.id
        ]?.addable) ?? []}
      />

      {/* Vendor modal for new products removed — vendors are now auto-mapped */}
      <AddProductModal
        headerTitle={`Add Vendors to ${getEntityLabel(rfqData?.is_tender)} #${rfqData.rfq_no}`}
        rfqData={rfqData}
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onAdd={handleSelectProduct}
        updatableData={updatableData}
        existingProducts={rfqData?.products || []}
        selectedHotelIds={selectedHotelIds}
      />
      <AddSpecModal
        headerTitle={`Add Mandatory Specs for Product`}
        rfqData={rfqData}
        isOpen={showAddSpecModal}
        onClose={() => setShowAddSpecModal(false)}
        onEntry={handleAddSpec}
        updatableData={updatableData}
      />

      {/* Update Tender / RFQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUpdateConfirmModal}
        onClose={handleUpdateCancel}
        onConfirm={handleUpdateConfirm}
        title={`Update ${getEntityLabel(rfqData?.is_tender)}`}
        description={`Are you sure you want to update this ${getEntityLabel(rfqData?.is_tender)}?\nThis action will modify the ${getEntityLabel(rfqData?.is_tender)} details and notify relevant vendors.`}
        confirmButtonColor="success"
        confirmButtonText={`Update ${getEntityLabel(rfqData?.is_tender)}`}
        cancelButtonText="Cancel"
      />

      {/* Refresh Vendors Modal */}
      <Modal
        isOpen={showRefreshModal}
        onRequestClose={refreshStep === 'loading' || refreshStep === 'applying' ? undefined : handleRefreshClose}
        ariaHideApp={false}
        contentLabel="Refresh Vendors"
        style={{
          overlay: {
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', zIndex: 1050,
          },
          content: {
            position: 'relative', inset: 'auto',
            maxWidth: '400px', width: '100%',
            border: 'none', background: 'white', borderRadius: '16px',
            overflow: 'hidden', padding: '0',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.18)',
          },
        }}
      >
        <div style={{ padding: '32px 28px 24px', textAlign: 'center' }}>
          {/* Loading states */}
          {(refreshStep === 'loading' || refreshStep === 'applying') && (
            <div style={{ padding: '20px 0' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '3px solid #e2e8f0', borderTopColor: 'var(--primary-color, #2E5BA8)',
                animation: 'refreshSpin 0.7s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                {refreshStep === 'loading' ? 'Checking for new vendors...' : 'Adding vendors...'}
              </p>
            </div>
          )}

          {/* Step 1: Confirm */}
          {refreshStep === 'confirm' && (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: '16px', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BsArrowRepeat size={22} style={{ color: 'var(--primary-color, #2E5BA8)' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: '0 0 6px' }}>Refresh Vendors</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
                Check for new eligible vendors across all products in this {entityLabel.toLowerCase()} after it was published.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleRefreshClose} style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  border: '1px solid #e2e8f0', background: '#fff',
                  fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={handleRefreshPreview} style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  border: 'none', background: 'var(--primary-color, #2E5BA8)',
                  fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <BsArrowRepeat size={13} /> Check Now
                </button>
              </div>
            </>
          )}

          {/* Step 2: Result */}
          {refreshStep === 'result' && (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: '16px', margin: '0 auto 20px',
                background: refreshCount > 0
                  ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                  : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BsPeopleFill size={22} style={{ color: refreshCount > 0 ? 'var(--primary-color, #2E5BA8)' : '#94a3b8' }} />
              </div>
              {refreshCount > 0 ? (
                <>
                  <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: 'var(--primary-color, #2E5BA8)' }}>{refreshCount}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>new {refreshCount === 1 ? 'vendor' : 'vendors'}</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#475569', margin: '0 0 24px', lineHeight: 1.5 }}>
                    <strong style={{ color: '#1e293b' }}>{refreshCount} {refreshCount === 1 ? 'vendor' : 'vendors'}</strong> will be added across all products in this {entityLabel.toLowerCase()}.
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleRefreshClose} style={{
                      flex: 1, padding: '10px 16px', borderRadius: 10,
                      border: '1px solid #e2e8f0', background: '#fff',
                      fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
                    }}>Cancel</button>
                    <button onClick={handleRefreshConfirm} style={{
                      flex: 1, padding: '10px 16px', borderRadius: 10,
                      border: 'none', background: 'var(--primary-color, #2E5BA8)',
                      fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                    }}>Confirm</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>All up to date</p>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>All products already have all eligible vendors.</p>
                  <button onClick={handleRefreshClose} style={{
                    width: '100%', padding: '10px 16px', borderRadius: 10,
                    border: '1px solid #e2e8f0', background: '#fff',
                    fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
                  }}>Close</button>
                </>
              )}
            </>
          )}

          {/* Step 3: Done */}
          {refreshStep === 'done' && (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: '16px', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BsCheckCircleFill size={22} style={{ color: '#16a34a' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>Vendors added</p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>New vendors have been added across all products.</p>
              <button onClick={handleRefreshClose} style={{
                width: '100%', padding: '10px 16px', borderRadius: 10,
                border: 'none', background: 'var(--primary-color, #2E5BA8)',
                fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
              }}>Done</button>
            </>
          )}
        </div>

        <style jsx>{`
          @keyframes refreshSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Modal>

    </>
  );
};

export default EditRFQ; 