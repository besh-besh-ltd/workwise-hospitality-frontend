import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { BsBuilding } from "react-icons/bs";
import { HiPlus } from "react-icons/hi";
import {
  createHospitalityCompany,
  createHospitalityHotel,
  createHOBusinessUnit,
  updateHospitalityHotel,
  getHospitalityCompanies,
  getHospitalityHotels,
  getHotelDocuments,
  getCompanyUserMappings,
  deleteUserMapping,
} from "@/services/hospitality";

import CompanySwitcher from "./hospitality-manager/CompanySwitcher";
import CompanyOverview from "./hospitality-manager/CompanyOverview";
import BusinessUnitsTab from "./hospitality-manager/BusinessUnitsTab";
import PeopleTab from "./hospitality-manager/PeopleTab";
import CompanyFormModal from "./hospitality-manager/modals/CompanyFormModal";
import HotelFormModal from "./hospitality-manager/modals/HotelFormModal";
import PaymentModal from "./hospitality-manager/modals/PaymentModal";
import styles from "./hospitality-manager/HospitalityManager.module.css";

const dedupeHospitalityMappings = (list = []) => {
  const seen = new Set();
  return list.filter((item) => {
    const key =
      item.mapping_type === 0
        ? `company-${item.user_id}`
        : `hotel-${item.user_id}-${item.hospitality_hotel_id || "null"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const HospitalityManager = () => {
  const router = useRouter();

  // --- Core Data ---
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [companyUserMappings, setCompanyUserMappings] = useState([]);
  const [hotelUserMappings, setHotelUserMappings] = useState({});

  // --- UI State ---
  const [activeTab, setActiveTab] = useState("hotels");
  const [userMappingFilter, setUserMappingFilter] = useState("all");
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [hotelDocuments, setHotelDocuments] = useState({ gst: null, pan: null, cancelled_cheque: null, msme: null });

  // --- Loading States ---
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [isSubmittingHotel, setIsSubmittingHotel] = useState(false);
  const [isLoadingCompanyMappingList, setIsLoadingCompanyMappingList] = useState(false);

  // --- Derived Data ---
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const filteredUserMappings = useMemo(() => {
    if (userMappingFilter === "all") return companyUserMappings;
    const filterType = userMappingFilter === "company" ? 0 : 1;
    return companyUserMappings.filter((u) => u.mapping_type === filterType);
  }, [companyUserMappings, userMappingFilter]);

  const activeHotelCount = useMemo(
    () => hotels.filter((h) => h.status === "Active").length,
    [hotels]
  );

  const hasPendingPayments = useMemo(
    () => hotels.some((h) => h.payment_status !== "active" && parseFloat(h.fee_amount || 0) > 0),
    [hotels]
  );

  // --- Data Loading ---
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
    if (!companyId) { setHotels([]); return; }
    try {
      setIsLoadingHotels(true);
      const response = await getHospitalityHotels(companyId);
      setHotels(response?.data ?? response ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load business units");
    } finally {
      setIsLoadingHotels(false);
    }
  };

  const loadCompanyUserMappings = async () => {
    if (!selectedCompanyId) { setCompanyUserMappings([]); return; }
    try {
      setIsLoadingCompanyMappingList(true);
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

  const loadHotelUserMappings = async (hotelId) => {
    if (!selectedCompanyId || !hotelId) return;
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
    }
  };

  const getHotelUserCount = (hotelId) => {
    const hotelSpecific = hotelUserMappings?.[hotelId] || [];
    const ids = new Set(hotelSpecific.map((item) => item.user_id));
    let count = hotelSpecific.length;
    companyUserMappings.forEach((item) => {
      if (item.mapping_type === 0 && !ids.has(item.user_id)) count++;
    });
    return count;
  };

  // --- Effects ---
  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadHotels(selectedCompanyId);
      loadCompanyUserMappings();
      setHotelUserMappings({});
      setUserMappingFilter("all");
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId || !hotels.length) return;
    hotels.forEach((hotel) => loadHotelUserMappings(hotel.id));
  }, [selectedCompanyId, hotels]);

  // --- Handlers ---
  const handleCompanySubmit = async (form, documents, resetForm) => {
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    if (!form.pan.trim()) { toast.error("PAN is required"); return; }

    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(form.pan.toUpperCase().trim())) {
      toast.error("PAN must be 10 characters in format: ABCDE1234F");
      return;
    }
    if (form.gst && form.gst.trim()) {
      const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstPattern.test(form.gst.toUpperCase().trim())) {
        toast.error("GST must be 15 characters in format: 27AABCU9603R1ZX");
        return;
      }
    }

    try {
      setIsSubmittingCompany(true);
      await createHospitalityCompany(
        {
          name: form.name.trim(),
          region: form.region.trim() || "",
          contact_email: form.contact_email.trim() || "",
          registered_office_address: form.registered_office_address.trim() || "",
          corporate_office_address: form.corporate_office_address.trim() || "",
          gst: form.gst.trim() ? form.gst.toUpperCase().trim() : "",
          pan: form.pan.toUpperCase().trim(),
          bank_account_number: form.bank_account_number.trim() || "",
          bank_name: form.bank_name.trim() || "",
          ifsc_code: form.ifsc_code.trim() || "",
          account_holder_name: form.account_holder_name.trim() || "",
          msme: form.msme.trim() || "",
        },
        documents
      );
      toast.success("Company created successfully!");
      resetForm();
      setShowCompanyModal(false);
      loadCompanies();
    } catch (error) {
      console.error(error);
      toast.error(error?.message?.response?.data?.message || "Failed to create company");
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  const handleHotelSubmit = async (form, documents, resetForm) => {
    if (!selectedCompanyId) { toast.error("Select a company first"); return; }
    if (!form.name.trim()) { toast.error("Business unit name is required"); return; }

    if (form.pan && form.pan.trim()) {
      const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panPattern.test(form.pan.toUpperCase().trim())) {
        toast.error("PAN must be 10 characters in format: ABCDE1234F");
        return;
      }
    }
    if (form.gst && form.gst.trim()) {
      const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstPattern.test(form.gst.toUpperCase().trim())) {
        toast.error("GST must be 15 characters in format: 27AABCU9603R1ZX");
        return;
      }
    }

    try {
      setIsSubmittingHotel(true);
      const payload = {
        name: form.name.trim(),
        city: form.city.trim() || "",
        status: form.status,
        full_address: form.full_address.trim() || "",
        state: form.state.trim() || "",
        gst: form.gst.trim() ? form.gst.toUpperCase().trim() : "",
        pan: form.pan.trim() ? form.pan.toUpperCase().trim() : "",
        bank_account_number: form.bank_account_number.trim() || "",
        bank_name: form.bank_name.trim() || "",
        ifsc_code: form.ifsc_code.trim() || "",
        account_holder_name: form.account_holder_name.trim() || "",
        msme: form.msme.trim() || "",
        delivery_address: form.delivery_address.trim() || "",
        email: form.email.trim() || "",
        fee_amount: form.fee_amount ? parseInt(form.fee_amount, 10) : 500,
      };

      if (editingHotel) {
        await updateHospitalityHotel(selectedCompanyId, editingHotel.id, payload, documents);
        toast.success("Business unit updated successfully!");
      } else {
        await createHospitalityHotel(selectedCompanyId, payload, documents);
        toast.success("Business unit added successfully!");
        setCompanies((prev) =>
          prev.map((company) =>
            company.id === selectedCompanyId
              ? { ...company, total_hotels: (company.total_hotels || 0) + 1 }
              : company
          )
        );
      }

      resetForm();
      setEditingHotel(null);
      setShowHotelModal(false);
      setHotelDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
      loadHotels(selectedCompanyId);
    } catch (error) {
      console.error(error);
      toast.error(error?.message?.response?.data?.message || `Failed to ${editingHotel ? "update" : "add"} business unit`);
    } finally {
      setIsSubmittingHotel(false);
    }
  };

  const handleEditHotel = async (hotel) => {
    setEditingHotel(hotel);
    const docMap = { gst: null, pan: null, cancelled_cheque: null, msme: null };
    try {
      const response = await getHotelDocuments(hotel.id);
      const docs = response?.data || response || [];
      (Array.isArray(docs) ? docs : []).forEach((doc) => {
        if (doc.document_type && doc.document_url) {
          docMap[doc.document_type] = doc.document_url;
        }
      });
    } catch (error) {
      console.error("Error fetching business unit documents:", error);
      toast.error("Could not load existing documents");
    }
    setHotelDocuments(docMap);
    setShowHotelModal(true);
  };

  const handleSetHierarchy = (hotel) => {
    router.push(
      `/dashboard/admin/hospitality-manager/approval-hierarchy?companyId=${selectedCompanyId}&hotelId=${hotel.id}`
    );
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
      toast.error("Failed to remove mapping");
    }
  };

  const handleCreateHO = async () => {
    if (!selectedCompanyId) { toast.error("Select a company first"); return; }
    const confirmCreate = window.confirm(
      "This will create a Head Office business unit with the same name and details as the parent company. Continue?"
    );
    if (!confirmCreate) return;
    try {
      setIsLoadingHotels(true);
      await createHOBusinessUnit(selectedCompanyId);
      toast.success("Head Office business unit created successfully!");
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedCompanyId
            ? { ...company, total_hotels: (company.total_hotels || 0) + 1 }
            : company
        )
      );
      loadHotels(selectedCompanyId);
    } catch (error) {
      console.error(error);
      toast.error(error?.message?.response?.data?.message || "Failed to create HO business unit");
    } finally {
      setIsLoadingHotels(false);
    }
  };

  // --- Welcome State (no companies) ---
  if (!isLoadingCompanies && companies.length === 0) {
    return (
      <>
        <section className="buyer-common-header sc-pt-80">
          <div className="container-fluid">
            <h1 className={styles.pageTitle}>Hospitality Network</h1>
          </div>
        </section>
        <section className="buyer-sec-1">
          <div className="container-fluid">
            <div className={styles.welcomeCard}>
              <div className={styles.welcomeIconWrap}>
                <BsBuilding size={44} />
              </div>
              <h2 className={styles.welcomeTitle}>Welcome to Hospitality Network</h2>
              <p className={styles.welcomeDescription}>
                Get started by creating your first hospitality company. You can then add business units,
                map users, and manage projects for your hospitality business.
              </p>
              <button
                type="button"
                className={styles.welcomeBtn}
                onClick={() => setShowCompanyModal(true)}
              >
                <HiPlus size={20} />
                Create Your First Company
              </button>
            </div>
          </div>
        </section>
        <CompanyFormModal
          isOpen={showCompanyModal}
          onClose={() => setShowCompanyModal(false)}
          onSubmit={handleCompanySubmit}
          isSubmitting={isSubmittingCompany}
        />
      </>
    );
  }

  // --- Main Layout ---
  return (
    <>
      {/* Header */}
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Hospitality Network</h1>
              <div className={styles.pageSubtitle}>Manage your companies, business units and teams</div>
            </div>
            <CompanySwitcher
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              onSelect={setSelectedCompanyId}
              onAddCompany={() => setShowCompanyModal(true)}
              isLoading={isLoadingCompanies}
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="buyer-sec-1">
        <div className="container-fluid">
          {selectedCompany ? (
            <>
              <CompanyOverview
                company={selectedCompany}
                hotelCount={hotels.length}
                userCount={companyUserMappings.length}
                activeCount={activeHotelCount}
              />

              {/* Tab Bar */}
              <div className={styles.tabBar}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "hotels" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("hotels")}
                >
                  Business Units
                  <span className={styles.tabCount}>{hotels.length}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("users")}
                >
                  People
                  <span className={styles.tabCount}>{companyUserMappings.length}</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "hotels" && (
                <BusinessUnitsTab
                  hotels={hotels}
                  getHotelUserCount={getHotelUserCount}
                  onAddHotel={() => {
                    setEditingHotel(null);
                    setHotelDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
                    setShowHotelModal(true);
                  }}
                  onCreateHO={handleCreateHO}
                  onEditHotel={handleEditHotel}
                  onSetHierarchy={handleSetHierarchy}
                  onSendPayment={() => setShowPaymentModal(true)}
                  isLoading={isLoadingHotels}
                  hasPendingPayments={hasPendingPayments}
                />
              )}

              {activeTab === "users" && (
                <PeopleTab
                  users={filteredUserMappings}
                  filter={userMappingFilter}
                  onFilterChange={setUserMappingFilter}
                  onRemoveUser={handleRemoveUserMapping}
                  isLoading={isLoadingCompanyMappingList}
                />
              )}
            </>
          ) : (
            <div className={styles.emptyState} style={{ paddingTop: "80px" }}>
              <div className={styles.emptyIcon}>
                <BsBuilding size={36} />
              </div>
              <h3 className={styles.emptyTitle}>Select a company</h3>
              <p className={styles.emptyDescription}>
                Choose a company from the dropdown above to view and manage its details.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <CompanyFormModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onSubmit={handleCompanySubmit}
        isSubmitting={isSubmittingCompany}
      />
      <HotelFormModal
        isOpen={showHotelModal}
        onClose={() => {
          setShowHotelModal(false);
          setEditingHotel(null);
          setHotelDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
        }}
        onSubmit={handleHotelSubmit}
        isSubmitting={isSubmittingHotel}
        editingHotel={editingHotel}
        companyName={selectedCompany?.name}
        existingDocuments={hotelDocuments}
      />
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        hotels={hotels}
        company={selectedCompany}
        selectedCompanyId={selectedCompanyId}
        onSuccess={() => loadHotels(selectedCompanyId)}
      />
    </>
  );
};

export default HospitalityManager;
