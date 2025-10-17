import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState, useEffect } from "react";

const UploadFiles = ({
  noLabel,
  accept,
  upload,
  reset,
  preview,
  label,
  isMultiple = true,
  isDisabled = false,
}) => {
  const [uid, setUid] = useState();
  const [selectedFiles, setSelectedFiles] = useState(undefined);
  const [filePreviews, setFilePreviews] = useState([]);
  const [progressInfos, setProgressInfos] = useState(0);
  const [viewFiles, setViewFiles] = useState([]);

  useEffect(() => {
    setUid(Date.now() + (Math.random() * 100000).toFixed());
  }, []);

  useEffect(() => {
    if (reset) {
      setSelectedFiles(undefined);
      setFilePreviews([]);
      upload([]);
    }
  }, [reset]);

  useEffect(() => {
    if (preview) {
      // Normalize API data into expected format
      const normalized = preview.map((item) => ({
        file_url: item.file_url || item.file_path, // API or old format
        file_name: item.file_name || "file",
        type: item.file_url?.endsWith(".pdf")
          ? "application/pdf"
          : "image", // quick type check
      }));
      setViewFiles(normalized);
    }
  }, [preview]);

  const selectFiles = (event) => {
    let files = [];
    for (let i = 0; i < event.target.files.length; i++) {
      files.push({
        file: URL.createObjectURL(event.target.files[i]),
        type: event.target.files[i].type,
        name: event.target.files[i].name,
      });
    }
    upload(Array.from(event.target.files));
    setSelectedFiles(Array.from(event.target.files));
    setFilePreviews(files);
  };

  const handleRemoveFile = (index) => {
    upload(selectedFiles.filter((_, i) => i !== index));
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setFilePreviews(filePreviews.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="col-md-12">
        <div className="form-group">
          {noLabel != "true" ? (
            <label htmlFor="">{label ? label : "Upload files"}</label>
          ) : null}
          <input
            type="file"
            className="file-control"
            multiple={isMultiple}
            onChange={selectFiles}
            id={`file_upload${uid}`}
            accept={accept?.toString()}
            disabled={isDisabled}
          />
          <label htmlFor={`file_upload${uid}`} className="label-file">
            <span>Choose file</span>
          </label>
        </div>

        {progressInfos > 0 && (
          <div className="progress mb-3">
            <div
              className="progress-bar progress-bar-striped bg-success progress-bar-animated"
              role="progressbar"
              style={{ width: `${progressInfos}%` }}
              aria-valuenow={progressInfos}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        )}
      </div>

      {/* Newly selected files */}
      {filePreviews &&
        filePreviews.map((img, i) => (
          <div
            className="col-md-2 doc-thumb"
            key={i}
            onClick={() => handleRemoveFile(i)}
          >
            {img.type !== "application/pdf" ? (
              <img
                className="preview"
                src={img.file}
                alt={"file-" + i}
                width={140}
                height={164}
              />
            ) : (
              <a href={img.file} target="_blank" rel="noreferrer">
                <FontAwesomeIcon icon={faEye} /> {img.name}
              </a>
            )}
          </div>
        ))}

      {/* Pre-filled files from API */}
      {viewFiles &&
        viewFiles.map((item, i) => (
          <div className="col-md-2 doc-thumb hide-close" key={i}>
            {item.type !== "application/pdf" ? (
              <img
                className="preview"
                src={item.file_url}
                alt={item.file_name}
                width={140}
                height={164}
              />
            ) : (
              <a href={item.file_url} target="_blank" rel="noreferrer">
                <FontAwesomeIcon icon={faEye} /> {item.file_name}
              </a>
            )}
          </div>
        ))}
    </>
  );
};

export default UploadFiles;
