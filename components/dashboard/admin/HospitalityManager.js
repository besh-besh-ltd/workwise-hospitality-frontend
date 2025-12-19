import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { toast } from "react-toastify";
import Select from "react-select";
import {
  createHospitalityCompany,
  createHospitalityHotel,
  getHospitalityCompanies,
  getHospitalityHotels,
  mapHospitalityProjects,
  mapHospitalityUsers,
  getMappedUserIds,
  getMappedProjectIds,
  getCompanyUserMappings,
  deleteUserMapping,
} from "@/services/hospitality";
import { getCompanyUsers } from "@/services/Auth";
import { getAllProjects } from "@/services/project";

const defaultCompanyForm = {
  name: "",
  region: "",
  contact_email: "",
  registered_office_address: "",
  corporate_office_address: "",
  gst: "",
  pan: "",
  bank_account_number: "",
  bank_name: "",
  ifsc_code: "",
  account_holder_name: "",
  msme: "",
};

const defaultHotelForm = {
  name: "",
  city: "",
  keys: "",
  status: "Active",
  full_address: "",
  state: "",
  gst: "",
  pan: "",
  bank_account_number: "",
  bank_name: "",
  ifsc_code: "",
  account_holder_name: "",
  msme: "",
  delivery_address: "",
};

const defaultUserMappingForm = {
  mappingLevel: "company",
  hotelId: "",
  users: [],
  autoMapProjects: true,
};

const defaultProjectMappingForm = {
  mappingLevel: "company",
  hotelId: "",
  projects: [],
};

