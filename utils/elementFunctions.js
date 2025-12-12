import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { extractfileName } from "./sharedFunctions";
import { useMemo } from "react";

export const renderFileLink = (fileOrFiles , label = "View File") => {
    if (Array.isArray(fileOrFiles) && fileOrFiles.length > 0) {
        return fileOrFiles.map((file, index) => (
            <a key={index} href={file} target="_blank" className="page-link text-truncate mb-1" style={{ maxWidth: "200px" }}>
                <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
                {label}
            </a>
        ));
    }
    else if (typeof fileOrFiles === "string" && fileOrFiles !== "") {
        return (
            <a href={fileOrFiles} target="_blank" className="page-link text-truncate mb-1" style={{ maxWidth: "200px" }}>
                <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
                {label}
            </a>
        );
    }
    return null;
};

export const renderFileBadge = (fileOrFiles) => {
    if (Array.isArray(fileOrFiles) && fileOrFiles.length > 0) {
        return fileOrFiles.map((file) => (
            <a href={file} target="_blank" key={file} className="file-badge mb-2" type="button" >
                <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
                <span className="text-truncate">{extractfileName(file)}</span>
            </a>
        ));
    }
    else if (typeof fileOrFiles === "string" && fileOrFiles !== "") {
        return (
            <a href={fileOrFiles} target="_blank" key={fileOrFiles} className="file-badge mb-2" type="button" >
                <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
                <span className="text-truncate">{extractfileName(fileOrFiles)}</span>
            </a>
        );
    }
    return null;
};

// hook 
export function useAvailableOptions(
  allOptions,
  selectedOptions,
  key
) {
  return useMemo(() => {
    const selectedValues = new Set(selectedOptions.map(item => item[key]));
    return allOptions.filter(item => !selectedValues.has(item[key]));
  }, [allOptions, selectedOptions, key]);
}