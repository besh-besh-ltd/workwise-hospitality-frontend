import React, { useEffect, useRef, useState } from "react";
import { sendQueryMessage, broadcastMessage } from "@/services/rfq";
import Link from "next/link";
import { formatDate } from "@/utils/sharedFunctions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faLightbulb, faTimes } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

const ChatBox = ({
  messages,
  vendor,
  rfq_id,
  role,
  onMessageSent,
  vendorwithoutlogintoken,
  selectedVendors,
  isTender = false,
}) => {
  const [messageText, setMessageText] = useState("");
  const [files, setFiles] = useState([]);
  const [sendButtonLoading, setSendButtonLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const latestMessageRef = useRef(null);

  const isBroadcastMode = Array.isArray(selectedVendors) && selectedVendors.length > 1;
  const isVendor = role === "vendor";

  // Vendor-specific message suggestions
  const vendorSuggestions = [
    "Please find attached our TDS (Technical Data Sheet)",
    "Attached is our QAP (Quality Assurance Plan) for your review",
    "Here are the specification files for the requested product",
    "Our proposed delivery timeline is...",
    "The estimated delivery location would be...",
    "We can provide technical evaluation samples upon request",
    "Our product certifications include...",
    "The MOQ (Minimum Order Quantity) for this product is...",
    "Please find our pricing breakdown attached",
    "We can offer the following payment terms...",
    "Our lead time for this product is approximately...",
    "We provide the following warranty terms...",
    "Our product meets the following industry standards..."
  ];

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

  const handleSuggestionClick = (suggestion) => {
    setMessageText(prev => prev ? `${prev} ${suggestion}` : suggestion);
    setShowSuggestions(false);
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
      if (isBroadcastMode) {
        const formData = new FormData();
        formData.append("message_text", messageText);
        formData.append("rfq_id", rfq_id);
        formData.append(
          "receiver_ids",
          JSON.stringify(targets.map((targetVendor) => ({ id: targetVendor.user_id })))
        );
        files.forEach((fileObj) => formData.append("files", fileObj.file));

        const response = await broadcastMessage(formData, vendorwithoutlogintoken);
        if (response.status !== 1) {
          toast.error("Failed to send broadcast message.", { position: "top-right" });
        } else {
          toast.success(`Message sent to ${targets.length} vendor(s)`);
        }
      } else {
        const singleVendor = targets[0];
        const formData = new FormData();
        formData.append("message_text", messageText);
        formData.append("rfq_id", rfq_id);
        formData.append("receiver_id", singleVendor.user_id);
        files.forEach((fileObj) => formData.append("files", fileObj.file));

        const response = await sendQueryMessage(formData, vendorwithoutlogintoken);
        if (response.status !== 1) {
          toast.error(`Failed to send to ${singleVendor.display_name || singleVendor.company_name || "vendor"}`, {
            position: "top-right",
          });
        } else {
          toast.success("Message sent successfully");
        }
      }

      onMessageSent();
      setMessageText("");
      setFiles([]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("An error occurred while sending the message.", { position: "top-right" });
    } finally {
      setSendButtonLoading(false);
    }
  };

  return (
    <div className="query-chat">
      {/* Chat header */}
      <div className="query-chat-header">
        <h5 className="query-chat-title">
          {isBroadcastMode
            ? `Send message to ${selectedVendors.length} vendors`
            : (vendor?.display_name || vendor?.company_name || "Select a vendor to continue")}
        </h5>
        {isVendor && !isBroadcastMode && (
          <button
            className="query-suggestion-toggle"
            onClick={() => setShowSuggestions(!showSuggestions)}
            title="Message suggestions"
          >
            <FontAwesomeIcon icon={faLightbulb} />
            Suggestions
          </button>
        )}
      </div>

      {/* Suggestions panel */}
      {isVendor && showSuggestions && (
        <div className="query-suggestions">
          <div className="query-suggestions-header">
            <span>Helpful suggestions</span>
            <button type="button" onClick={() => setShowSuggestions(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div className="query-suggestions-body">
            {vendorSuggestions.map((suggestion, index) => (
              <span
                key={index}
                role="button"
                className="query-suggestion-pill"
                onClick={() => handleSuggestionClick(suggestion)}
                title={suggestion}
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Message thread */}
      <div className="query-messages">
        {isBroadcastMode ? (
          <div className="query-broadcast-list">
            <h6>Selected Vendors:</h6>
            <ul>
              {selectedVendors.map((v) => (
                <li key={v.user_id}>{v.display_name || v.company_name}</li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message, index) => {
            const isReceived = message.direction === "received";
            return (
              <div
                key={message.message_id}
                ref={index === messages.length - 1 ? latestMessageRef : null}
                className={`query-message-row ${isReceived ? 'query-message-received' : 'query-message-sent'}`}
              >
                <div className="query-message-bubble">
                  <p>{message.message_text}</p>
                  {message.files && message.files.length > 0 && (
                    <div className="query-message-files">
                      {message.files.map((file, idx) => (
                        <Link
                          key={idx}
                          href={file.file_url}
                          download={file.file_name}
                          target="_blank"
                          className="query-file-badge"
                        >
                          {file.file_name}
                        </Link>
                      ))}
                    </div>
                  )}
                  <span className="query-message-time">
                    {(() => {
                      if (isTender && role === "buyer" && isReceived) {
                        if (!isBroadcastMode && vendor?.display_name) {
                          return `${vendor.display_name} · ${formatDate(message.created_at)}`;
                        }
                        return `Vendor · ${formatDate(message.created_at)}`;
                      }
                      return `${message?.sender_name} · ${formatDate(message.created_at)}`;
                    })()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Staged files preview */}
      {files.length > 0 && (
        <div className="query-staged-files">
          {files.map((file, idx) => (
            <span key={idx} className="query-staged-file">
              <span>{file.name}</span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => handleRemoveFile(file.name)}
                id={`remove_file_${idx}-chat_files-chat_box`}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="query-input-bar">
        <label className="query-file-upload">
          <input
            id="browse_attachments-message_input-queries_page"
            type="file"
            multiple
            onChange={handleFileUpload}
          />
          <span>Attach</span>
        </label>
        <input
          id="type_message-message_input-queries_page"
          type="text"
          className="query-text-input"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !sendButtonLoading) handleSendMessage(); }}
          placeholder="Type a message..."
        />
        <button
          className="query-send-btn"
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