const dedupeHospitalityMappings = (list = []) => {
  const seen = new Set();
  return list.filter((item) => {
    const key =
      item.mapping_type === 0
        ? `company-${item.user_id}`
        : `hotel-${item.user_id}-${item.hospitality_hotel_id || "null"}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const modalStyles = {
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    zIndex: 1200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    position: "relative",
    inset: "auto",
    maxWidth: "800px",
    width: "95%",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "16px",
    padding: "0",
    border: "none",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
};

const HospitalityManager = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [companyForm, setCompanyForm] = useState(defaultCompanyForm);
  const [hotelForm, setHotelForm] = useState(defaultHotelForm);
  const [userMappingForm, setUserMappingForm] = useState(defaultUserMappingForm);
  const [projectMappingForm, setProjectMappingForm] = useState(defaultProjectMappingForm);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showUserMappingModal, setShowUserMappingModal] = useState(false);
  const [showProjectMappingModal, setShowProjectMappingModal] = useState(false);

  const [companyDocuments, setCompanyDocuments] = useState({
    gst: null,
    pan: null,
    cancelled_cheque: null,
    msme: null,
  });
  const [hotelDocuments, setHotelDocuments] = useState({
    gst: null,
    pan: null,
    cancelled_cheque: null,
    msme: null,
  });

  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [isSubmittingHotel, setIsSubmittingHotel] = useState(false);
  const [isMappingUsers, setIsMappingUsers] = useState(false);
  const [isMappingProjects, setIsMappingProjects] = useState(false);
  const [mappedUserIds, setMappedUserIds] = useState([]);
  const [mappedProjectIds, setMappedProjectIds] = useState([]);
  const [companyUserMappings, setCompanyUserMappings] = useState([]);
  const [hotelUserMappings, setHotelUserMappings] = useState({});
  const [isLoadingCompanyMappingList, setIsLoadingCompanyMappingList] = useState(false);
  const [hotelUserLoadingMap, setHotelUserLoadingMap] = useState({});
  const [allProjectMappings, setAllProjectMappings] = useState([]);
  const [userMappingFilter, setUserMappingFilter] = useState("all");
  const [projectMappingFilter, setProjectMappingFilter] = useState("all");
  const [projectMappingsData, setProjectMappingsData] = useState([]);

  const [activeTab, setActiveTab] = useState("hotels");

  const selectedCompany = useMemo(
    () => companies.find((item) => item.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const selectedCompanyHotels = hotels;

  const filteredUserMappings = useMemo(() => {
    if (userMappingFilter === "all") {
      return companyUserMappings;
    }
    const filterType = userMappingFilter === "company" ? 0 : 1;
    return companyUserMappings.filter((user) => user.mapping_type === filterType);
  }, [companyUserMappings, userMappingFilter]);

  const filteredProjectMappings = useMemo(() => {
    if (projectMappingFilter === "all") {
      return allProjectMappings;
    }
    const filterType = projectMappingFilter === "company" ? 0 : 1;
    const filteredProjectIds = new Set(
      projectMappingsData
        .filter((mapping) => mapping.mapping_type === filterType)
        .map((mapping) => mapping.project_id)
    );
    return allProjectMappings.filter((project) => filteredProjectIds.has(project.id));
  }, [allProjectMappings, projectMappingsData, projectMappingFilter]);

  const getProjectMappingInfo = (projectId) => {
    const mappings = projectMappingsData.filter((mapping) => mapping.project_id === projectId);
    if (mappings.length === 0) return null;
    
    // If filtering by specific type, show only that type
    if (projectMappingFilter !== "all") {
      const filterType = projectMappingFilter === "company" ? 0 : 1;
      const filteredMappings = mappings.filter((m) => m.mapping_type === filterType);
      return filteredMappings.length > 0 ? filteredMappings[0] : mappings[0];
    }
    
    // If project is mapped at company level, show that (it has access to all hotels)
    const companyMapping = mappings.find((m) => m.mapping_type === 0);
    if (companyMapping) return companyMapping;
    
    // Otherwise, return the first hotel mapping
    return mappings[0];
  };

  const loadCompanies = async () => {
    try {
      setIsLoadingCompanies(true);
      const response = await getHospitalityCompanies();
      const list = response?.data ?? response ?? [];
      setCompanies(list);
      if (list.length) {
        setSelectedCompanyId((prev) =>
          prev && list.some((c) => c.id === prev) ? prev : list[0].id
        );
      } else {
        setSelectedCompanyId(null);
        setHotels([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load hospitality companies");
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const loadHotels = async (companyId) => {
    if (!companyId) {
      setHotels([]);
      return;
    }
    try {
      setIsLoadingHotels(true);
      const response = await getHospitalityHotels(companyId);
      const hotelsData = response?.data ?? response ?? [];
      setHotels(hotelsData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load hotels");
    } finally {
      setIsLoadingHotels(false);
    }
  };

  const loadCompanyUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await getCompanyUsers();
      setCompanyUsers(response?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const response = await getAllProjects();
      const data = response?.data?.data || response?.data || [];
      setProjects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadMappedUserIds = async () => {
    if (!selectedCompanyId) {
      setMappedUserIds([]);
      return;
    }
    try {
      const mappingType = userMappingForm.mappingLevel === "company" ? 0 : 1;
      const hotelId =
        userMappingForm.mappingLevel === "hotel" && userMappingForm.hotelId
          ? parseInt(userMappingForm.hotelId, 10)
          : null;
      const response = await getMappedUserIds(selectedCompanyId, mappingType, hotelId);
      const ids = response?.data?.data || response?.data || [];
      setMappedUserIds(ids);
    } catch (error) {
      console.error(error);
      setMappedUserIds([]);
    }
  };

  const loadMappedProjectIds = async () => {
    if (!selectedCompanyId) {
      setMappedProjectIds([]);
      return;
    }
    try {
      const mappingType = projectMappingForm.mappingLevel === "company" ? 0 : 1;
      const hotelId =
        projectMappingForm.mappingLevel === "hotel" && projectMappingForm.hotelId
          ? parseInt(projectMappingForm.hotelId, 10)
          : null;
      const primaryResponse = await getMappedProjectIds(selectedCompanyId, mappingType, hotelId);
      let ids = primaryResponse?.data?.data || primaryResponse?.data || [];

      if (mappingType === 1) {
        const companyResponse = await getMappedProjectIds(selectedCompanyId, 0, null);
        const companyIds = companyResponse?.data?.data || companyResponse?.data || [];
        ids = [...new Set([...ids, ...companyIds])];
      }

      setMappedProjectIds(ids);
    } catch (error) {
      console.error(error);
      setMappedProjectIds([]);
    }
  };

  const loadCompanyUserMappings = async () => {
    if (!selectedCompanyId) {
      setCompanyUserMappings([]);
      return;
    }
    try {
      setIsLoadingCompanyMappingList(true);
      // Fetch all user mappings (both company and hotel level)
      const response = await getCompanyUserMappings(selectedCompanyId, {});
      const data = response?.data?.data || response?.data || [];
      setCompanyUserMappings(dedupeHospitalityMappings(data));
    } catch (error) {
      console.error(error);
      setCompanyUserMappings([]);
    } finally {
      setIsLoadingCompanyMappingList(false);
    }
  };

  const loadAllProjectMappings = async () => {
    if (!selectedCompanyId) {
      setAllProjectMappings([]);
      setProjectMappingsData([]);
      return;
    }
    try {
      // Fetch company-level project mappings
      const companyResponse = await getMappedProjectIds(selectedCompanyId, 0, null);
      const companyProjectIds = companyResponse?.data?.data || companyResponse?.data || [];
      
      // Fetch hotel-level project mappings for all hotels
      const hotelProjectPromises = hotels.map((hotel) =>
        getMappedProjectIds(selectedCompanyId, 1, hotel.id)
      );
      const hotelResponses = await Promise.all(hotelProjectPromises);
      
      // Store mapping data with hotel info
      const hotelMappingsData = [];
      hotels.forEach((hotel, index) => {
        const hotelProjectIds = hotelResponses[index]?.data?.data || hotelResponses[index]?.data || [];
        hotelProjectIds.forEach((projectId) => {
          hotelMappingsData.push({
            project_id: projectId,
            mapping_type: 1,
            hotel_id: hotel.id,
            hotel_name: hotel.name,
          });
        });
      });
      
      const hotelProjectIds = hotelResponses.flatMap(
        (response) => response?.data?.data || response?.data || []
      );
      
      // Store company-level mappings
      const companyMappingsData = companyProjectIds.map((projectId) => ({
        project_id: projectId,
        mapping_type: 0,
        hotel_id: null,
        hotel_name: null,
      }));
      
      // Combine all mapping data
      setProjectMappingsData([...companyMappingsData, ...hotelMappingsData]);
      
      // Combine and deduplicate project IDs
      const allProjectIds = [...new Set([...companyProjectIds, ...hotelProjectIds])];
      
      // Get project details for mapped projects
      const mappedProjects = projects.filter((project) => allProjectIds.includes(project.id));
      setAllProjectMappings(mappedProjects);
    } catch (error) {
      console.error(error);
      setAllProjectMappings([]);
      setProjectMappingsData([]);
    }
  };

  const loadHotelUserMappings = async (hotelId) => {
    if (!selectedCompanyId || !hotelId) return;
    setHotelUserLoadingMap((prev) => ({ ...prev, [hotelId]: true }));
    try {
      const response = await getCompanyUserMappings(selectedCompanyId, { mappingType: 1, hotelId });
      const data = response?.data?.data || response?.data || [];
      setHotelUserMappings((prev) => ({
        ...prev,
        [hotelId]: dedupeHospitalityMappings(data),
      }));
    } catch (error) {
      console.error(error);
      setHotelUserMappings((prev) => ({ ...prev, [hotelId]: [] }));
    } finally {
      setHotelUserLoadingMap((prev) => ({ ...prev, [hotelId]: false }));
    }
  };

  const getHotelUserList = (hotelId) => {
    const hotelSpecific = (hotelUserMappings?.[hotelId] || []).map((item) => ({
      ...item,
      scope: "hotel",
    }));
    const ids = new Set(hotelSpecific.map((item) => item.user_id));
    const combined = [...hotelSpecific];
    companyUserMappings.forEach((item) => {
      if (!ids.has(item.user_id)) {
        combined.push({ ...item, scope: "company" });
      }
    });
    return combined;
  };

  const handleRemoveUserMapping = async (mapping) => {
    if (!selectedCompanyId) return;
    const confirmRemove = window.confirm("Remove this user mapping?");
    if (!confirmRemove) return;
    try {
      await deleteUserMapping(mapping.user_id, {
        company_id: selectedCompanyId,
        mapping_type: mapping.mapping_type,
        hotel_id: mapping.mapping_type === 1 ? mapping.hospitality_hotel_id || mapping.hotel_id : null,
      });
      toast.success("Mapping removed");
      await loadMappedUserIds();
      await loadCompanyUserMappings();
      await loadAllProjectMappings();
      if (mapping.mapping_type === 1 && mapping.hospitality_hotel_id) {
        await loadHotelUserMappings(mapping.hospitality_hotel_id);
      } else {
        Object.keys(hotelUserMappings).forEach((hotelId) => {
          loadHotelUserMappings(parseInt(hotelId, 10));
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove mapping");
    }
  };

  useEffect(() => {
    loadCompanies();
    loadCompanyUsers();
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadHotels(selectedCompanyId);
      setUserMappingForm(defaultUserMappingForm);
      setProjectMappingForm(defaultProjectMappingForm);
      loadCompanyUserMappings();
      setHotelUserMappings({});
      setUserMappingFilter("all");
      setProjectMappingFilter("all");
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId && hotels.length >= 0 && projects.length > 0) {
      loadAllProjectMappings();
    }
  }, [selectedCompanyId, hotels, projects]);

  useEffect(() => {
    loadMappedUserIds();
  }, [selectedCompanyId, userMappingForm.mappingLevel, userMappingForm.hotelId]);

  useEffect(() => {
    loadMappedProjectIds();
  }, [selectedCompanyId, projectMappingForm.mappingLevel, projectMappingForm.hotelId]);

  useEffect(() => {
    if (!selectedCompanyId || !selectedCompanyHotels.length) return;
    selectedCompanyHotels.forEach((hotel) => {
      loadHotelUserMappings(hotel.id);
    });
  }, [selectedCompanyId, selectedCompanyHotels]);

  useEffect(() => {
    if (!projects.length) return;
    const mappedSelections = projects
      .filter((project) => mappedProjectIds.includes(project.id))
      .map((project) => ({
        value: project.id,
        label: project.name,
        isDisabled: true,
      }));
    setProjectMappingForm((prev) => {
      const manualSelections = prev.projects?.filter((project) => !mappedProjectIds.includes(project.value)) || [];
      return {
        ...prev,
        projects: [
          ...manualSelections,
          ...mappedSelections.filter((mapped) => !manualSelections.some((item) => item.value === mapped.value)),
        ],
      };
    });
  }, [mappedProjectIds, projects]);

  const handleCompanySubmit = async (event) => {
    event.preventDefault();
    if (!companyForm.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!companyForm.pan.trim()) {
      toast.error("PAN is required");
      return;
    }

    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(companyForm.pan.toUpperCase().trim())) {
      toast.error("PAN must be 10 characters in format: ABCDE1234F");
      return;
    }

    if (companyForm.gst && companyForm.gst.trim()) {
      const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstPattern.test(companyForm.gst.toUpperCase().trim())) {
        toast.error("GST must be 15 characters in format: 27AABCU9603R1ZX");
        return;
      }
    }

    try {
      setIsSubmittingCompany(true);
      await createHospitalityCompany(
        {
          name: companyForm.name.trim(),
          region: companyForm.region.trim() || "",
          contact_email: companyForm.contact_email.trim() || "",
          registered_office_address: companyForm.registered_office_address.trim() || "",
          corporate_office_address: companyForm.corporate_office_address.trim() || "",
          gst: companyForm.gst.trim() ? companyForm.gst.toUpperCase().trim() : "",
          pan: companyForm.pan.toUpperCase().trim(),
          bank_account_number: companyForm.bank_account_number.trim() || "",
          bank_name: companyForm.bank_name.trim() || "",
          ifsc_code: companyForm.ifsc_code.trim() || "",
          account_holder_name: companyForm.account_holder_name.trim() || "",
          msme: companyForm.msme.trim() || "",
        },
        companyDocuments
      );
      toast.success("Company created successfully!");
      setCompanyForm(defaultCompanyForm);
      setCompanyDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
      setShowCompanyModal(false);
      loadCompanies();
    } catch (error) {
      console.error(error);
      toast.error(error?.message?.response?.data?.message || "Failed to create company");
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  const handleHotelSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      toast.error("Select a company first");
      return;
    }
    if (!hotelForm.name.trim()) {
      toast.error("Business unit name is required");
      return;
    }

    if (hotelForm.pan && hotelForm.pan.trim()) {
      const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panPattern.test(hotelForm.pan.toUpperCase().trim())) {
        toast.error("PAN must be 10 characters in format: ABCDE1234F");
        return;
      }
    }

    if (hotelForm.gst && hotelForm.gst.trim()) {
      const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstPattern.test(hotelForm.gst.toUpperCase().trim())) {
        toast.error("GST must be 15 characters in format: 27AABCU9603R1ZX");
        return;
      }
    }

    try {
      setIsSubmittingHotel(true);
      await createHospitalityHotel(
        selectedCompanyId,
        {
          name: hotelForm.name.trim(),
          city: hotelForm.city.trim() || "",
          keys: hotelForm.keys ? parseInt(hotelForm.keys, 10) : 0,
          status: hotelForm.status,
          full_address: hotelForm.full_address.trim() || "",
          state: hotelForm.state.trim() || "",
          gst: hotelForm.gst.trim() ? hotelForm.gst.toUpperCase().trim() : "",
          pan: hotelForm.pan.trim() ? hotelForm.pan.toUpperCase().trim() : "",
          bank_account_number: hotelForm.bank_account_number.trim() || "",
          bank_name: hotelForm.bank_name.trim() || "",
          ifsc_code: hotelForm.ifsc_code.trim() || "",
          account_holder_name: hotelForm.account_holder_name.trim() || "",
          msme: hotelForm.msme.trim() || "",
          delivery_address: hotelForm.delivery_address.trim() || "",
        },
        hotelDocuments
      );
      toast.success("Business unit added successfully!");
      setHotelForm(defaultHotelForm);
      setHotelDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
      setShowHotelModal(false);
      loadHotels(selectedCompanyId);
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedCompanyId
            ? { ...company, total_hotels: (company.total_hotels || 0) + 1 }
            : company
        )
      );
    } catch (error) {
      console.error(error);
      toast.error(error?.message?.response?.data?.message || "Failed to add hotel");
    } finally {
      setIsSubmittingHotel(false);
    }
  };

  // Commented out - Map Users functionality temporarily disabled
  // const handleUserMappingSubmit = async (event) => {
  //   event.preventDefault();
  //   if (!selectedCompanyId) {
  //     toast.error("Select a company");
  //     return;
  //   }
  //   if (!userMappingForm.users.length) {
  //     toast.error("Select at least one user");
  //     return;
  //   }
  //   if (userMappingForm.mappingLevel === "hotel" && !userMappingForm.hotelId) {
  //     toast.error("Select a business unit for unit-level mapping");
  //     return;
  //   }
  //   try {
  //     setIsMappingUsers(true);
  //     const mappingLevel = userMappingForm.mappingLevel;
  //     const targetHotelId = mappingLevel === "hotel" ? parseInt(userMappingForm.hotelId, 10) : null;
  //     await mapHospitalityUsers(selectedCompanyId, {
  //       mapping_type: mappingLevel === "company" ? 0 : 1,
  //       hotel_id: targetHotelId,
  //       user_ids: userMappingForm.users.map((user) => parseInt(user.value, 10)),
  //       auto_map_projects: userMappingForm.autoMapProjects,
  //     });
  //     toast.success("Users mapped successfully!");
  //     setUserMappingForm(defaultUserMappingForm);
  //     setShowUserMappingModal(false);
  //     await loadMappedUserIds();
  //     await loadCompanyUserMappings();
  //     await loadAllProjectMappings();
  //     if (mappingLevel === "hotel" && targetHotelId) {
  //       await loadHotelUserMappings(targetHotelId);
  //     } else {
  //       selectedCompanyHotels.forEach((hotel) => {
  //         loadHotelUserMappings(hotel.id);
  //       });
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error(error?.message?.response?.data?.message || "Failed to map users");
  //   } finally {
  //     setIsMappingUsers(false);
  //   }
  // };

  const handleProjectMappingSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      toast.error("Select a company");
      return;
    }
    if (!projectMappingForm.projects.length) {
      toast.error("Select at least one project");
      return;
    }
    if (projectMappingForm.mappingLevel === "hotel" && !projectMappingForm.hotelId) {
      toast.error("Select a business unit for unit-level mapping");
      return;
    }
    try {
      setIsMappingProjects(true);
      await mapHospitalityProjects(selectedCompanyId, {
        mapping_type: projectMappingForm.mappingLevel === "company" ? 0 : 1,
        hotel_id:
          projectMappingForm.mappingLevel === "hotel"
            ? parseInt(projectMappingForm.hotelId, 10)
            : null,
        project_ids: projectMappingForm.projects.map((project) => parseInt(project.value, 10)),
      });
      toast.success("Projects mapped successfully!");
      setProjectMappingForm(defaultProjectMappingForm);
      setShowProjectMappingModal(false);
      await loadMappedProjectIds();
      await loadAllProjectMappings();
    } catch (error) {
      console.error(error);
      toast.error(error?.message?.response?.data?.message || "Failed to map projects");
    } finally {
      setIsMappingProjects(false);
    }
  };

  const userOptions = companyUsers
    .filter((user) => !mappedUserIds.includes(user.id))
    .map((user) => ({
      value: user.id,
      label: `${user.name} (${user.email})`,
    }));

  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
    isDisabled: mappedProjectIds.includes(project.id),
  }));

  const selectStyles = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, maxHeight: "240px" }),
    menuList: (base) => ({ ...base, maxHeight: "240px" }),
  };

  // Render empty state when no companies
  if (!isLoadingCompanies && companies.length === 0) {
    return (
      <>
        <section className="buyer-common-header sc-pt-80">
          <div className="container-fluid">
            <h1 className="heading mb-0">Hospitality Network</h1>
          </div>
        </section>

        <section className="buyer-sec-1">
          <div className="container-fluid">
            <div className="card buyer-card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <div className="mb-4">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21V5C19 3.9 18.1 3 17 3H7C5.9 3 5 3.9 5 5V21M19 21H5M19 21H21M5 21H3M9 7H10M9 11H10M14 7H15M14 11H15M12 21V17C12 15.9 11.1 15 10 15H8C7.45 15 7 15.45 7 16V21" stroke="#158993" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="mb-2" style={{ color: "#1e293b" }}>Welcome to Hospitality Network</h3>
                <p className="text-muted mb-4" style={{ maxWidth: "500px", margin: "0 auto" }}>
                  Get started by creating your first hospitality company. You can then add business units, 
                  map users, and manage projects for your hospitality business.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowCompanyModal(true)}
                  style={{
                    backgroundColor: "#158993",
                    borderColor: "#158993",
                    backgroundImage: "none",
                    border: "none",
                    minWidth: "280px",
                    height: "56px",
                    padding: "0 28px",
                    borderRadius: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 12px 30px rgba(21,137,147,0.28)",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "1.2",
                  }}
                >
                  <i className="bi bi-plus-lg"></i>
                  Create Your First Company
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Company Creation Modal */}
        {renderCompanyModal()}
      </>
    );
  }

  function renderCompanyModal() {
    return (
      <Modal
        isOpen={showCompanyModal}
        onRequestClose={() => setShowCompanyModal(false)}
        ariaHideApp={false}
        style={modalStyles}
      >
        <div className="modal-header px-4 py-3 border-bottom" style={{ backgroundColor: "#f8fafc" }}>
          <div>
            <h5 className="modal-title mb-1">Create New Company</h5>
            <small className="text-muted">Fill in the company details to get started</small>
          </div>
          <button type="button" className="btn-close" onClick={() => setShowCompanyModal(false)} />
        </div>
        <div className="modal-body p-4">
          <form onSubmit={handleCompanySubmit}>
            {/* Basic Information */}
            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-3" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                Basic Information
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Company Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: UrbanStay Hotels"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Region</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.region}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, region: e.target.value }))}
                    placeholder="Ex: North India"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Contact Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={companyForm.contact_email}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="Ex: contact@company.com"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Registered Office Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={companyForm.registered_office_address}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, registered_office_address: e.target.value }))}
                    placeholder="Enter registered office address"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Corporate Office Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={companyForm.corporate_office_address}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, corporate_office_address: e.target.value }))}
                    placeholder="Enter corporate office address"
                  />
                </div>
              </div>
            </div>

            {/* Tax & Compliance */}
            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-3" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                Tax & Compliance
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">PAN <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.pan}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                    placeholder="ABCDE1234F"
                    maxLength="10"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">GST <small className="text-muted">(Optional)</small></label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.gst}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, gst: e.target.value.toUpperCase() }))}
                    placeholder="27AABCU9603R1ZX"
                    maxLength="15"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">MSME <small className="text-muted">(Optional)</small></label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.msme}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, msme: e.target.value }))}
                    placeholder="MSME registration number"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-3" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                Bank Details
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Account Holder Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.account_holder_name}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
                    placeholder="Account holder name"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Bank Account Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.bank_account_number}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, bank_account_number: e.target.value }))}
                    placeholder="Account number"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.bank_name}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="Bank name"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">IFSC Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={companyForm.ifsc_code}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                    placeholder="IFSC code"
                    maxLength="11"
                  />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-3" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                Documents <small>(PDF, JPG, PNG)</small>
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">PAN Document</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCompanyDocuments((prev) => ({ ...prev, pan: e.target.files[0] || null }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">GST Document</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCompanyDocuments((prev) => ({ ...prev, gst: e.target.files[0] || null }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Cancelled Cheque</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCompanyDocuments((prev) => ({ ...prev, cancelled_cheque: e.target.files[0] || null }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">MSME Document</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCompanyDocuments((prev) => ({ ...prev, msme: e.target.files[0] || null }))}
                  />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button type="button" className="btn btn-light px-4" onClick={() => setShowCompanyModal(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={isSubmittingCompany}
                style={{ backgroundColor: "#158993", borderColor: "#158993" }}
              >
                {isSubmittingCompany ? "Creating..." : "Create Company"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  function renderHotelModal() {
    return (
      <Modal
        isOpen={showHotelModal}
        onRequestClose={() => setShowHotelModal(false)}
        ariaHideApp={false}
        style={modalStyles}
      >
        <div className="modal-header px-4 py-3 border-bottom" style={{ backgroundColor: "#f8fafc" }}>
          <div>
            <h5 className="modal-title mb-1">Add New Business Unit</h5>
            <small className="text-muted">Adding to: <strong>{selectedCompany?.name}</strong></small>
          </div>
          <button type="button" className="btn-close" onClick={() => setShowHotelModal(false)} />
        </div>
        <div className="modal-body p-4">
          <form onSubmit={handleHotelSubmit}>
            {/* Basic Information */}
            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-3" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                Basic Information
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Business Unit Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: UrbanStay Lakeside"
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.city}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Ex: Udaipur"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.state}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="Ex: Rajasthan"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Keys (Rooms)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={hotelForm.keys}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, keys: e.target.value }))}
                    placeholder="Number of rooms"
                    min={0}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={hotelForm.status}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="In Review">In Review</option>
                    <option value="Pending Onboarding">Pending Onboarding</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Full Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={hotelForm.full_address}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, full_address: e.target.value }))}
                    placeholder="Complete property address"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Delivery Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={hotelForm.delivery_address}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, delivery_address: e.target.value }))}
                    placeholder="Address for deliveries"
                  />
                </div>
              </div>
            </div>

            {/* Tax & Compliance */}
            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-3" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                Tax & Compliance <small>(Optional)</small>
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">PAN</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.pan}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                    placeholder="ABCDE1234F"
                    maxLength="10"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">GST</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.gst}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, gst: e.target.value.toUpperCase() }))}
                    placeholder="27AABCU9603R1ZX"
                    maxLength="15"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">MSME</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.msme}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, msme: e.target.value }))}
                    placeholder="MSME registration"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-3" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                Bank Details <small>(Optional)</small>
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Account Holder Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.account_holder_name}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
                    placeholder="Account holder name"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Bank Account Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.bank_account_number}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, bank_account_number: e.target.value }))}
                    placeholder="Account number"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.bank_name}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="Bank name"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">IFSC Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hotelForm.ifsc_code}
                    onChange={(e) => setHotelForm((prev) => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                    placeholder="IFSC code"
                    maxLength="11"
                  />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-3" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                Documents <small>(Optional - PDF, JPG, PNG)</small>
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">PAN Document</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setHotelDocuments((prev) => ({ ...prev, pan: e.target.files[0] || null }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">GST Document</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setHotelDocuments((prev) => ({ ...prev, gst: e.target.files[0] || null }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Cancelled Cheque</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setHotelDocuments((prev) => ({ ...prev, cancelled_cheque: e.target.files[0] || null }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">MSME Document</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setHotelDocuments((prev) => ({ ...prev, msme: e.target.files[0] || null }))}
                  />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button type="button" className="btn btn-light px-4" onClick={() => setShowHotelModal(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={isSubmittingHotel}
                style={{ backgroundColor: "#158993", borderColor: "#158993" }}
              >
                {isSubmittingHotel ? "Adding..." : "Add Business Unit"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  function renderUserMappingModal() {
    return (
      <Modal
        isOpen={showUserMappingModal}
        onRequestClose={() => setShowUserMappingModal(false)}
        ariaHideApp={false}
        style={{
          ...modalStyles,
          content: { ...modalStyles.content, maxWidth: "600px" },
        }}
      >
        <div className="modal-header px-4 py-3 border-bottom" style={{ backgroundColor: "#f8fafc" }}>
          <div>
            <h5 className="modal-title mb-1">Map Users</h5>
            <small className="text-muted">Assign users to <strong>{selectedCompany?.name}</strong></small>
          </div>
          <button type="button" className="btn-close" onClick={() => setShowUserMappingModal(false)} />
        </div>
        <div className="modal-body p-4">
          <form onSubmit={handleUserMappingSubmit}>
            <div className="mb-3">
              <label className="form-label">Mapping Level</label>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="mappingLevel"
                    id="companyLevel"
                    value="company"
                    checked={userMappingForm.mappingLevel === "company"}
                    onChange={(e) =>
                      setUserMappingForm((prev) => ({
                        ...prev,
                        mappingLevel: e.target.value,
                        hotelId: "",
                      }))
                    }
                  />
                    <label className="form-check-label" htmlFor="companyLevel">
                    <strong>Company Level</strong>
                    <small className="d-block text-muted">Access to all business units</small>
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="mappingLevel"
                    id="hotelLevel"
                    value="hotel"
                    checked={userMappingForm.mappingLevel === "hotel"}
                    onChange={(e) =>
                      setUserMappingForm((prev) => ({
                        ...prev,
                        mappingLevel: e.target.value,
                      }))
                    }
                  />
                    <label className="form-check-label" htmlFor="hotelLevel">
                    <strong>Business Unit Level</strong>
                    <small className="d-block text-muted">Access to specific unit only</small>
                  </label>
                </div>
              </div>
            </div>

            {userMappingForm.mappingLevel === "hotel" && (
              <div className="mb-3">
                <label className="form-label">Select Business Unit</label>
                <select
                  className="form-select"
                  value={userMappingForm.hotelId}
                  onChange={(e) => setUserMappingForm((prev) => ({ ...prev, hotelId: e.target.value }))}
                >
                  <option value="">Choose a business unit...</option>
                  {selectedCompanyHotels.map((hotel) => (
                    <option value={hotel.id} key={hotel.id}>
                      {hotel.name} {hotel.city ? `- ${hotel.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Select Users</label>
              <Select
                isMulti
                isSearchable
                options={userOptions}
                value={userMappingForm.users}
                onChange={(selected) => setUserMappingForm((prev) => ({ ...prev, users: selected || [] }))}
                placeholder={isLoadingUsers ? "Loading..." : "Search and select users..."}
                isLoading={isLoadingUsers}
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="form-check form-switch mb-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="autoMapProjects"
                checked={userMappingForm.autoMapProjects}
                onChange={(e) => setUserMappingForm((prev) => ({ ...prev, autoMapProjects: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="autoMapProjects">
                Auto-add users to all mapped projects
              </label>
            </div>

            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button type="button" className="btn btn-light px-4" onClick={() => setShowUserMappingModal(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={isMappingUsers}
                style={{ backgroundColor: "#158993", borderColor: "#158993" }}
              >
                {isMappingUsers ? "Mapping..." : "Map Users"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  function renderProjectMappingModal() {
    return (
      <Modal
        isOpen={showProjectMappingModal}
        onRequestClose={() => setShowProjectMappingModal(false)}
        ariaHideApp={false}
        style={{
          ...modalStyles,
          content: { ...modalStyles.content, maxWidth: "600px" },
        }}
      >
        <div className="modal-header px-4 py-3 border-bottom" style={{ backgroundColor: "#f8fafc" }}>
          <div>
            <h5 className="modal-title mb-1">Map Projects</h5>
            <small className="text-muted">Assign projects to <strong>{selectedCompany?.name}</strong></small>
          </div>
          <button type="button" className="btn-close" onClick={() => setShowProjectMappingModal(false)} />
        </div>
        <div className="modal-body p-4">
          <form onSubmit={handleProjectMappingSubmit}>
            <div className="mb-3">
              <label className="form-label">Mapping Level</label>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="projectMappingLevel"
                    id="projectCompanyLevel"
                    value="company"
                    checked={projectMappingForm.mappingLevel === "company"}
                    onChange={(e) =>
                      setProjectMappingForm((prev) => ({
                        ...prev,
                        mappingLevel: e.target.value,
                        hotelId: "",
                      }))
                    }
                  />
                    <label className="form-check-label" htmlFor="projectCompanyLevel">
                    <strong>Company Level</strong>
                    <small className="d-block text-muted">Available to all business units</small>
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="projectMappingLevel"
                    id="projectHotelLevel"
                    value="hotel"
                    checked={projectMappingForm.mappingLevel === "hotel"}
                    onChange={(e) =>
                      setProjectMappingForm((prev) => ({
                        ...prev,
                        mappingLevel: e.target.value,
                      }))
                    }
                  />
                    <label className="form-check-label" htmlFor="projectHotelLevel">
                    <strong>Business Unit Level</strong>
                    <small className="d-block text-muted">Specific to one unit</small>
                  </label>
                </div>
              </div>
            </div>

            {projectMappingForm.mappingLevel === "hotel" && (
              <div className="mb-3">
                <label className="form-label">Select Business Unit</label>
                <select
                  className="form-select"
                  value={projectMappingForm.hotelId}
                  onChange={(e) => setProjectMappingForm((prev) => ({ ...prev, hotelId: e.target.value }))}
                >
                  <option value="">Choose a business unit...</option>
                  {selectedCompanyHotels.map((hotel) => (
                    <option value={hotel.id} key={hotel.id}>
                      {hotel.name} {hotel.city ? `- ${hotel.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="form-label">Select Projects</label>
              <Select
                isMulti
                isSearchable
                options={projectOptions}
                value={projectMappingForm.projects}
                onChange={(selected) => setProjectMappingForm((prev) => ({ ...prev, projects: selected || [] }))}
                placeholder={isLoadingProjects ? "Loading..." : "Search and select projects..."}
                isLoading={isLoadingProjects}
                isOptionDisabled={(option) => option.isDisabled}
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button type="button" className="btn btn-light px-4" onClick={() => setShowProjectMappingModal(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={isMappingProjects}
                style={{ backgroundColor: "#158993", borderColor: "#158993" }}
              >
                {isMappingProjects ? "Mapping..." : "Map Projects"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  return (
    <>
      {/* Header Section */}
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="heading mb-1">Hospitality Network</h1>
            </div>
            <button
              type="button"
              className="btn btn-primary px-4"
              onClick={() => setShowCompanyModal(true)}
              style={{ backgroundColor: "#158993", borderColor: "#158993" }}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Add Company
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="row g-4">
            {/* Left Sidebar - Company List */}
            <div className="col-lg-3">
              <div className="card buyer-card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-0 pb-0 pt-3">
                  <h6 className="mb-0 text-muted text-uppercase" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                    Your Companies
                  </h6>
                </div>
                <div className="card-body pt-3">
                  {isLoadingCompanies ? (
                    <div className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-secondary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {companies.map((company) => {
                        const isActive = selectedCompanyId === company.id;
                        return (
                          <button
                            key={company.id}
                            type="button"
                            className={`text-start border-0 rounded-3 p-3 transition-all ${
                              isActive ? "text-white" : "bg-light"
                            }`}
                            style={{
                          backgroundColor: isActive ? "#158993" : undefined,
                          color: isActive ? "#ffffff" : "#0f172a",
                              transition: "all 0.2s ease",
                            }}
                            onClick={() => setSelectedCompanyId(company.id)}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                              <div className="fw-semibold" style={{ fontSize: "14px" }}>
                                {company.name}
                              </div>
                                <small style={{ color: isActive ? "rgba(255,255,255,0.8)" : "#6b7280" }}>
                                  {company.region || "No region"}
                                </small>
                              </div>
                              <span
                                className="badge rounded-pill"
                                style={{
                                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "#e5e7eb",
                                  color: isActive ? "#fff" : "#374151",
                                  fontSize: "11px",
                                }}
                              >
                                {company.total_hotels || 0} Business Units
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-lg-9">
              {selectedCompany ? (
                <>
                  {/* Company Header Card */}
                  <div className="card buyer-card border-0 shadow-sm mb-4">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div>
                          <h4 className="mb-1">{selectedCompany.name}</h4>
                          <div className="d-flex gap-3 text-muted" style={{ fontSize: "14px" }}>
                            {selectedCompany.region && (
                              <span>
                                <i className="bi bi-geo-alt me-1"></i>
                                {selectedCompany.region}
                              </span>
                            )}
                            {selectedCompany.contact_email && (
                              <span>
                                <i className="bi bi-envelope me-1"></i>
                                {selectedCompany.contact_email}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          {/* Commented out - Map Users button temporarily disabled */}
                          {/* <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setShowUserMappingModal(true)}
                          >
                            <i className="bi bi-people me-1"></i>
                            Map Users
                          </button> */}
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setShowProjectMappingModal(true)}
                          >
                            <i className="bi bi-folder me-1"></i>
                            Map Projects
                          </button>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="row g-3 mt-3">
                        <div className="col-md-4">
                          <div className="p-3 rounded-3" style={{ backgroundColor: "#f0fdfa" }}>
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: "48px", height: "48px", backgroundColor: "#158993" }}
                              >
                                <i className="bi bi-building text-white" style={{ fontSize: "20px" }}></i>
                              </div>
                              <div>
                                <div className="text-muted" style={{ fontSize: "12px" }}>Business Units</div>
                                <div className="fw-bold" style={{ fontSize: "24px", color: "#158993" }}>
                                  {selectedCompanyHotels.length}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="p-3 rounded-3" style={{ backgroundColor: "#fef3c7" }}>
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: "48px", height: "48px", backgroundColor: "#f59e0b" }}
                              >
                                <i className="bi bi-people text-white" style={{ fontSize: "20px" }}></i>
                              </div>
                              <div>
                                <div className="text-muted" style={{ fontSize: "12px" }}>Users</div>
                                <div className="fw-bold" style={{ fontSize: "24px", color: "#f59e0b" }}>
                                  {companyUserMappings.length}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="p-3 rounded-3" style={{ backgroundColor: "#ede9fe" }}>
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: "48px", height: "48px", backgroundColor: "#8b5cf6" }}
                              >
                                <i className="bi bi-folder text-white" style={{ fontSize: "20px" }}></i>
                              </div>
                              <div>
                                <div className="text-muted" style={{ fontSize: "12px" }}>Projects</div>
                                <div className="fw-bold" style={{ fontSize: "24px", color: "#8b5cf6" }}>
                                  {allProjectMappings.length}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <ul className="nav nav-tabs mb-4" style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <li className="nav-item">
                      <button
                        className={`nav-link px-4 ${activeTab === "hotels" ? "active" : ""}`}
                        onClick={() => setActiveTab("hotels")}
                        style={{
                          border: "none",
                          borderBottom: activeTab === "hotels" ? "2px solid #158993" : "2px solid transparent",
                          color: activeTab === "hotels" ? "#158993" : "#6b7280",
                          fontWeight: activeTab === "hotels" ? 600 : 400,
                          marginBottom: "-2px",
                        }}
                      >
                        <i className="bi bi-building me-2"></i>
                        Business Units ({selectedCompanyHotels.length})
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link px-4 ${activeTab === "users" ? "active" : ""}`}
                        onClick={() => setActiveTab("users")}
                        style={{
                          border: "none",
                          borderBottom: activeTab === "users" ? "2px solid #158993" : "2px solid transparent",
                          color: activeTab === "users" ? "#158993" : "#6b7280",
                          fontWeight: activeTab === "users" ? 600 : 400,
                          marginBottom: "-2px",
                        }}
                      >
                        <i className="bi bi-people me-2"></i>
                        People ({companyUserMappings.length})
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link px-4 ${activeTab === "projects" ? "active" : ""}`}
                        onClick={() => setActiveTab("projects")}
                        style={{
                          border: "none",
                          borderBottom: activeTab === "projects" ? "2px solid #158993" : "2px solid transparent",
                          color: activeTab === "projects" ? "#158993" : "#6b7280",
                          fontWeight: activeTab === "projects" ? 600 : 400,
                          marginBottom: "-2px",
                        }}
                      >
                        <i className="bi bi-folder me-2"></i>
                        Projects ({allProjectMappings.length})
                      </button>
                    </li>
                  </ul>

                  {/* Hotels Tab Content */}
                  {activeTab === "hotels" && (
                    <div className="card buyer-card border-0 shadow-sm">
                      <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3">
                        <h5 className="mb-0">Business Units</h5>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setShowHotelModal(true)}
                          style={{ backgroundColor: "#158993", borderColor: "#158993" }}
                        >
                          <i className="bi bi-plus-lg me-1"></i>
                          Add Business Unit
                        </button>
                      </div>
                      <div className="card-body p-0">
                        {isLoadingHotels ? (
                          <div className="text-center py-5">
                            <div className="spinner-border text-secondary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </div>
                        ) : selectedCompanyHotels.length === 0 ? (
                          <div className="text-center py-5">
                            <div className="mb-3">
                              <i className="bi bi-building text-muted" style={{ fontSize: "48px" }}></i>
                            </div>
                            <h6 className="text-muted">No business units yet</h6>
                            <p className="text-muted mb-3" style={{ fontSize: "14px" }}>
                              Add your first business unit to start mapping teams and projects
                            </p>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => setShowHotelModal(true)}
                            >
                              <i className="bi bi-plus-lg me-1"></i>
                              Add First Business Unit
                            </button>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-hover mb-0">
                              <thead style={{ backgroundColor: "#f9fafb" }}>
                                <tr>
                                  <th className="border-0 py-3 ps-4">Business Unit</th>
                                  <th className="border-0 py-3">Location</th>
                                  <th className="border-0 py-3">Keys</th>
                                  <th className="border-0 py-3">Status</th>
                                  <th className="border-0 py-3">Users</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedCompanyHotels.map((hotel) => {
                                  const hotelUsers = getHotelUserList(hotel.id);
                                  return (
                                    <tr key={hotel.id}>
                                      <td className="py-3 ps-4">
                                        <div className="fw-semibold">{hotel.name}</div>
                                      </td>
                                      <td className="py-3">
                                        <span className="text-muted">
                                          {[hotel.city, hotel.state].filter(Boolean).join(", ") || "—"}
                                        </span>
                                      </td>
                                      <td className="py-3">{hotel.keys || 0}</td>
                                      <td className="py-3">
                                        <span
                                          className="badge"
                                          style={{
                                            backgroundColor:
                                              hotel.status === "Active"
                                                ? "#dcfce7"
                                                : hotel.status === "In Review"
                                                ? "#fef3c7"
                                                : "#f3f4f6",
                                            color:
                                              hotel.status === "Active"
                                                ? "#166534"
                                                : hotel.status === "In Review"
                                                ? "#92400e"
                                                : "#374151",
                                          }}
                                        >
                                          {hotel.status}
                                        </span>
                                      </td>
                                      <td className="py-3">
                                        <span className="text-muted">{hotelUsers.length} users</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Users Tab Content */}
                  {activeTab === "users" && (
                    <div className="card buyer-card border-0 shadow-sm">
                      <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3">
                        <div>
                          <h5 className="mb-0">People</h5>
                          <small className="text-muted">Users mapped at company level have access to all business units</small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <select
                            className="form-select form-select-sm"
                            value={userMappingFilter}
                            onChange={(e) => setUserMappingFilter(e.target.value)}
                            style={{ width: "auto", minWidth: "150px" }}
                          >
                            <option value="all">All Mappings</option>
                            <option value="company">Company Level</option>
                            <option value="hotel">Business Unit Level</option>
                          </select>
                          {/* Commented out - Add Users button temporarily disabled */}
                          {/* <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowUserMappingModal(true)}
                            style={{ backgroundColor: "#158993", borderColor: "#158993" }}
                          >
                            <i className="bi bi-plus-lg me-1"></i>
                            Add Users
                          </button> */}
                        </div>
                      </div>
                      <div className="card-body p-0">
                        {isLoadingCompanyMappingList ? (
                          <div className="text-center py-5">
                            <div className="spinner-border text-secondary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </div>
                        ) : filteredUserMappings.length === 0 ? (
                          <div className="text-center py-5">
                            <div className="mb-3">
                              <i className="bi bi-people text-muted" style={{ fontSize: "48px" }}></i>
                            </div>
                            <h6 className="text-muted">
                              {userMappingFilter === "all"
                                ? "No people added yet"
                                : userMappingFilter === "company"
                                ? "No company-level users found"
                                : "No business unit-level users found"}
                            </h6>
                            <p className="text-muted mb-3" style={{ fontSize: "14px" }}>
                              {userMappingFilter === "all"
                                ? "Map users to give them access to this hospitality company and its business units"
                                : "Try changing the filter or map users at this level"}
                            </p>
                            {userMappingFilter === "all" && (
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => setShowUserMappingModal(true)}
                              >
                                <i className="bi bi-plus-lg me-1"></i>
                                Add First User
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-hover mb-0">
                              <thead style={{ backgroundColor: "#f9fafb" }}>
                                <tr>
                                  <th className="border-0 py-3 ps-4">User</th>
                                  <th className="border-0 py-3">Mapping Level</th>
                                  <th className="border-0 py-3">Auto Map Projects</th>
                                  <th className="border-0 py-3 text-end pe-4">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredUserMappings.map((user) => (
                                  <tr key={`${user.user_id}-${user.mapping_type}-${user.hospitality_hotel_id || 'company'}`}>
                                    <td className="py-3 ps-4">
                                      <div className="d-flex align-items-center gap-3">
                                        <div
                                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                          style={{
                                            width: "40px",
                                            height: "40px",
                                            backgroundColor: "#158993",
                                            fontSize: "14px",
                                          }}
                                        >
                                          {(user.name || "U")[0].toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="fw-semibold">{user.name || "N/A"}</div>
                                          <small className="text-muted">{user.email || "No email"}</small>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3">
                                      {user.mapping_type === 0 ? (
                                        <span className="badge bg-primary">Company Level</span>
                                      ) : (
                                        <div className="d-flex flex-column gap-1">
                                          <span className="badge bg-success">Business Unit Level</span>
                                          {user.hotel_name && (
                                            <small className="text-muted">{user.hotel_name}</small>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3">
                                      <span
                                        className={`badge ${
                                          user.auto_map_projects ? "bg-success" : "bg-secondary"
                                        }`}
                                      >
                                        {user.auto_map_projects ? "Yes" : "No"}
                                      </span>
                                    </td>
                                    <td className="py-3 text-end pe-4">
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleRemoveUserMapping(user)}
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Projects Tab Content */}
                  {activeTab === "projects" && (
                    <div className="card buyer-card border-0 shadow-sm">
                      <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3">
                        <div>
                          <h5 className="mb-0">Mapped Projects</h5>
                          <small className="text-muted">Projects mapped to this hospitality company and its business units</small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <select
                            className="form-select form-select-sm"
                            value={projectMappingFilter}
                            onChange={(e) => setProjectMappingFilter(e.target.value)}
                            style={{ width: "auto", minWidth: "150px" }}
                          >
                            <option value="all">All Mappings</option>
                            <option value="company">Company Level</option>
                            <option value="hotel">Business Unit Level</option>
                          </select>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowProjectMappingModal(true)}
                            style={{ backgroundColor: "#158993", borderColor: "#158993" }}
                          >
                            <i className="bi bi-plus-lg me-1"></i>
                            Map Projects
                          </button>
                        </div>
                      </div>
                      <div className="card-body p-0">
                        {filteredProjectMappings.length === 0 ? (
                          <div className="text-center py-5">
                            <div className="mb-3">
                              <i className="bi bi-folder text-muted" style={{ fontSize: "48px" }}></i>
                            </div>
                            <h6 className="text-muted">
                              {projectMappingFilter === "all"
                                ? "No projects mapped yet"
                                : projectMappingFilter === "company"
                                ? "No company-level projects found"
                                : "No business unit-level projects found"}
                            </h6>
                            <p className="text-muted mb-3" style={{ fontSize: "14px" }}>
                              {projectMappingFilter === "all"
                                ? "Map projects to make them available to users in this hospitality company"
                                : "Try changing the filter or map projects at this level"}
                            </p>
                            {projectMappingFilter === "all" && (
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => setShowProjectMappingModal(true)}
                              >
                                <i className="bi bi-plus-lg me-1"></i>
                                Map First Project
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-hover mb-0">
                              <thead style={{ backgroundColor: "#f9fafb" }}>
                                <tr>
                                  <th className="border-0 py-3 ps-4">Project Name</th>
                                  <th className="border-0 py-3">Mapping Level</th>
                                  <th className="border-0 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredProjectMappings.map((project) => {
                                  const projectMapping = getProjectMappingInfo(project.id);
                                  return (
                                    <tr key={project.id}>
                                      <td className="py-3 ps-4">
                                        <div className="fw-semibold">{project.name || "N/A"}</div>
                                      </td>
                                      <td className="py-3">
                                        {projectMapping ? (
                                          projectMapping.mapping_type === 0 ? (
                                            <span className="badge bg-primary">Company Level</span>
                                          ) : (
                                            <div className="d-flex flex-column gap-1">
                                              <span className="badge bg-success">Business Unit Level</span>
                                              {projectMapping.hotel_name && (
                                                <small className="text-muted">{projectMapping.hotel_name}</small>
                                              )}
                                            </div>
                                          )
                                        ) : (
                                          <span className="text-muted">—</span>
                                        )}
                                      </td>
                                      <td className="py-3">
                                        <span
                                          className={`badge ${
                                            project.status === "Active"
                                              ? "bg-success"
                                              : project.status === "Completed"
                                              ? "bg-info"
                                              : "bg-secondary"
                                          }`}
                                        >
                                          {project.status || "N/A"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card buyer-card border-0 shadow-sm">
                  <div className="card-body text-center py-5">
                    <div className="mb-3">
                      <i className="bi bi-arrow-left text-muted" style={{ fontSize: "48px" }}></i>
                    </div>
                    <h5 className="text-muted">Select a company</h5>
                    <p className="text-muted">Choose a company from the list to view and manage its details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      {renderCompanyModal()}
      {renderHotelModal()}
      {/* Commented out - Map Users modal temporarily disabled */}
      {/* {renderUserMappingModal()} */}
      {renderProjectMappingModal()}
    </>
  );
};

export default HospitalityManager;
