import React from "react";
import Select from "react-select";
import { HiPlus } from "react-icons/hi";
import styles from "./HospitalityManager.module.css";

const CompanySwitcher = ({ companies, selectedCompanyId, onSelect, onAddCompany, isLoading }) => {
  const options = companies.map((c) => ({
    value: c.id,
    label: c.name,
    region: c.region,
    hotelCount: c.hotels?.length || c.total_hotels || 0,
  }));

  const selectedOption = options.find((o) => o.value === selectedCompanyId) || null;

  const formatOptionLabel = ({ label, region, hotelCount }, { context }) => {
    const isValue = context === "value";
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px", color: isValue ? "#fff" : "#0f172a" }}>{label}</div>
          {region && !isValue && <div style={{ fontSize: "12px", color: "#94a3b8" }}>{region}</div>}
        </div>
        {!isValue && (
          <span style={{
            background: "#f1f5f9",
            color: "#64748b",
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "6px",
          }}>
            {hotelCount} BU{hotelCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  };

  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "44px",
      borderRadius: "10px",
      border: state.isFocused ? "1.5px solid #2E5BA8" : "1.5px solid rgba(255,255,255,0.3)",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(46, 91, 168,0.15)" : "none",
      background: "rgba(255,255,255,0.15)",
      cursor: "pointer",
      "&:hover": { borderColor: "rgba(255,255,255,0.5)" },
    }),
    singleValue: (base) => ({
      ...base,
      color: "#fff",
      fontWeight: 600,
      fontSize: "14px",
    }),
    placeholder: (base) => ({
      ...base,
      color: "rgba(255,255,255,0.6)",
      fontSize: "14px",
    }),
    input: (base) => ({
      ...base,
      color: "#fff",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      border: "1px solid #e5e7eb",
      zIndex: 100,
    }),
    menuList: (base) => ({
      ...base,
      padding: "6px",
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: "8px",
      padding: "10px 14px",
      cursor: "pointer",
      backgroundColor: state.isSelected
        ? "#f2f6ff"
        : state.isFocused
        ? "#f8fafc"
        : "transparent",
      color: "#0f172a",
      "&:active": { backgroundColor: "#e8efff" },
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "rgba(255,255,255,0.7)",
      "&:hover": { color: "#fff" },
    }),
  };

  return (
    <div className={styles.headerActions}>
      <div className={styles.companySwitcherWrap}>
        <Select
          options={options}
          value={selectedOption}
          onChange={(opt) => onSelect(opt?.value)}
          formatOptionLabel={formatOptionLabel}
          styles={customStyles}
          isSearchable
          isLoading={isLoading}
          placeholder="Select a company..."
          noOptionsMessage={() => "No companies found"}
        />
      </div>
      <button type="button" className={styles.addCompanyBtn} onClick={onAddCompany}>
        <HiPlus size={16} />
        <span>Add Company</span>
      </button>
    </div>
  );
};

export default CompanySwitcher;
