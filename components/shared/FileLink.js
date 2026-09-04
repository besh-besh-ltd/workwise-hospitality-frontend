import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { extractfileName } from '@/utils/sharedFunctions';


const FileLink = ({ Files, Class = "", Style = {}, ColumnClass = "col-12", RemoveFile, FileType = '', showDownload = true }) => {

    return (
        <div className="row">
            {Array.isArray(Files) && Files.length > 0 ? (
                Files.map((file) => (
                    <div key={`${FileType}_${file}`} className={`my-1 ${ColumnClass}`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <a
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-sm text-decoration-underline text-truncate fw-medium ${Class}`}
                                style={{ ...Style }}
                            >
                                {showDownload && <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />}
                                {extractfileName(file)}
                            </a>
                            {RemoveFile && (
                                <span
                                    className="btn-close btn-close-sm"
                                    aria-label="Close"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        RemoveFile(FileType, file)
                                    }}
                                ></span>
                            )}
                        </div>
                    </div>
                ))
            ) : typeof Files === "string" && Files !== "" ? (
                <div className={`my-1 ${ColumnClass}`}>
                    <div className="d-flex justify-content-between align-items-center">
                        <a
                            href={Files}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm text-decoration-underline text-truncate fw-medium ${Class}`}
                            style={{ ...Style }}
                        >
                            {showDownload && <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />}
                            {extractfileName(Files)}
                        </a>
                        {RemoveFile && (
                            <span
                                className="btn-close btn-close-sm"
                                aria-label="Close"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    RemoveFile(FileType, Files)
                                }}
                            ></span>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default FileLink;
