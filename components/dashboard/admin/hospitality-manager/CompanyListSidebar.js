import React, { useState } from "react";
import { createPortal } from "react-dom";
import { HiPlus } from "react-icons/hi";
import { BsBuilding, BsSearch } from "react-icons/bs";
import styles from "./HospitalityManager.module.css";

const CompanyListSidebar = ({
  companies,
  selectedCompanyId,
  onSelect,
  onAddCompany,
  isLoading,
  mobileOpen,
  onMobileClose,
}) => {
  const [search, setSearch] = useState("");
  const isMobileDrawer = typeof mobileOpen === "boolean";

  const filtered = search.trim()
    ? companies.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase())
      )
    : companies;

  const mobileDrawerPortal = isMobileDrawer && typeof document !== "undefined"
    ? (content) => createPortal(content, document.body)
    : null;

  const sidebarContent = (
    <>
      {isMobileDrawer && mobileOpen && (
        <div className={styles.companySidebarOverlay} onClick={onMobileClose} />
      )}
      <div className={`${styles.companySidebar} ${isMobileDrawer ? styles.companySidebarMobile : ""} ${isMobileDrawer && mobileOpen ? styles.companySidebarMobileOpen : ""}`}>
      {/* Search */}
      <div className={styles.companySidebarSearch}>
        <BsSearch size={13} className={styles.companySidebarSearchIcon} />
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className={styles.companySidebarList}>
        {isLoading ? (
          <div className={styles.companySidebarEmpty}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.companySidebarEmpty}>
            {search ? "No matches" : "No companies yet"}
          </div>
        ) : (
          filtered.map((company) => {
            const isActive = company.id === selectedCompanyId;
            const hotelCount = company.hotels?.length || company.total_hotels || 0;
            return (
              <button
                key={company.id}
                type="button"
                className={`${styles.companyItem} ${isActive ? styles.companyItemActive : ""}`}
                onClick={() => onSelect(company.id)}
              >
                <div className={styles.companyItemIcon}>
                  <BsBuilding size={14} />
                </div>
                <div className={styles.companyItemInfo}>
                  <span className={styles.companyItemName}>{company.name}</span>
                  {company.region && (
                    <span className={styles.companyItemRegion}>{company.region}</span>
                  )}
                </div>
                <span className={styles.companyItemCount}>
                  {hotelCount}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Add Company */}
      <div className={styles.companySidebarFooter}>
        <button
          type="button"
          className={styles.addCompanySidebarBtn}
          onClick={onAddCompany}
        >
          <HiPlus size={14} />
          Add Company
        </button>
      </div>
      </div>
    </>
  );

  return mobileDrawerPortal ? mobileDrawerPortal(sidebarContent) : sidebarContent;
};

export default CompanyListSidebar;
