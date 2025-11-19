import React, { useMemo, useState } from "react";

const mockCompanies = [
  {
    id: 1,
    name: "PrimeStay Group",
    region: "South India",
    contact: "hospitality@primestay.com",
    hotels: [
      {
        id: 101,
        name: "PrimeStay Marina",
        city: "Chennai",
        keys: 142,
        status: "Active",
      },
      {
        id: 102,
        name: "PrimeStay Dunes",
        city: "Pondicherry",
        keys: 76,
        status: "In Review",
      },
    ],
  },
  {
    id: 2,
    name: "Asteria Hospitality",
    region: "West India",
    contact: "partners@asteriahotels.com",
    hotels: [
      {
        id: 201,
        name: "Asteria Bayfront",
        city: "Goa",
        keys: 188,
        status: "Active",
      },
    ],
  },
];

const HospitalityManager = () => {
  const [companies, setCompanies] = useState(mockCompanies);
  const [selectedCompanyId, setSelectedCompanyId] = useState(mockCompanies[0].id);
  const [hotelsByCompany, setHotelsByCompany] = useState(() => {
    const initial = {};
    mockCompanies.forEach((company) => {
      initial[company.id] = company.hotels;
    });
    return initial;
  });

  const [companyForm, setCompanyForm] = useState({
    name: "",
    region: "",
    contact: "",
  });

  const [hotelForm, setHotelForm] = useState({
    name: "",
    city: "",
    keys: "",
    status: "Active",
  });

  const selectedCompany = useMemo(
    () => companies.find((item) => item.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const selectedCompanyHotels = hotelsByCompany[selectedCompanyId] || [];

  const resetCompanyForm = () =>
    setCompanyForm({
      name: "",
      region: "",
      contact: "",
    });

  const resetHotelForm = () =>
    setHotelForm({
      name: "",
      city: "",
      keys: "",
      status: "Active",
    });

  const handleCompanySubmit = (event) => {
    event.preventDefault();
    if (!companyForm.name.trim()) {
      return;
    }
    const newCompany = {
      id: Date.now(),
      name: companyForm.name.trim(),
      region: companyForm.region.trim() || "Unassigned Region",
      contact: companyForm.contact.trim() || "ops@workwise.com",
      hotels: [],
    };
    setCompanies((prev) => [...prev, newCompany]);
    setHotelsByCompany((prev) => ({
      ...prev,
      [newCompany.id]: [],
    }));
    setSelectedCompanyId(newCompany.id);
    resetCompanyForm();
  };

  const handleHotelSubmit = (event) => {
    event.preventDefault();
    if (!hotelForm.name.trim() || !selectedCompanyId) {
      return;
    }
    const newHotel = {
      id: Date.now(),
      name: hotelForm.name.trim(),
      city: hotelForm.city.trim() || "Not Specified",
      keys: hotelForm.keys ? parseInt(hotelForm.keys, 10) : 0,
      status: hotelForm.status,
    };
    setHotelsByCompany((prev) => ({
      ...prev,
      [selectedCompanyId]: [...(prev[selectedCompanyId] || []), newHotel],
    }));
    resetHotelForm();
  };

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <div className="d-flex align-items-end justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="heading mb-0">Hospitality Network</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="row g-4">
          <div className="col-lg-4">
            <div className="card buyer-card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="mb-1">Companies</h5>
                    <small className="text-muted">
                      {companies.length} active company profiles
                    </small>
                  </div>
                  <span className="badge badge-light text-dark">
                    Hospitality
                  </span>
                </div>
                <div className="list-group list-group-flush border-top">
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
                            style={{ color: isActive ? "#ffffff" : "#6c757d" }}
                          >
                            {company.region}
                          </small>
                        </div>
                        <span
                          className={`badge rounded-pill ${
                            isActive ? "bg-white text-dark" : "bg-light text-dark"
                          }`}
                          style={
                            isActive ? { color: "#158993", minWidth: 75 } : { minWidth: 75 }
                          }
                        >
                          {(hotelsByCompany[company.id] || []).length} Hotels
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
                  <>
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <div className="border rounded p-3">
                          <small className="text-muted d-block">
                            Company Name
                          </small>
                          <span className="fw-semibold">
                            {selectedCompany.name}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="border rounded p-3">
                          <small className="text-muted d-block">
                            Operating Region
                          </small>
                          <span className="fw-semibold">
                            {selectedCompany.region}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="border rounded p-3">
                          <small className="text-muted d-block">
                            Hospitality Contact
                          </small>
                          <span className="fw-semibold">
                            {selectedCompany.contact}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted mb-0">
                    Select a company to preview its profile.
                  </p>
                )}
              </div>
            </div>

            <div className="card buyer-card shadow-sm border-0 mb-4">
              <div className="card-body">
                <h5 className="mb-3">Create Hospitality Company</h5>
                <form className="row g-3" onSubmit={handleCompanySubmit}>
                  <div className="col-md-4">
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
                    />
                  </div>
                  <div className="col-md-4">
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
                  <div className="col-md-4">
                    <label className="form-label">Primary Contact</label>
                    <input
                      type="email"
                      className="form-control"
                      value={companyForm.contact}
                      onChange={(e) =>
                        setCompanyForm((prev) => ({
                          ...prev,
                          contact: e.target.value,
                        }))
                      }
                      placeholder="Ex: hospitality@urbanstay.com"
                    />
                  </div>
                  <div className="col-12 text-end">
                    <button type="submit" className="btn btn-dark">
                      Add Company
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card buyer-card shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Hotel Inventory</h5>
                  <span className="text-muted">
                    Mapped to {selectedCompany?.name || "N/A"}
                  </span>
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
                      placeholder="Ex: 120"
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
                      <option value="Pending Onboarding">Pending Onboarding</option>
                    </select>
                  </div>
                  <div className="col-12 text-end">
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={!selectedCompanyId}
                    >
                      Add Hotel
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
                      {selectedCompanyHotels.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-4">
                            No hotels mapped yet. Use the form above to add the first
                            property.
                          </td>
                        </tr>
                      ) : (
                        selectedCompanyHotels.map((hotel) => (
                          <tr key={hotel.id}>
                            <td>{hotel.name}</td>
                            <td>{hotel.city}</td>
                            <td>{hotel.keys}</td>
                            <td>
                              <span className="badge bg-secondary">{hotel.status}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HospitalityManager;



