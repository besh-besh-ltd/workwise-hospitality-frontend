import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { useRouter } from "next/router";
import { getRfqs, fetchVendorSelectionOption, getAllClauses, getRFQById } from "@/services/rfq";
import { getProfile } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import ClauseProductItem from "./ClauseProductItem";
import { toast } from "react-toastify";
import { getProjectList } from '@/services/project';
import { getUserMappings } from '@/services/hospitality';
import Select from 'react-select';
import { formatRFQNumber, getEntityLabel } from "@/utils/sharedFunctions";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";



const BuyerTechnicalEvaluation = () => {
  const router = useRouter();
  const { rfq_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [rfqList, setRfqList] = useState([]);
  const [currentRfq, setcurrentRfq] = useState(null);
  const [vendorMap, setVendorMap] = useState(new Map());
  const [clauseMap, setClauseMap] = useState(null);
  const [rfqNo, setRfqNo] =useState(null);
  const [projects, setProjects] = useState(null);
  const [allProjects, setAllProjects] = useState(null);
  const [selectedproject, setSelectedproject] = useState(null);
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [clauseInfo, setClauseInfo] = useState(null);
  const [selectedVendorsMap, setSelectedVendorsMap] = useState(new Map());
  const [isTenderFilter, setIsTenderFilter] = useState(null);

  // Extract hotel IDs for permission checks - use hotel_id from RFQ data
  const hotelIds = useMemo(() => {
    if (currentRfq) {
      // Primary: use hotel_id from RFQ (technical evaluation has single hotel)
      if (currentRfq.hotel_id !== undefined && currentRfq.hotel_id !== null) {
        return [currentRfq.hotel_id];
      }
      // Alternative: try hospitality_hotel_id field
      if (currentRfq.hospitality_hotel_id !== undefined && currentRfq.hospitality_hotel_id !== null) {
        return [currentRfq.hospitality_hotel_id];
      }
      // Alternative: try mappedHotels array
      if (currentRfq.mappedHotels && currentRfq.mappedHotels.length > 0) {
        const ids = currentRfq.mappedHotels.map(h => h.hotel_id || h.hospitality_hotel_id).filter(id => id !== undefined && id !== null);
        if (ids.length > 0) return ids;
      }
    }
    // Fallback: use user's hotel mappings if available
    if (userHotelMappings && userHotelMappings.length > 0) {
      return userHotelMappings.map(h => h.hospitality_hotel_id).filter(id => id !== undefined && id !== null);
    }
    return [];
  }, [currentRfq, userHotelMappings]);

  // Permission hook for technical evaluation module
  // Always enabled when RFQ is selected - API will handle empty hotelIds gracefully
  const {
    canRead,
    canUpdate,
    canCreate,
    canApprove,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: "te",
    hotelIds: hotelIds,
    enabled: !!currentRfq,
  });

  // For technical evaluation, "write" access means either update OR create permission
  const canWrite = canUpdate || canCreate;

  // Track if we've verified permissions for the current RFQ
  const [permissionsVerified, setPermissionsVerified] = useState(false);

  const getAllProjects = () => {
    getProjectList()
        .then((res) => {
            let d = [];
            (res.data.data || res.data || []).map((item) => {
                d.push({ label: item.name, value: item.id, hospitality_company_id: item.hospitality_company_id, hotel_id: item.hotel_id });
            });
            setProjects(d);
            setAllProjects(d);
        })
        .catch((error) => {
            console.log(error)
        })
  }

  const fetchUserHotelMappings = async () => {
    try {
      const response = await getUserMappings();
      const mappings = response?.data || [];
      setUserHotelMappings(mappings);
    } catch (error) {
      console.error("Error fetching user hotel mappings", error);
    }
  }

  const handleHotelSelectionChange = (hotelIds) => {
    setSelectedHotelIds(hotelIds);
    
    // Filter projects based on selected hotels
    if (!hotelIds || hotelIds.length === 0) {
      setProjects(allProjects);
    } else {
      const filtered = allProjects.filter(p => hotelIds.includes(p.hotel_id));
      setProjects(filtered);
    }
    
    // Reset project selection when hotels change
    setSelectedproject(null);
  }

useEffect(() => {
  const handler = setTimeout(() => {
    getTechEvaluationRFQsByUser();
  }, 1000);

  return () => {
    clearTimeout(handler);
  };
}, [rfqNo,selectedproject, isTenderFilter]);

  const getUserDetails = async () => {
    try {
      const res = await getProfile();
      setcurrentUserProfile(res.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const getTechEvaluationRFQsByUser = async () => {
    try {
      setLoading(true);
      const res = await getRfqs({
        tech_eval: true,
        page: 1,
        limit: 100,
        project_id: selectedproject ? selectedproject : -1,
        rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null,
        sort: 'DESC',
        is_tender: isTenderFilter !== null ? (isTenderFilter === '1' || isTenderFilter === 1) : null
      });
      const newData = Array.isArray(res) ? res : [];
      setRfqList(newData);
    } catch (error) {
      console.error("Error fetching technical evaluation RFQs:", error);
    } finally {
      setLoading(false);
    }
  };


  const getVendorSelectionOption = async (rfq_product_id) => {
    if (!rfq_product_id) return [];
    const payload = {
      rfq_id,
      rfq_product_id
    };

    try {
      const res = await fetchVendorSelectionOption(payload);
      return res.data.map((vendor) => ({
        value: vendor.vendor_id,
        // Use anonymized vendor code instead of vendor name
        label: vendor.rfq_product_vendor_id ? `VEN-${vendor.rfq_product_vendor_id}` : `Vendor ${vendor.vendor_id}`,
      }));
    } catch (error) {
      console.error("Error fetching vendor options:", error);
      return [];
    }
  };

  // Stage 1: Fetch RFQ metadata for permission context (lightweight, no sensitive data)
  const fetchRFQMetadata = async () => {
    if (!rfq_id) {
      setcurrentRfq(null);
      setPermissionsVerified(false);
      return;
    }

    try {
      setLoading(true);
      const rfqDetailsRes = await getRFQById(rfq_id);
      const selectedRfq = Array.isArray(rfqDetailsRes.data) ? rfqDetailsRes.data[0] : rfqDetailsRes.data;

      if (!selectedRfq) {
        console.error('No RFQ found for ID:', rfq_id);
        setcurrentRfq(null);
        return;
      }

      // Set RFQ data for permission context (hotel_id is needed for permission check)
      setcurrentRfq(selectedRfq);
      setPermissionsVerified(false); // Reset when RFQ changes
    } catch (error) {
      console.log(error);
      toast.error(error.message || 'Failed to load RFQ details');
      setcurrentRfq(null);
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Fetch full clause/evaluation data only after permissions verified
  const fetchEvaluationData = async () => {
    if (!rfq_id || !currentRfq) return;

    try {
      setLoading(true);
      const res = await getAllClauses(rfq_id, "tech_evaluation");
      setClauseInfo(res?.data ?? null);

      const vMap = new Map();
      currentRfq?.products?.map((prodItem) => {
        vMap.set(prodItem.id, null);
      });

      let c_map = new Map();
      currentRfq?.products?.map((pItem) => {
        c_map.set(pItem.id, false);
      });

      res.data?.map((pItem) => {
        c_map.set(pItem.rfq_product_id, true);
      });

      setVendorMap(vMap);
      setClauseMap(c_map);
      setPermissionsVerified(true);
    } catch (error) {
      console.log(error);
      toast.error(error.message || 'Failed to load evaluation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserDetails();
    getTechEvaluationRFQsByUser();
    getAllProjects();
    fetchUserHotelMappings();
  }, []);

  // Stage 1: Fetch RFQ metadata when rfq_id changes (for permission context)
  useEffect(() => {
    fetchRFQMetadata();
  }, [rfq_id]);

  // Stage 2: Fetch full evaluation data only after permissions are verified
  useEffect(() => {
    if (rfq_id && currentRfq && !permissionsLoading && canRead && !permissionsVerified) {
      fetchEvaluationData();
    }
  }, [rfq_id, currentRfq, permissionsLoading, canRead, permissionsVerified]);

  // Access Denied check - show when user has no read permission
  // Only check when an RFQ is selected and we have permission context
  const hasPermissionContext = hotelIds.length > 0 && !!currentRfq;

  // Permission loading state - show loading while permissions are being verified
  // Data is NOT fetched until permissions are verified
  if (currentRfq && (permissionsLoading || (!permissionsVerified && canRead))) {
    return (
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted">Verifying permissions...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (hasPermissionContext && !permissionsLoading && !canRead) {
    return (
      <AccessDeniedPage
        title="Access Denied"
        message={`You do not have permission to view technical evaluations for this ${getEntityLabel(currentRfq?.is_tender)}. Contact your administrator to request access.`}
        backUrl="/dashboard/buyer"
        backLabel="Back to Dashboard"
      />
    );
  }

  return (
    <>
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Technical Evaluation</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className="row">

            {/* RFQ List */}
            <div className="col-md-2">
              <div className="hasFullLoader">
                <h5 className="title">List Of Tender / RFQs</h5>

                {loading && <FullLoader />}

                <div className="py-1">
                    <label>Search Tender / RFQ No.</label>
                    <input
                        className="form-control react-select" 
                        style={{ borderRadius: '0.25rem', borderColor: '#ced4da', boxShadow: 'none' }}
                        value={rfqNo}
                        onChange={(e)=> setRfqNo(e.target.value)}
                        name="rfq_type"
                        placeholder="Ex. 123456"
                        isClearable
                        id="search_rfq_no-rfq_list-technical_evaluation_page"
                    />
                </div>
                {userHotelMappings.length > 0 && (
                  <div className="py-2">
                    <label>Select Hotels</label>
                    <Select
                      isMulti
                      options={userHotelMappings}
                      value={userHotelMappings.filter(opt => 
                        selectedHotelIds.includes(opt.hospitality_hotel_id)
                      )}
                      onChange={(selectedOptions) => {
                        const ids = selectedOptions 
                          ? selectedOptions.map(opt => opt.hospitality_hotel_id)
                          : [];
                        handleHotelSelectionChange(ids);
                      }}
                      placeholder="Select Hotels..."
                      closeMenuOnSelect={false}
                      classNamePrefix="react-select"
                      isClearable
                      formatOptionLabel={(option) => (
                        <div>
                          <span>{option.hotel_name}</span>
                        </div>
                      )}
                      getOptionValue={(option) => option.hospitality_hotel_id}
                      id="select_hotels_filter-rfq_list-technical_evaluation_page"
                    />
                  </div>
                )}
                <div className="py-2">
                    <label>Select Project</label>
                    <Select
                        options={projects}
                        onChange={(selectedOption,actionMeta)=> setSelectedproject(selectedOption?.value ? selectedOption.value : -1)}
                        // value={selectedproject}
                        name="project_id"
                        placeholder="Select"
                        isClearable
                        id="select_project_filter-rfq_list-technical_evaluation_page"
                    />
                </div>
                <div className="py-2">
                    <label>Type</label>
                    <Select
                        options={[
                            { label: "RFQ", value: "0" },
                            { label: "Tender", value: "1" }
                        ]}
                        onChange={(selectedOption) => setIsTenderFilter(selectedOption?.value || null)}
                        value={isTenderFilter !== null ? { label: isTenderFilter === '1' || isTenderFilter === 1 ? "Tender" : "RFQ", value: isTenderFilter } : null}
                        placeholder="Select"
                        isClearable
                        id="is_tender_filter-rfq_list-technical_evaluation_page"
                    />
                </div>

                {!loading && rfqList.length === 0 ? (
                  <p style={{ textAlign: "center" }}>No Tender / RFQs yet!</p>
                ) : (
                  <ul className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                    {rfqList.map((item) => (
                      <li
                        className={item.id === currentRfq?.id ? "active" : ""}
                        key={`rfq_no_${item.rfq_no}`}
                      >
                        <Link
                          href={`/dashboard/buyer/technical-evaluation?rfq_id=${item.id}`}
                          className={
                            item.id === currentRfq?.id ? "text-white" : "text-dark"
                          }
                          id={`rfq_${item.rfq_no}-rfq_list-technical_evaluation_page`}
                        >
                          {item.title && item.title != "" &&
                            <span className="d-block fw-bold" style={{ fontSize: "14px" }}>
                              {item.title}
                            </span>}
                          {formatRFQNumber(item.rfq_no, item.is_tender)}
                          {item.project_name && item.project_name != "" &&
                            <b className="d-block fw-semibold" style={{ fontSize: "14px" }}>
                              {item.project_name}
                            </b>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Main Container */}
            <div className="col-md-10">
              <div className="quote-sec-table quote-sec-tab">

                {/* RFQ Details */}
                {!loading && currentRfq &&
                  <div className="mb-3">
                    {currentRfq.title && currentRfq.title != "" &&
                      <h3 className="fs-5 mb-1 fw-bold">
                        {currentRfq.title}
                      </h3>}
                    <h3 className="fs-5 mb-1">
                      <span className="fw-semibold">{currentRfq.is_tender === 1 ? 'Tender' : 'RFQ'} No : </span>{currentRfq.rfq_no}
                    </h3>
                    {currentRfq.project_name && currentRfq.project_name != "" &&
                      <p className="sub-heading fs-6 mb-2">
                        {currentRfq.project_name}
                      </p>}
                    <hr />

                    <div className="row text-sm ">

                      <div className="col-md-6">
                        <p className="sub-heading mb-0">
                          <b>Company Name</b> :{" "}
                          {currentRfq.company_name}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Contact Person Name</b> :{" "}
                          {currentRfq.contact_name}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Response Email</b> :{" "}
                          {currentRfq.response_email}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Contact Number</b> :{" "}
                          {currentRfq.contact_number}
                        </p>
                        {currentRfq.location && currentRfq.location != "" &&
                          <p className="sub-heading mb-0">
                            <b>Delivery Location</b> :{" "}
                            {currentRfq.location}
                          </p>}
                      </div>

                      <div className="col-md-6">
                        <p className="sub-heading mb-0">
                          <b>Reverse Auction</b> :{" "}
                          {currentRfq.reverse_auction == 1 ? "Enabled" : "Disabled"}
                        </p>
                        {currentRfq.reverse_auction == 1 && (
                          <>
                            <p className="sub-heading mb-0">
                              <b>Auction Start Date</b> :{" "}
                              {currentRfq.ra_start_date || "Not specified"}
                            </p>
                            <p className="sub-heading mb-0">
                              <b>Auction End Date</b> :{" "}
                              {currentRfq.ra_end_date || "Not specified"}
                            </p>
                          </>
                        )}
                        {currentRfq.rfq_type && currentRfq.rfq_type != "" &&
                          <p className="sub-heading mb-0">
                            <b>Tender / RFQ Type</b> :{" "}
                            {currentRfq.rfq_type}
                          </p>}
                        <p className="sub-heading mb-0">
                          <b>Bid End Date</b> :{" "}
                          {currentRfq.bid_end_date}
                        </p>

                       {currentRfq?.hotel_name && (
                        <p className="sub-heading mb-0  "> 
                          <strong  >Hotels : quote-compare</strong> {" "}
                          {currentRfq.hotel_name}
                        </p>
                      )}

                        {currentRfq.comment && currentRfq.comment != "" &&
                          <p className="sub-heading mb-0">
                            <b>Comment</b> :{" "}
                            {currentRfq.comment}
                          </p>}
                      </div>

                    </div>
                  </div>
                }

                {/* Read-Only Banner - Shows when user has read but not write permission */}
                {hasPermissionContext && !permissionsLoading && !canWrite && canRead && (
                  <div className="mt-3 mb-3">
                    <ReadOnlyBanner
                      title="View Only Mode"
                      message="You have read-only access to this technical evaluation. Contact your administrator to request edit permissions."
                    />
                  </div>
                )}

                <div className="quote-sec-main">
                  <>
                    {!loading && currentRfq &&
                      <>
                        <h3 className="fs-5 mb-2 mt-4">
                          <span className="fw-semibold">{getEntityLabel(currentRfq?.is_tender)} Products </span>
                        </h3>
                        <hr />
                      </>}

                    {currentRfq && clauseInfo &&
                      clauseInfo.map((rfqProduct, productIndex) => {
                        if (clauseMap.get(rfqProduct.rfq_product_id)) {
                          const product = currentRfq.products.find(product => product.id == rfqProduct.rfq_product_id)
                          if(!product) return null;
                          const productSelectedVendors = selectedVendorsMap.get(product.id) || [];
                          const allVendors = rfqProduct?.vendors || []; // ← ALL vendors from API
                          let displayedVendors = [];
                          // CASE 1: User selected vendors → show selected ones
                          if (productSelectedVendors.length > 0) {
                            displayedVendors = productSelectedVendors.map(v => v.label);
                          }
                          // CASE 2: Nothing selected → show ALL vendors
                          else {
                            displayedVendors = allVendors.map(v =>
                              v.rfq_product_vendor_id ? `VEN-${v.rfq_product_vendor_id}` : (v.company_name || v.organization_name || v.vendor_name)
                            );
                          }
                          const vendorLabel = displayedVendors.length > 1 ? "Vendors" : "Vendor";

                          return (
                            <div className="quote-sec-table-sub pt-0" key={`product_${product.id}`}>
                              <div className="row">
                                <div className="col-12">

                                  <div className="d-flex justify-content-between gap-2">
                                    {/* Product Details */}
                                    <div className="d-flex-flex-column mt-3">
                                      <p className="sub-heading mb-0">
                                        <b>Product</b>: {product.product_details[0]?.name}
                                      </p>
                                      <p className="sub-heading mb-0">
                                        <b>Product Specification</b>:{" "}
                                        {product.product_specs?.find((spec) => spec.title === "Spec" && spec.value)?.value || "N/A"}
                                      </p>
                                      {/* <p className="sub-heading mb-0">
                                        <b>Displaying {vendorLabel}</b>:{" "}
                                        {displayedVendors.join(", ") || "N/A"}
                                      </p> */}
                                    </div>

                                    {/* Vendor Selection - Hidden in tender mode (auto-managed via approval workflow) */}
                                    {currentRfq?.is_tender !== 1 && (
                                    <div className="col-md-3 col-lg-3 text-sm mb-2">
                                      <label>Select Vendor</label>
                                      <AsyncSelect
                                        isMulti
                                        cacheOptions
                                        loadOptions={() => getVendorSelectionOption(product.id)}
                                        defaultOptions
                                        placeholder="Select"
                                        isClearable
                                        value={productSelectedVendors}
                                        onChange={(selectedOptions) => {
                                          setSelectedVendorsMap(prev => new Map(prev).set(product.id, selectedOptions || []));
                                          // Also update vendorMap for single vendor selection
                                          if (selectedOptions && selectedOptions.length > 0) {
                                            setVendorMap(prev => new Map(prev).set(product.id, selectedOptions[0]));
                                          } else {
                                            setVendorMap(prev => {
                                              const newMap = new Map(prev);
                                              newMap.delete(product.id);
                                              return newMap;
                                            });
                                          }
                                        }}
                                        noOptionsMessage={() => "No vendors responded"}
                                        id={`select_vendor_${product.id}-vendor_selection-technical_evaluation_page`}
                                      />
                                    </div>
                                    )}
                                  </div>

                                  <ClauseProductItem
                                    type={"buyer"}
                                    rfq_id={rfq_id}
                                    product={{
                                      ...product,
                                      tbl_rfq_product_tech_evaluation_id: rfqProduct.evaluation_id
                                    }}
                                    currentUserProfile={currentUserProfile}
                                    currentRfq={currentRfq}
                                    getVendors={async () => await getVendorSelectionOption(product.id)}
                                    clauseInfo={rfqProduct?.clauses ?? []}
                                    vendors={rfqProduct?.vendors ?? []}
                                    refetch={fetchEvaluationData}
                                    selectedVendor={vendorMap.get(product.id)}
                                    selectedVendors={productSelectedVendors.map(vendor => vendor.value)}
                                    minimumPassingScore={rfqProduct?.minimum_passing_score}
                                    canWrite={canWrite}
                                    canApprove={canApprove}
                                    permissionsLoading={permissionsLoading}
                                  />

                                </div>
                              </div>
                            </div>
                          )
                        }
                      }
                      )}
                  </>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BuyerTechnicalEvaluation;