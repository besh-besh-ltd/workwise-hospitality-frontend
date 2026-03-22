import React from "react";
import Select from "react-select";
import Link from "next/link";
import { HiPlus, HiOutlineShieldCheck } from "react-icons/hi";
import styles from "./ManageAccounts.module.scss";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "38px",
    borderRadius: "8px",
    border: state.isFocused ? "1.5px solid #2E5BA8" : "1.5px solid #e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(46, 91, 168,0.1)" : "none",
    fontSize: "13px",
    "&:hover": { borderColor: "#cbd5e1" },
  }),
  placeholder: (base) => ({ ...base, color: "#cbd5e1", fontSize: "13px" }),
  option: (base, state) => ({
    ...base,
    fontSize: "13px",
    backgroundColor: state.isSelected ? "#f2f6ff" : state.isFocused ? "#f8fafc" : "transparent",
    color: "#0f172a",
  }),
  indicatorSeparator: () => ({ display: "none" }),
};

const UserFilters = ({
  filters,
  onFilterChange,
  companyOptions,
  hotelOptions,
  isHospitality,
  onCustomRoles,
}) => {
  return (
    <div className={styles.filterCard}>
      <div className={styles.filterRow}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Search</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="Name, Email or Employee Code"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
          />
        </div>

        {isHospitality && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Company</label>
            <Select
              options={companyOptions}
              value={filters.companyId}
              onChange={(val) => onFilterChange({ companyId: val, hotelId: null })}
              placeholder="All Companies"
              isClearable
              styles={selectStyles}
            />
          </div>
        )}

        {isHospitality && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Business Unit</label>
            <Select
              options={hotelOptions}
              value={filters.hotelId}
              onChange={(val) => onFilterChange({ hotelId: val })}
              placeholder="All Business Units"
              isClearable
              styles={selectStyles}
            />
          </div>
        )}

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status</label>
          <Select
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            value={filters.status}
            onChange={(val) => onFilterChange({ status: val })}
            placeholder="All Statuses"
            isClearable
            styles={selectStyles}
          />
        </div>

        <div className={styles.filterActions}>
          <button type="button" className={styles.outlineBtn} onClick={onCustomRoles}>
            <HiOutlineShieldCheck size={15} />
            <span>Custom Roles</span>
          </button>
          <Link href="/dashboard/admin/account-management/create-account" className={styles.primaryBtn}>
            <HiPlus size={15} />
            <span>Create User</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserFilters;
