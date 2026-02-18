import React, { useRef } from "react";
import { BsCloudUpload, BsCheckCircleFill, BsXCircle } from "react-icons/bs";
import styles from "./Register.module.css";

const FileUploadField = ({ label, required, accept, file, onChange, error, hint }) => {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (file) return; // don't open picker if file already selected
    inputRef.current?.click();
  };

  const handleChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) onChange(selected);
    // reset input so the same file can be re-selected if removed
    e.target.value = "";
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  const zoneClass = [
    styles.fileDropZone,
    file ? styles.hasFile : "",
    error && !file ? styles.hasError : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.formGroup}>
      {label && (
        <label className={styles.formLabel}>
          {label}
          {required && <span className={styles.formRequired}>*</span>}
        </label>
      )}
      <div className={zoneClass} onClick={handleClick}>
        <input
          ref={inputRef}
          type="file"
          accept={accept || ".pdf,.jpg,.jpeg,.png"}
          onChange={handleChange}
          style={{ display: "none" }}
        />
        {file ? (
          <div className={styles.fileInfo}>
            <BsCheckCircleFill size={16} className={styles.fileInfoIcon} />
            <span className={styles.fileInfoName}>{file.name}</span>
            <button
              type="button"
              className={styles.fileRemoveBtn}
              onClick={handleRemove}
            >
              <BsXCircle size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className={styles.fileDropIcon}>
              <BsCloudUpload size={22} />
            </div>
            <div className={styles.fileDropText}>
              Click to <span>upload</span>
            </div>
            {hint && <div className={styles.fileDropHint}>{hint}</div>}
          </>
        )}
      </div>
      {error && !file && <div className={styles.formError}>{error}</div>}
    </div>
  );
};

export default FileUploadField;
