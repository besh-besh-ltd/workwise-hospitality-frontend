import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
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
      setViewFiles(preview);
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
          ) : (
            ""
          )}
          {isMultiple == true ? (
            <input
              type="file"
              data-multiple-caption="{count} files selected"
              className="file-control"
              multiple
              onChange={selectFiles}
              id={`file_upload${uid}`}
              accept={accept.toString()}
              disabled={isDisabled}
            />
          ) : (
            <input
              type="file"
              data-multiple-caption="{count} files selected"
              className="file-control"
              onChange={selectFiles}
              id={`file_upload${uid}`}
              accept={accept.toString()}
              disabled={isDisabled}
            />
          )}

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
      {filePreviews &&
        filePreviews.map((img, i) => {
          return (
            <>
              <div
                className="col-md-2 doc-thumb"
                key={i}
                onClick={() => {
                  handleRemoveFile(i);
                }}
              >
                {img.type !== "application/pdf" && (
                  <img
                    className="preview"
                    src={img.file}
                    alt={"file-" + i}
                    width={140}
                    height={164}
                    priority="true"
                  />
                )}
              </div>
              {img.type == "application/pdf" && (
                <a href={img.file} target="_blank">
                  <FontAwesomeIcon icon={faEye} />
                  {img.name}
                </a>
              )}
            </>
          );
        })}
      {viewFiles &&
        viewFiles.map((item, i) => {
          return (
            <div className="col-md-2 doc-thumb hide-close" key={i}>
              <img
                className="preview"
                src={item.file_path}
                alt={"file-" + i}
                width={140}
                height={164}
                priority="true"
              />
            </div>
          );
        })}
    </>
  );
};

export default UploadFiles;
