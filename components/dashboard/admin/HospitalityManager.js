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
};

const defaultHotelForm = {
  name: "",
  city: "",
  keys: "",
  status: "Active",
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

const HospitalityManager = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [companyForm, setCompanyForm] = useState(defaultCompanyForm);
  const [hotelForm, setHotelForm] = useState(defaultHotelForm);
  const [userMappingForm, setUserMappingForm] = useState(
    defaultUserMappingForm
  );
  const [projectMappingForm, setProjectMappingForm] = useState(
    defaultProjectMappingForm
  );

  const [showCompanyModal, setShowCompanyModal] = useState(false);

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
  const [isLoadingCompanyMappingList, setIsLoadingCompanyMappingList] =
    useState(false);
  const [hotelUserLoadingMap, setHotelUserLoadingMap] = useState({});

  const selectedCompany = useMemo(
    () => companies.find((item) => item.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const selectedCompanyHotels = hotels;

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
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to load hospitality companies"
      );
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
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to load hotels for this company"
      );
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
      toast.error("Unable to fetch company users");
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
      toast.error("Unable to fetch projects");
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
      const response = await getMappedUserIds(
        selectedCompanyId,
        mappingType,
        hotelId
      );
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
      const mappingType =
        projectMappingForm.mappingLevel === "company" ? 0 : 1;
      const hotelId =
        projectMappingForm.mappingLevel === "hotel" &&
        projectMappingForm.hotelId
          ? parseInt(projectMappingForm.hotelId, 10)
          : null;
      const response = await getMappedProjectIds(
        selectedCompanyId,
        mappingType,
        hotelId
      );
      const ids = response?.data?.data || response?.data || [];
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
      const response = await getCompanyUserMappings(selectedCompanyId, {
        mappingType: 0,
      });
      const data = response?.data?.data || response?.data || [];
      setCompanyUserMappings(dedupeHospitalityMappings(data));
    } catch (error) {
      console.error(error);
      setCompanyUserMappings([]);
    } finally {
      setIsLoadingCompanyMappingList(false);
    }
  };

  const loadHotelUserMappings = async (hotelId) => {
    if (!selectedCompanyId || !hotelId) {
      return;
    }
    setHotelUserLoadingMap((prev) => ({ ...prev, [hotelId]: true }));
    try {
      const response = await getCompanyUserMappings(selectedCompanyId, {
        mappingType: 1,
        hotelId,
      });
      const data = response?.data?.data || response?.data || [];
      setHotelUserMappings((prev) => ({
        ...prev,
        [hotelId]: dedupeHospitalityMappings(data),
      }));
    } catch (error) {
      console.error(error);
      setHotelUserMappings((prev) => ({
        ...prev,
        [hotelId]: [],
      }));
    } finally {
      setHotelUserLoadingMap((prev) => ({ ...prev, [hotelId]: false }));
    }
  };

  const getHotelUserList = (hotelId) => {
    const hotelSpecific =
      (hotelUserMappings?.[hotelId] || []).map((item) => ({
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
    if (!selectedCompanyId) {
      return;
    }
    const confirmRemove = window.confirm(
      "Are you sure you want to remove this mapping?"
    );
    if (!confirmRemove) {
      return;
    }
    try {
      await deleteUserMapping(mapping.user_id, {
        company_id: selectedCompanyId,
        mapping_type: mapping.mapping_type,
        hotel_id:
          mapping.mapping_type === 1
            ? mapping.hospitality_hotel_id || mapping.hotel_id
            : null,
      });
      toast.success("Mapping removed");
      await loadMappedUserIds();
      await loadCompanyUserMappings();
      if (mapping.mapping_type === 1 && mapping.hospitality_hotel_id) {
        await loadHotelUserMappings(mapping.hospitality_hotel_id);
      } else {
        Object.keys(hotelUserMappings).forEach((hotelId) => {
          loadHotelUserMappings(parseInt(hotelId, 10));
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to remove mapping"
      );
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
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadMappedUserIds();
  }, [
    selectedCompanyId,
    userMappingForm.mappingLevel,
    userMappingForm.hotelId,
  ]);

  useEffect(() => {
    loadMappedProjectIds();
  }, [
    selectedCompanyId,
    projectMappingForm.mappingLevel,
    projectMappingForm.hotelId,
  ]);

  useEffect(() => {
    if (!selectedCompanyId || !selectedCompanyHotels.length) {
      return;
    }
    selectedCompanyHotels.forEach((hotel) => {
      loadHotelUserMappings(hotel.id);
    });
  }, [selectedCompanyId, selectedCompanyHotels]);

  useEffect(() => {
    if (!projects.length) {
      return;
    }
    const mappedSelections = projects
      .filter((project) => mappedProjectIds.includes(project.id))
      .map((project) => ({
        value: project.id,
        label: project.name,
        isDisabled: true,
      }));
    setProjectMappingForm((prev) => ({
      ...prev,
      projects: mappedSelections,
    }));
  }, [mappedProjectIds, projects]);

  const handleCompanySubmit = async (event) => {
    event.preventDefault();
    if (!companyForm.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    try {
      setIsSubmittingCompany(true);
      await createHospitalityCompany({
        name: companyForm.name.trim(),
        region: companyForm.region.trim() || "",
        contact_email: companyForm.contact_email.trim() || "",
      });
      toast.success("Hospitality company created");
      setCompanyForm(defaultCompanyForm);
      setShowCompanyModal(false);
      loadCompanies();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to create hospitality company"
      );
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
      toast.error("Hotel name is required");
      return;
    }
    try {
      setIsSubmittingHotel(true);
      await createHospitalityHotel(selectedCompanyId, {
        name: hotelForm.name.trim(),
        city: hotelForm.city.trim() || "",
        keys: hotelForm.keys ? parseInt(hotelForm.keys, 10) : 0,
        status: hotelForm.status,
      });
      toast.success("Hotel created");
      setHotelForm(defaultHotelForm);
      loadHotels(selectedCompanyId);
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedCompanyId
            ? {
                ...company,
                total_hotels: (company.total_hotels || 0) + 1,
              }
            : company
        )
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to create hotel"
      );
    } finally {
      setIsSubmittingHotel(false);
    }
  };

  const handleUserMappingSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      toast.error("Select a company");
      return;
    }
    if (!userMappingForm.users.length) {
      toast.error("Select at least one user");
      return;
    }
    if (
      userMappingForm.mappingLevel === "hotel" &&
      !userMappingForm.hotelId
    ) {
      toast.error("Select a hotel for hotel-level mapping");
      return;
    }
    try {
      setIsMappingUsers(true);
      const mappingLevel = userMappingForm.mappingLevel;
      const targetHotelId =
        mappingLevel === "hotel"
          ? parseInt(userMappingForm.hotelId, 10)
          : null;
      await mapHospitalityUsers(selectedCompanyId, {
        mapping_type: mappingLevel === "company" ? 0 : 1,
        hotel_id: targetHotelId,
        user_ids: userMappingForm.users.map((user) =>
          parseInt(user.value, 10)
        ),
        auto_map_projects: userMappingForm.autoMapProjects,
      });
      toast.success("Users mapped successfully");
      setUserMappingForm(defaultUserMappingForm);
      await loadMappedUserIds();
      await loadCompanyUserMappings();
      if (mappingLevel === "hotel" && targetHotelId) {
        await loadHotelUserMappings(targetHotelId);
      } else {
        selectedCompanyHotels.forEach((hotel) => {
          loadHotelUserMappings(hotel.id);
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to map users"
      );
    } finally {
      setIsMappingUsers(false);
    }
  };

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
    if (
      projectMappingForm.mappingLevel === "hotel" &&
      !projectMappingForm.hotelId
    ) {
      toast.error("Select a hotel for hotel-level mapping");
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
        project_ids: projectMappingForm.projects.map((project) =>
          parseInt(project.value, 10)
        ),
      });
      toast.success("Projects mapped successfully");
      setProjectMappingForm(defaultProjectMappingForm);
      await loadMappedProjectIds();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to map projects"
      );
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

  const availableUserCount = userOptions.length;
  const availableProjectCount = projectOptions.filter(
    (option) => !option.isDisabled
  ).length;

  const selectStyles = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, maxHeight: "240px" }),
    menuList: (base) => ({ ...base, maxHeight: "240px" }),
  };

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <div className="d-flex align-items-end justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="heading mb-0">Hospitality Network</h1>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCompanyModal(true)}
            >
              Create Company
            </button>
          </div>
        </div>
      </section>

      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="card buyer-card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div>
                      <h5 className="mb-1">Companies</h5>
                      <small className="text-muted">
                        {isLoadingCompanies
                          ? "Loading..."
                          : `${companies.length} active company profiles`}
                      </small>
                    </div>
                  </div>
                  <div className="list-group list-group-flush border-top">
                    {companies.length === 0 && !isLoadingCompanies && (
                      <p className="text-muted mt-3 mb-0">
                        No hospitality companies yet. Create one to get started.
                      </p>
                    )}
                    {companies.map((company) => {
                      const isActive = selectedCompanyId === company.id;
                      return (
                        <button
                          key={company.id}
                          type="button"
                          className={`list-group-item list-group-item-action border-0 mb-2 rounded-3 d-flex justify-content-between align-items-center ${
                            isActive ? "shadow-sm" : ""
                          }`}
                          style={
                            isActive
                              ? { backgroundColor: "#158993", color: "#fff" }
                              : {}
                          }
                          onClick={() => setSelectedCompanyId(company.id)}
                        >
                          <div>
                            <div className="fw-semibold">{company.name}</div>
                            <small
                              className="d-block"
                              style={{
                                color: isActive ? "#ffffff" : "#6c757d",
                              }}
                            >
                              {company.region || "Region not set"}
                            </small>
                          </div>
                          <span
                            className={`badge rounded-pill ${
                              isActive
                                ? "bg-white text-dark"
                                : "bg-light text-dark"
                            }`}
                            style={{
                              minWidth: 75,
                              color: isActive ? "#158993" : undefined,
                            }}
                          >
                            {company.total_hotels || 0} Hotels
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="card buyer-card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-1">Company Snapshot</h5>
                      <small className="text-muted">
                        Hospitality access is enabled by default
                      </small>
                    </div>
                    <span className="badge badge-info">
                      {selectedCompanyHotels.length} Hotels
                    </span>
                  </div>
                  {selectedCompany ? (
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <div className="border rounded p-3">
                          <small className="text-muted d-block">Company</small>
                          <span className="fw-semibold">
                            {selectedCompany.name}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="border rounded p-3">
                          <small className="text-muted d-block">Region</small>
                          <span className="fw-semibold">
                            {selectedCompany.region || "Not set"}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="border rounded p-3">
                          <small className="text-muted d-block">Contact</small>
                          <span className="fw-semibold">
                            {selectedCompany.contact_email || "Not provided"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted mb-0">
                      Select a company to preview its profile.
                    </p>
                  )}
                </div>
              </div>

              <div className="card buyer-card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-1">Company Users</h5>
                      <small className="text-muted">
                        Users mapped at company level inherit every hotel
                      </small>
                    </div>
                    <span className="badge bg-light text-dark">
                      {companyUserMappings.length} Users
                    </span>
                  </div>
                  {isLoadingCompanyMappingList ? (
                    <p className="text-muted mb-0">Loading users...</p>
                  ) : companyUserMappings.length === 0 ? (
                    <p className="text-muted mb-0">
                      No users mapped to this company yet.
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Auto Map Projects</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyUserMappings.map((user) => (
                            <tr key={`${user.user_id}-company`}>
                              <td>
                                <div className="fw-semibold">
                                  {user.name || "N/A"}
                                </div>
                                <small className="text-muted">
                                  {user.email || "No email"}
                                </small>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    user.auto_map_projects
                                      ? "bg-success"
                                      : "bg-secondary"
                                  }`}
                                >
                                  {user.auto_map_projects ? "Yes" : "No"}
                                </span>
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
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

              <div className="card buyer-card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <h5 className="mb-0">Hotel Inventory</h5>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted">Mapped to</span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "#e0f2f1",
                          color: "#0f766e",
                          fontWeight: 600,
                        }}
                      >
                        {selectedCompany?.name || "N/A"}
                      </span>
                    </div>
                  </div>
                  <form className="row g-3 mb-4" onSubmit={handleHotelSubmit}>
                    <div className="col-md-4">
                      <label className="form-label">Hotel Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={hotelForm.name}
                        onChange={(e) =>
                          setHotelForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Ex: UrbanStay Lakeside"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={hotelForm.city}
                        onChange={(e) =>
                          setHotelForm((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        placeholder="Ex: Udaipur"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Keys</label>
                      <input
                        type="number"
                        className="form-control"
                        value={hotelForm.keys}
                        onChange={(e) =>
                          setHotelForm((prev) => ({
                            ...prev,
                            keys: e.target.value,
                          }))
                        }
                        placeholder="120"
                        min={0}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-control"
                        value={hotelForm.status}
                        onChange={(e) =>
                          setHotelForm((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                      >
                        <option value="Active">Active</option>
                        <option value="In Review">In Review</option>
                        <option value="Pending Onboarding">
                          Pending Onboarding
                        </option>
                      </select>
                    </div>
                    <div className="col-12 text-end">
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={!selectedCompanyId || isSubmittingHotel}
                      >
                        {isSubmittingHotel ? "Adding..." : "Add Hotel"}
                      </button>
                    </div>
                  </form>

                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Hotel</th>
                          <th>City</th>
                          <th>Inventory (Keys)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingHotels ? (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">
                              Loading hotels...
                            </td>
                          </tr>
                        ) : selectedCompanyHotels.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">
                              No hotels mapped yet. Use the form above to add the
                              first property.
                            </td>
                          </tr>
                        ) : (
                          selectedCompanyHotels.map((hotel) => (
                            <tr key={hotel.id}>
                              <td>{hotel.name}</td>
                              <td>{hotel.city || "—"}</td>
                              <td>{hotel.keys}</td>
                              <td>
                                <span className="badge bg-secondary">
                                  {hotel.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-md-6">
                  <div className="card buyer-card shadow-sm border-0 h-100">
                    <div className="card-body">
                      <h5 className="mb-3">Map Users</h5>
                      <form onSubmit={handleUserMappingSubmit}>
                        <div className="mb-3">
                          <label className="form-label">Mapping Level</label>
                          <select
                            className="form-select"
                            value={userMappingForm.mappingLevel}
                            onChange={(e) =>
                              setUserMappingForm((prev) => ({
                                ...prev,
                                mappingLevel: e.target.value,
                                hotelId:
                                  e.target.value === "company"
                                    ? ""
                                    : prev.hotelId,
                              }))
                            }
                          >
                            <option value="company">Company</option>
                            <option value="hotel">Specific Hotel</option>
                          </select>
                        </div>
                        {userMappingForm.mappingLevel === "hotel" && (
                          <div className="mb-3">
                            <label className="form-label">Select Hotel</label>
                            <select
                              className="form-select"
                              value={userMappingForm.hotelId}
                              onChange={(e) =>
                                setUserMappingForm((prev) => ({
                                  ...prev,
                                  hotelId: e.target.value,
                                }))
                              }
                            >
                              <option value="">Select</option>
                              {selectedCompanyHotels.map((hotel) => (
                                <option value={hotel.id} key={hotel.id}>
                                  {hotel.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="mb-3">
                          <label className="form-label">
                          Users ({availableUserCount})
                          </label>
                          <Select
                            isMulti
                            isSearchable
                            options={userOptions}
                            value={userMappingForm.users}
                            onChange={(selected) =>
                              setUserMappingForm((prev) => ({
                                ...prev,
                                users: selected || [],
                              }))
                            }
                            placeholder={
                              isLoadingUsers ? "Loading users..." : "Pick users"
                            }
                            isLoading={isLoadingUsers}
                            styles={selectStyles}
                            menuPortalTarget={document.body}
                          />
                          <small className="text-muted">
                            Start typing to search users.
                          </small>
                        </div>
                        <div className="form-check form-switch mb-3">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="auto-map-projects"
                            checked={userMappingForm.autoMapProjects}
                            onChange={(e) =>
                              setUserMappingForm((prev) => ({
                                ...prev,
                                autoMapProjects: e.target.checked,
                              }))
                            }
                          />
                          <label
                            className="form-check-label"
                            htmlFor="auto-map-projects"
                          >
                            Auto add selected users to all mapped projects
                          </label>
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary w-100"
                          disabled={!selectedCompanyId || isMappingUsers}
                        >
                          {isMappingUsers ? "Mapping..." : "Map Users"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card buyer-card shadow-sm border-0 h-100">
                    <div className="card-body">
                      <h5 className="mb-3">Map Projects</h5>
                      <form onSubmit={handleProjectMappingSubmit}>
                        <div className="mb-3">
                          <label className="form-label">Mapping Level</label>
                          <select
                            className="form-select"
                            value={projectMappingForm.mappingLevel}
                            onChange={(e) =>
                              setProjectMappingForm((prev) => ({
                                ...prev,
                                mappingLevel: e.target.value,
                                hotelId:
                                  e.target.value === "company"
                                    ? ""
                                    : prev.hotelId,
                              }))
                            }
                          >
                            <option value="company">Company</option>
                            <option value="hotel">Specific Hotel</option>
                          </select>
                        </div>
                        {projectMappingForm.mappingLevel === "hotel" && (
                          <div className="mb-3">
                            <label className="form-label">Select Hotel</label>
                            <select
                              className="form-select"
                              value={projectMappingForm.hotelId}
                              onChange={(e) =>
                                setProjectMappingForm((prev) => ({
                                  ...prev,
                                  hotelId: e.target.value,
                                }))
                              }
                            >
                              <option value="">Select</option>
                              {selectedCompanyHotels.map((hotel) => (
                                <option value={hotel.id} key={hotel.id}>
                                  {hotel.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="mb-3">
                          <label className="form-label">
                          Projects ({availableProjectCount})
                          </label>
                          <Select
                            isMulti
                            isSearchable
                            options={projectOptions}
                            value={projectMappingForm.projects}
                            onChange={(selected) =>
                              setProjectMappingForm((prev) => ({
                                ...prev,
                                projects: selected || [],
                              }))
                            }
                            placeholder={
                              isLoadingProjects
                                ? "Loading projects..."
                                : "Pick projects"
                            }
                            isLoading={isLoadingProjects}
                            isOptionDisabled={(option) => option.isDisabled}
                            styles={selectStyles}
                            menuPortalTarget={document.body}
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-outline-primary w-100"
                          disabled={!selectedCompanyId || isMappingProjects}
                        >
                          {isMappingProjects ? "Mapping..." : "Map Projects"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-4 mt-1">
                <div className="col-12">
                  <div className="card buyer-card shadow-sm border-0">
                    <div className="card-body">
                      <h5 className="mb-3">Hotel User Lists</h5>
                      {selectedCompanyHotels.length === 0 ? (
                        <p className="text-muted mb-0">
                          Add hotels to see their user mappings.
                        </p>
                      ) : (
                        <div className="accordion" id="hotelUsersAccordion">
                          {selectedCompanyHotels.map((hotel) => {
                            const hotelUsers = getHotelUserList(hotel.id);
                            const isLoading =
                              hotelUserLoadingMap?.[hotel.id] || false;
                            return (
                              <div
                                className="mb-3 border rounded"
                                key={`hotel-users-${hotel.id}`}
                              >
                                <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-top">
                                  <div>
                                    <strong>{hotel.name}</strong>
                                    <small className="d-block text-muted">
                                      {hotel.city || "No city"}
                                    </small>
                                  </div>
                                  <span className="badge bg-light text-dark">
                                    {hotelUsers.length} Users
                                  </span>
                                </div>
                                <div className="p-3">
                                  {isLoading ? (
                                    <p className="text-muted mb-0">
                                      Loading users...
                                    </p>
                                  ) : hotelUsers.length === 0 ? (
                                    <p className="text-muted mb-0">
                                      No users mapped directly to this hotel.
                                    </p>
                                  ) : (
                                    <div className="table-responsive">
                                      <table className="table table-sm align-middle mb-0">
                                        <thead>
                                          <tr>
                                            <th>User</th>
                                            <th>Scope</th>
                                            <th className="text-end">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {hotelUsers.map((user) => (
                                            <tr
                                              key={`${user.user_id}-${user.scope}-${hotel.id}`}
                                            >
                                              <td>
                                                <div className="fw-semibold">
                                                  {user.name || "N/A"}
                                                </div>
                                                <small className="text-muted">
                                                  {user.email || "No email"}
                                                </small>
                                              </td>
                                              <td>
                                                <span
                                                  className={`badge ${
                                                    user.scope === "hotel"
                                                      ? "bg-primary"
                                                      : "bg-secondary"
                                                  }`}
                                                >
                                                  {user.scope === "hotel"
                                                    ? "Hotel"
                                                    : "Company"}
                                                </span>
                                              </td>
                                              <td className="text-end">
                                                <button
                                                  type="button"
                                                  className="btn btn-sm btn-outline-danger"
                                                  disabled={
                                                    user.scope === "company"
                                                  }
                                                  title={
                                                    user.scope === "company"
                                                      ? "Company-level users inherit every hotel and cannot be removed here"
                                                      : "Remove user from this hotel"
                                                  }
                                                  onClick={() =>
                                                    user.scope === "hotel" &&
                                                    handleRemoveUserMapping(
                                                      user
                                                    )
                                                  }
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
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal
        isOpen={showCompanyModal}
        onRequestClose={() => setShowCompanyModal(false)}
        ariaHideApp={false}
        style={{
          overlay: {
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            zIndex: 1200,
          },
          content: {
            inset: "50% auto auto 50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "640px",
            width: "90%",
            borderRadius: "20px",
            padding: "32px",
            border: "none",
            boxShadow: "0 24px 60px rgba(15,23,42,0.15)",
          },
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="mb-1">Create Hospitality Company</h4>
            <p className="text-muted mb-0">
              Capture company basics to start mapping hotel inventories.
            </p>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setShowCompanyModal(false)}
            aria-label="Close"
          ></button>
        </div>
        <form className="row g-3" onSubmit={handleCompanySubmit}>
          <div className="col-12">
            <label className="form-label">Company Name</label>
            <input
              type="text"
              className="form-control"
              value={companyForm.name}
              onChange={(e) =>
                setCompanyForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
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
              onChange={(e) =>
                setCompanyForm((prev) => ({
                  ...prev,
                  region: e.target.value,
                }))
              }
              placeholder="Ex: North India"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Primary Contact</label>
            <input
              type="email"
              className="form-control"
              value={companyForm.contact_email}
              onChange={(e) =>
                setCompanyForm((prev) => ({
                  ...prev,
                  contact_email: e.target.value,
                }))
              }
              placeholder="Ex: hospitality@urbanstay.com"
            />
          </div>
          <div className="col-12 text-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmittingCompany}
            >
              {isSubmittingCompany ? "Creating..." : "Add Company"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default HospitalityManager;
