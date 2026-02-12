import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";

const groupContexts = (contexts = []) => {
  const grouped = contexts.reduce((acc, ctx) => {
    const companyId = ctx.hospitality_company_id;
    if (!acc[companyId]) {
      acc[companyId] = {
        companyId,
        companyName: ctx.company_name,
        hasCompanyAccess: false,
        hotels: [],
      };
    }
    if (ctx.mapping_type === 0) {
      acc[companyId].hasCompanyAccess = true;
    } else if (ctx.mapping_type === 1 && ctx.hospitality_hotel_id) {
      acc[companyId].hotels.push({
        id: ctx.hospitality_hotel_id,
        name: ctx.hotel_name,
      });
    }
    return acc;
  }, {});
  return Object.values(grouped);
};

const HospitalityContextModal = ({
  isOpen,
  onClose,
  contexts,
  initialSelection,
  onSelect,
  loading = false,
}) => {
  const groupedContexts = useMemo(
    () => groupContexts(contexts),
    [contexts]
  );

  const [selectedCompany, setSelectedCompany] = useState(
    initialSelection?.companyId || groupedContexts[0]?.companyId || null
  );
  const [selectedHotel, setSelectedHotel] = useState(
    initialSelection?.hotelId || null
  );

  useEffect(() => {
    setSelectedCompany(
      initialSelection?.companyId || groupedContexts[0]?.companyId || null
    );
    setSelectedHotel(initialSelection?.hotelId || null);
  }, [initialSelection, groupedContexts]);

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    setSelectedHotel(null);
  };

  const handleConfirm = () => {
    const company = groupedContexts.find(
      (item) => item.companyId === selectedCompany
    );
    if (!company) {
      onSelect(null);
      return;
    }

    const selected = {
      companyId: company.companyId,
      companyName: company.companyName,
      hotelId: null,
      hotelName: null,
    };

    if (selectedHotel) {
      const hotel = company.hotels.find((item) => item.id === selectedHotel);
      if (hotel) {
        selected.hotelId = hotel.id;
        selected.hotelName = hotel.name;
      }
    }

    onSelect(selected);
  };

  const renderHotelOptions = () => {
    if (!selectedCompany) {
      return (
        <p className="text-muted mb-0">
          Select a company to see available hotels.
        </p>
      );
    }
    const company = groupedContexts.find(
      (item) => item.companyId === selectedCompany
    );
    if (!company) {
      return (
        <p className="text-muted mb-0">
          Select a company to see available hotels.
        </p>
      );
    }
    const hasHotels = company.hotels.length > 0;

    return (
      <>
        {company.hasCompanyAccess && (
          <button
            type="button"
            className={`btn btn-outline-primary w-100 mb-3 ${
              selectedHotel === null ? "active" : ""
            }`}
            onClick={() => setSelectedHotel(null)}
          >
            Use full company access
          </button>
        )}
        <div className="list-group">
          {hasHotels ? (
            company.hotels.map((hotel) => (
              <button
                key={hotel.id}
                type="button"
                className={`list-group-item list-group-item-action ${
                  selectedHotel === hotel.id ? "active" : ""
                }`}
                onClick={() => setSelectedHotel(hotel.id)}
              >
                {hotel.name}
              </button>
            ))
          ) : (
            <p className="text-muted mb-0">
              No hotels available for this company yet.
            </p>
          )}
        </div>
      </>
    );
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Select Hospitality Context</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <p className="text-muted mb-0">Loading hospitality access…</p>
        ) : groupedContexts.length === 0 ? (
          <p className="text-muted mb-0">
            You do not have hospitality access yet. Contact your admin to be
            mapped to a company or hotel.
          </p>
        ) : (
          <div className="row">
            <div className="col-md-4 border-end">
              <h6 className="mb-3">Companies</h6>
              <div className="list-group">
                {groupedContexts.map((company) => (
                  <button
                    key={company.companyId}
                    type="button"
                    className={`list-group-item list-group-item-action ${
                      selectedCompany === company.companyId ? "active" : ""
                    }`}
                    onClick={() => handleCompanyChange(company.companyId)}
                  >
                    {company.companyName}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-md-8">
              <h6 className="mb-3">Business Units / Scope</h6>
              {renderHotelOptions()}
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-outline-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={groupedContexts.length === 0}
        >
          Save Selection
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default HospitalityContextModal;

