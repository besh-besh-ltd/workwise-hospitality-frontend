import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { sendQueryMessage } from "@/services/rfq";
import Link from "next/link";
import { formatDate } from "@/utils/sharedFunctions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

const ChatBox = ({ messages, vendor, rfq_id, role, onMessageSent, vendorwithoutlogintoken, selectedVendors }) => {
  const [messageText, setMessageText] = useState("");
  const [files, setFiles] = useState([]);
  const [sendButtonLoading, setSendButtonLoading] = useState(false);
  const latestMessageRef = useRef(null);

  const isBroadcastMode = Array.isArray(selectedVendors) && selectedVendors.length > 1;

  useEffect(() => {
    if (!isBroadcastMode && latestMessageRef.current) {
      latestMessageRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, isBroadcastMode]);

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [
      ...prevFiles,
      ...selectedFiles.map((file) => ({
        name: file.name,
        file,
      })),
    ]);
  };

  const handleRemoveFile = (fileName) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  const handleSendMessage = async () => {
    setSendButtonLoading(true);

    if (!messageText.trim()) {
      toast.error("Message text can't be empty!", { position: "top-right" });
      setSendButtonLoading(false);
      return;
    }

    const targets = isBroadcastMode ? selectedVendors : vendor ? [vendor] : [];
    if (targets.length === 0) {
      toast.error("Select at least one vendor.");
      setSendButtonLoading(false);
      return;
    }

    try {
      for (const targetVendor of targets) {
        const formData = new FormData();
        formData.append("message_text", messageText);
        formData.append("rfq_id", rfq_id);
        formData.append("receiver_id", targetVendor.user_id);
        files.forEach((fileObj) => formData.append("files", fileObj.file));

        const response = await sendQueryMessage(formData, vendorwithoutlogintoken);
        if (response.status !== 1) {
          toast.error(`Failed to send to ${targetVendor.company_name}`, { position: "top-right" });
        }
      }

      onMessageSent();
      setMessageText("");
      setFiles([]);
      toast.success(`Message sent to ${targets.length} vendor(s)`);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("An error occurred while sending the message.", { position: "top-right" });
    } finally {
      setSendButtonLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100">
      <div className="mb-3 border-bottom pb-2 d-flex">
        <h5 className="me-auto mb-0">{vendor?.company_name ?? "-"}</h5>
        {role === 'buyer' ?
          <Link
            href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${vendor.user_id}`}
            className="p-0 mx-2 d-flex align-items-center"
            aria-label="View Vendor Profile"
            target="_blank"
            rel="noopener noreferrer"
            id="details_button-query_header-queries_page"
          >
            <FontAwesomeIcon icon={faInfoCircle} size="lg" className="me-1" />
            Details
          </Link>
          : null}
      </div>

      <div className="chat-messages flex-grow-1 mb-3" style={{ overflowY: "auto" }}>
        {isBroadcastMode ? (
          <div className="mb-3 border-bottom pb-2">
            <h6>Selected Vendors:</h6>
            <ul>
              {selectedVendors.map((v) => (
                <li key={v.user_id}>{v.company_name}</li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.message_id}
              ref={index === messages.length - 1 ? latestMessageRef : null}
              className={`d-flex ${
                message.direction === "received" ? "" : "justify-content-end"
              } mb-2`}
            >
              <div
                className={`px-3 py-2 me-2 bg-light text-dark rounded shadow-sm`}
                style={{ maxWidth: "70%" }}
              >
                <p className="mb-0">{message.message_text}</p>
                {message.files && message.files.length > 0 && (
                  <div className="mt-2">
                    {message.files.map((file, idx) => (
                      <Link
                        key={idx}
                        href={file.file_url}
                        download={file.file_name}
                        target="_blank"
                        className="d-inline-block badge bg-secondary me-1"
                        style={{
                          maxWidth: "48%",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {file.file_name}
                      </Link>
                    ))}
                  </div>
                )}
                <small className="text-muted d-block mt-1">
                  {message?.sender_name + " -  "}
                  {formatDate(message.created_at)}
                </small>
              </div>
            </div>
          ))
        )}
      </div>

      {files.length > 0 && (
        <div className="uploaded-files mb-3">
          <div className="row mt-2">
            {files.map((file, idx) => (
              <div key={idx} className="col-6">
                <span
                  className="badge bg-secondary d-inline-flex align-items-center justify-content-between w-100 mx-1 my-1"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "95%",
                    }}
                  >
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className="btn-close btn-close-white ms-2"
                    aria-label="Remove"
                    onClick={() => handleRemoveFile(file.name)}
                    style={{ fontSize: "0.8rem" }}
                    id={`remove_file_${idx}-chat_files-chat_box`}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chat-input d-flex align-items-center border-top pt-2">
        <input
          id="browse_attachments-message_input-queries_page"
          type="file"
          multiple
          onChange={handleFileUpload}
          className="form-control me-2"
          style={{ maxWidth: "120px" }}
        />

        <input
          id="type_message-message_input-queries_page"
          type="text"
          className="form-control me-2"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
        />

        <button
          className="btn btn-secondary p-2"
          onClick={handleSendMessage}
          disabled={sendButtonLoading}
          id="send_message-message_input-queries_page"
        >
          {sendButtonLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
