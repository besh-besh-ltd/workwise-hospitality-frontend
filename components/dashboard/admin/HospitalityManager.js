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
    }
  }, [selectedCompanyId]);

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
      await mapHospitalityUsers(selectedCompanyId, {
        mapping_type: userMappingForm.mappingLevel === "company" ? 0 : 1,
        hotel_id:
          userMappingForm.mappingLevel === "hotel"
            ? parseInt(userMappingForm.hotelId, 10)
            : null,
        user_ids: userMappingForm.users.map((user) =>
          parseInt(user.value, 10)
        ),
        auto_map_projects: userMappingForm.autoMapProjects,
      });
      toast.success("Users mapped successfully");
      setUserMappingForm(defaultUserMappingForm);
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

  const userOptions = companyUsers.map((user) => ({
    value: user.id,
    label: `${user.name} (${user.email})`,
  }));

  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

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
                            Users ({companyUsers.length})
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
                            Projects ({projects.length})
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
