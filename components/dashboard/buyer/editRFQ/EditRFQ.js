import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Select from 'react-select';
import { updateRfq,  getTerms, vendorApproveList, getRFQById, getVendorsForProduct, addProductToDraft, addProductToExistingRfq } from "@/services/rfq";
import { Form, Formik } from "formik";
import { getProfile } from "@/services/Auth";
import Loader from "@/components/shared/Loader";
import { useDispatch, useSelector } from "react-redux";
import {
  intializeRfq,
  clearState,
  setOtherFormFields,
  setTermsData,
  setAllTerms,

} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProjectList } from "@/services/project";
import { getCountryCodes } from "@/services/cms";
import * as Yup from "yup";
import { formatISOToDateTimeLocal } from "@/utils/sharedFunctions";
import ViewVendorModal from "./ViewVendorModal";
import AddVendorModal from "./AddVendorModal";
import AddProductModal from "./AddProductModal";
import { faAdd, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion } from "react-bootstrap";
import Item from "../createRFQ/Item";
import { editRfqSchema } from "@/utils/schema";

// Add validation schema
const EditRFQSchema = Yup.object().shape({
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
  // Modified to accept date that could be today or in the future
  bid_end_date: Yup.date()
    .required("Procurement end date is required")
    .test('valid-date', 'End date must be today or in the future', function(value) {
      if (!value) return true;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const inputDate = new Date(value);
      inputDate.setHours(0, 0, 0, 0);
      
      return inputDate >= today;
    }),
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

const EditRFQ = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(true);
  const [rfqLoading, setRfqLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const [projects, setProjects] = useState([]);
  const [rfqData, setRfqData] = useState(null);
  const [products, setProducts] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [dataFetchError, setDataFetchError] = useState(null);

  // Add a ref to track if we've already refreshed terms to avoid infinite loop
  const termRefreshCompletedRef = useRef(false);

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
  const [showAddVendorForProductModal, setShowAddVendorForProductModal] = useState(false);
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
    vendors: [],
  })
  const [vendors, setVendors] = useState([]);

  // Promps a confirmation if any product is going to be deleted
  const [isUpdateConfirm, setIsUpdateConfirm] = useState(false);

  // Add a ref to track if terms have been initialized
  const termsInitializedRef = useRef(false);

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

  const fetchAvailableVendorsForProduct = async () => {
    if(!selectedProduct || !selectedProduct.product) return;

    try {
      const body = {
        productId: selectedProduct.product.product_id,
        excludeIds: selectedProduct?.vendors?.map(vendor => vendor.user_id) ?? []
      }
      const response = await getVendorsForProduct(body)
      setVendors(response.data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => console.log("RFQ DATA -> ", rfqData), [rfqData]);
  
  useEffect(() => {
    // Clear Redux store first
    dispatch(clearState());
    
    // Reset refs for a fresh start
    termRefreshCompletedRef.current = false;
    termsInitializedRef.current = false;
    
    // Only start fetching when we have an ID
    if (router.query.id) {
      fetchInitialData();
      fetchCountryCodes();
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
      const rfqResponse = await getRFQById(id);
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

      setRfqData(rfqData);
      setProducts(rfqData?.products ?? []);

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

      // Continue with other data fetching
      const [projectsResponse] = 
        await Promise.all([
          getProjectList(),
        ]);

      // Format the projects for select
      if (projectsResponse?.data) {
        const formattedProjects = projectsResponse.data.map(project => ({
          value: project.id,
          label: project.name || `Project #${project.id}`
        }));
        setProjects(formattedProjects);
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
      setDataFetchError(error.message || "Failed to load RFQ data");
      toast.error("Failed to load RFQ data. Please try again.");
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
              [change.type]: change?.value.length > 0 ? change.value[0] : "rm",
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

  const handleRemoveProduct = (data) => {
    if((updatableData.products.deletable.length + 1) === rfqData?.products?.length)
      toast.warning("You cannot delete all products from RFQ, at least one product is required");
    else
      setUpdatableData((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          deletable: [...(prev.products?.deletable ?? []), data.id],
        },
      }));
  };

  const handleUpdateRFQ = async (formValues) => {
    try {
      if (!rfqData || !rfqData.id) {
        toast.error("Original RFQ data not available");
        return;
      }

      // if(totalProductsInrfq >= updatableData.products?.deletable?.length + updatableData.products?.addable?.length) {  
      //  toast.error("You cannot delete all products from RFQ, at least one product is required");
      //  return;
      // }

      const dataToSend = {
        updatableData,
        rfq_id: rfqData.id,
        contact_name: formValues.contact_name || rfqData.contact_name,
        contact_number: formValues.contact_number,
        response_email: formValues.response_email || rfqData.response_email,
        bid_end_date: formValues.bid_end_date || rfqData.bid_end_date || "",
       };

      // Only include project_id if it exists and is a valid number
      if ((formValues.project_id != rfqData.project_id) && (!isNaN(formValues.project_id) || formValues.project_id == null)) {
        dataToSend.project_id = (parseInt(formValues.project_id ?? "-1"));
      } else if (rfqData.project_id) {
        dataToSend.project_id = parseInt(rfqData.project_id);
      }

      if (formValues.rfq_type && rfqTypes.some(type => formValues.rfq_type == type.value)) {
        dataToSend.rfq_type = formValues.rfq_type;
      } else if (rfqData.rfq_type) {
        dataToSend.rfq_type = rfqData.rfq_type;
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

      if(dataToSend.reverse_auction && (!formValues.ra_start_date || !formValues.ra_end_date)) {
        console.log("REVERSE AUCTION: ", dataToSend.reverse_auction, " RE_START_DATE: ", formValues.ra_start_date, " RE_END_DATE: ", formValues.ra_end_date)
        toast.error("Auction start and end date is required")
        return;
      }


      if (rfqData.ra_start_date != formValues.ra_start_date)
        dataToSend.ra_start_date = formValues.ra_start_date;

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
            toast.info("RFQ has been updated, you can change something else or go back!");
            
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
              project_id: formValues.project_id,
              // Keep original values
              // Preserve original terms
            }));
            
            // Clear and update the terms in Redux to prevent duplication
            dispatch(clearState());
            
            // IMPORTANT: Update Redux store - use display format for UI
            dispatch(
              setOtherFormFields({
                contact_name: formValues.contact_name,
                // Store the FORMATTED version for display
                contact_number: formValues.contact_number,
                response_email: formValues.response_email,
                location: rfqData.location || '',
                bid_end_date: formValues.bid_end_date,
                comment: rfqData.comment, // Keep original comment
                project_id: formValues.project_id
              })
            );
            
            // Set the preserved terms from dataToSend
            if (dataToSend.terms && dataToSend.terms.length > 0) {
              dispatch(setTermsData(dataToSend.terms));
            }
            
            // Navigate after success (without refetch to avoid race conditions)
            // setTimeout(() => {
            //   router.push("/dashboard/buyer/rfq-management");
            // }, 500);
            fetchInitialData();
            setUpdatableData({
              products: {
                addable: [],
                deletable: [],
                updatable: {},
              },
              vendors: {},
            });

          } else {
            console.error("Update failed:", response);
            toast.error(response?.message || "Failed to update RFQ. Please check the form and try again.");
          }
        })
        .catch((error) => {
          console.error("Error updating RFQ:", error);
          setLoading(false);
          
          if (error.response && error.response.data && error.response.data.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error("Failed to update RFQ. Please check form fields and try again.");
          }
        }).finally(() => 
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 10)
      );
        
    } catch (error) {
      setLoading(false);
      console.error("Error in handleUpdateRFQ:", error);
      toast.error("An error occurred while updating the RFQ: " + (error.message || "Unknown error"));
    }
  };

  const handleSelectProduct = (product) => {
    setProductAddData(prev => ({
      ...prev,
      variant_id: product.variant_id,
    }))
    setSelectedProduct({
      product,
      vendors: [],
    })
    setShowAddProductModal(false);
    setShowAddVendorForProductModal(true);
  }

  const handleAddVendorForProduct = (vendor) => {
    console.log(vendor)
    setProductAddData(prev => ({
      ...prev,
      vendors: [...prev.vendors, vendor.id]
    }))
  }

  const handleAddProduct = async () => {
    if(!rfqData || !rfqData.id) return;

    const payload = {
      rfqId: rfqData.id,
      ...productAddData
    }

    const data = await addProductToExistingRfq(payload)
    await fetchInitialData()
    toast.success(`Product added ${productAddData.vendors.length > 0 ? 'with' : 'without'} vendors`)
    setProductAddData({
      variant_id: -1,
      vendors: [],
    })
    setUpdatableData(prev => ({
      ...prev,
      products: {
        ...prev.products,
        addable: [...prev.products.addable, data.rfqProductId]
      }
    }))
    setShowAddVendorForProductModal(false)
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
          <p>Unable to load RFQ data. Please try again.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-dark-blue text-white p-3 mb-4">
        <div className="container-fluid">
          <h1 className="fs-4 m-0">Edit RFQ #{rfqData?.rfq_no}</h1>
        </div>
      </div>

      <div className="container-fluid mb-4">
        <div className="d-flex">
          <Link href="/dashboard/buyer/rfq-management" className="me-2 text-decoration-none text-muted">
            Manage RFQs
          </Link>
          <span className="text-primary">Edit RFQ</span>
        </div>
      </div>

      <div className="container-fluid">
        {/* Products table */}
        <div style={{
          borderRadius: 0
        }} className="mb-4">
          <div className="mb-3">
            <h4 className="mb-0">RFQ #{rfqData?.rfq_no} details</h4>
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
                rfqData.products.filter(product => !updatableData.products?.deletable?.includes(product.id)).map((product) => {
                  return (
                    <Item
                      // vendorApprovedList={vendorApprovedList}
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
                                  [change.type]: change?.value.length > 0 ? change.value[0] : 'rm',
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
                      handleViewVendorInEdit={() => {
                        setShowVendorModal(true);
                        setSelectedProduct({
                          product,
                          vendors: product.vendor_details,
                        });
                      }}
                      handleAddVendorInEdit={() => {
                        setShowAddVendorModal(true);
                        setSelectedProduct({
                          product,
                          vendors: product.vendor_details,
                        });
                      }}
                      handleRemoveProductInEdit={(data) => {
                        if((updatableData.products.deletable.length + 1) === rfqData?.products?.length)
                          toast.warning("You cannot delete all products from RFQ, at least one product is required");
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
                    />
                  );
                })}
            </Accordion>
          </div>
          {renderDeletedProductsTable()}
        </div>
        <div className="mb-4 d-flex justify-content-end">
          <button
            onClick={() => setShowAddProductModal(true)}
            className="btn btn-primary btn-sm">
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
              bid_end_date: rfqFormDataFromStore.bid_end_date || "",
              comment: rfqFormDataFromStore.comment || "",
              rfq_type: rfqFormDataFromStore.rfq_type || "",
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
              };
              handleUpdateRFQ(updatedFormData);
            }}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue }) => (
              <Form onSubmit={handleSubmit}>
                <div className="card mb-4">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">RFQ Information</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        {/* Company Name - Now Read Only */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">Company Name</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={rfqFormDataFromStore.company_name || rfqData.company_name || ""}
                            disabled
                          />
                        </div>
                      
                        {/* Contact Number */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">
                            Contact Number <span className="text-danger">*</span>
                          </label>
                          <div className="d-flex">
                            {/* Country Code Dropdown */}
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

                            {/* Mobile Number Input */}
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
                                // Only allow numeric input for phone number
                                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                setFieldValue('contact_number', numericValue);
                                
                                // Also update form data in Redux store
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
                        
                        {/* Response Email */}
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
                      
                      <div className="col-md-6">
                        {/* Contact Name */}
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

                        {/* Procurement End Date */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">Procurement End Date <span className="text-danger">*</span></label>
                          <input
                            type="date"
                            name="bid_end_date"
                            className="form-control"
                            value={values.bid_end_date}
                            onChange={(e) => {
                              handleChange(e);
                              handleFormFieldChange(e);
                            }}
                            onBlur={handleBlur}
                          />
                          {touched.bid_end_date && errors.bid_end_date && (
                            <div className="invalid-feedback d-block">
                              {errors.bid_end_date}
                            </div>
                          )}
                        </div>
                        
                        {/* Select Project */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">Select Project</label>
                          <Select
                            key={`project-select-${rfqFormDataFromStore.project_id || 'none'}`}
                            options={projects}
                            value={(() => {
                              if (!rfqFormDataFromStore.project_id) return null;
                              const projectId = parseInt(rfqFormDataFromStore.project_id);
                              const match = projects.find(p => parseInt(p.value) === projectId);
                              return match || null;
                            })()}
                            onChange={(selectedOption) => {
                              const projectId = selectedOption ? parseInt(selectedOption.value) : null;
                              dispatch(setOtherFormFields({ project_id: projectId }));
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Select Project"
                            className="basic-select"
                            classNamePrefix="select"
                            isClearable={true}
                          />
                        </div>
                      </div>

                      <div className="col-md-6">
                        {/* RFQ Type */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">RFQ Type  </label>
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
                      <div className="col-12">
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
                      <div className="terms-list border rounded p-3 bg-light">
                        {selectedTerms && selectedTerms.length > 0 ? (
                          <ol className="mb-0 ps-3">
                            {selectedTerms.map((term, index) => (
                              <li key={`term-${term.id || index}`} className="mb-2">
                                {term.term_content || term.name}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-muted mb-0">No terms have been selected for this RFQ.</p>
                        )}
                      </div>
                    </div>

                    {/* Additional Terms - Now Read Only */}
                    <div>
                      <h6 className="mb-3 fw-medium">Additional Terms  </h6>
                      <div className="border rounded p-3 bg-light">
                        {rfqData.comment && rfqData.comment.trim() ? (
                          <div className="mb-0">
                            {rfqData.comment}
                          </div>
                        ) : (
                          <p className="text-muted mb-0">No additional terms specified.</p>
                        )}
                      </div>
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

                <div className="d-flex justify-content-between mb-4">
                  <div className="d-flex flex-column">
                    <button
                      type="submit" 
                      className="btn btn-success px-4" 
                      disabled={storeLoading || loading}
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
                    >
                      {storeLoading || loading ? "Updating..." : "Update RFQ"}
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
                  >
                    Cancel
                    </button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="alert alert-info">
            <p className="mb-2">Loading RFQ form data. Please wait...</p>
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
        onClose={() => setShowVendorModal(false)}
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

      {/* This one is to add vendors to new product */}
      <AddVendorModal
        headerTitle={`Add Vendors for ${selectedProduct?.product?.variant_name ?? "-"}`}
        vendors={vendors}
        productData={selectedProduct}
        updatableData={updatableData}
        isOpen={showAddVendorForProductModal}
        onClose={() => setShowAddVendorForProductModal(false)}
        onAdd={handleAddVendorForProduct}
        onRemove={(item) => setProductAddData(prev => ({
          ...prev,
          vendors: prev.vendors.filter(vendorId => vendorId != item.id)
        }))}
        onSubmit={handleAddProduct}
        addedVendorsList={productAddData?.vendors ?? []}
        submitText={"Add Product"}
      />
      <AddProductModal
        headerTitle={`Add Vendors to RFQ #${rfqData.rfq_no}`}
        rfqData={rfqData}
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onAdd={handleSelectProduct}
        updatableData={updatableData}
      />
    </>
  );
};

export default EditRFQ; 