import React, { useEffect, useRef, useState, useMemo } from 'react';
import { addChatComment, fetchChatData, getVendorDetailsByID } from '@/services/rfq';
import { getProfileById } from '@/services/Auth';
import { toast } from 'react-toastify';
import { handleFileUpload } from '@/utils/sharedFunctions';
import FileLink from '@/components/shared/FileLink';
import FullLoader from '@/components/shared/FullLoader';
import { Modal } from 'react-bootstrap';

/**
 * VendorDeviationModal
 *
 * Improved vendor-specific chat modal for technical evaluation
 * - Shows ONLY the selected vendor's deviation chat
 * - Anonymizes vendor name for tenders (VEN-xxx)
 * - Clean, focused interface
 */
const VendorDeviationModal = ({
  show,
  onHide,
  vendor,
  clause,
  userData,
  product,
  rfq_no,
  token = ""
}) => {
  const [messages, setMessages] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [files, setFiles] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [sendButtonLoading, setSendButtonLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const latestMessageRef = useRef(null);
  const fileInputRef = useRef(null);
  const [userMap, setUserMap] = useState({});

  const isTender = rfq_no?.is_tender === 1 || rfq_no?.is_tender === "1";

  // Get anonymized vendor label for display
  const vendorDisplayName = useMemo(() => {
    if (!vendor) return "Vendor";

    if (isTender) {
      // For tenders, always use anonymized code
      if (vendor.label) return vendor.label; // e.g. "VEN-123"
      if (vendor.rfq_product_vendor_id) return `VEN-${vendor.rfq_product_vendor_id}`;
      if (vendor.vendor_code) return `Vendor ${vendor.vendor_code}`;
      return "Vendor";
    }

    // For RFQs, show company name
    return vendor.vendor_name || vendor.company_name || vendor.label || "Vendor";
  }, [vendor, isTender]);

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const uploadToServer = async (e) => {
    setFileLoading(true);
    try {
      const filePath = await handleFileUpload(e, token);
      const newList = [...(files || []), filePath];
      setFiles(newList);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFileLoading(false);
      e.target.value = null;
    }
  };

  const removeChatFile = (fileType, file) => {
    const updatedList = files.filter((fileItem) => fileItem != file);
    setFiles(updatedList);
  };

  const getChatData = async () => {
    if (!clause || !vendor || !userData) return;

    const payload = {
      clause_id: clause.clause_id,
      sender_id: userData.id,
      receiver_id: vendor.vendor_id || vendor.value
    };

    try {
      setLoading(true);
      const res = await fetchChatData(payload, token);
      setMessages(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error("Message text can't be empty!", { position: "top-right" });
      return;
    }

    if (!vendor || !clause || !userData) {
      toast.error("Missing required information");
      return;
    }

    let payload = {
      clause_id: clause.clause_id,
      sender_id: userData.id,
      receiver_id: vendor.vendor_id || vendor.value,
      text: messageText,
      file_url: files,
      product: product,
      vendor: vendor,
      rfq_no: {
        ...rfq_no,
      }
    };

    setSendButtonLoading(true);
    try {
      const res = await addChatComment(payload, token);
      setMessageText("");
      setFiles(null);
      getChatData();
    } catch (error) {
      console.log(error);
      toast.error("Failed to send message");
    } finally {
      setSendButtonLoading(false);
    }
  };

  // Fetch and cache sender info if needed
  const fetchUserProfile = async (userId) => {
    if (userMap[userId]) return;
    let profile = null;
    try {
      if (userId === userData.id) {
        profile = userData;
      } else {
        // Try vendor first
        let res = await getVendorDetailsByID(userId);
        if (res?.data && res.data.company_name) {
          profile = {
            user_type: 3, // vendor
            name: res.data.company_name,
            id: userId,
          };
        } else {
          // Fallback to buyer/engineer/management
          let res2 = await getProfileById(userId);
          if (res2?.data) {
            profile = {
              user_type: res2.data.user_type,
              name: res2.data.name,
              id: userId,
            };
          }
        }
      }
    } catch (e) {
      // ignore
    }
    if (profile) {
      setUserMap((prev) => ({ ...prev, [userId]: profile }));
    }
  };

  useEffect(() => {
    if (show && clause && vendor) {
      getChatData();
    }
  }, [show, clause, vendor]);

  // On messages load, fetch sender info for all unique senders
  useEffect(() => {
    if (messages) {
      const uniqueIds = Array.from(new Set(messages.map((m) => m.created_by)));
      uniqueIds.forEach((id) => fetchUserProfile(id));
    }
  }, [messages]);

  useEffect(() => {
    if (latestMessageRef.current) {
      latestMessageRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setMessages(null);
      setMessageText("");
      setFiles(null);
      setUserMap({});
    }
  }, [show]);

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header
        closeButton
        style={{
          borderBottom: '1px solid #e9ecef',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        }}
      >
        <Modal.Title style={{ fontSize: '16px', fontWeight: 600, color: '#212529' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span>Deviation Chat: {vendorDisplayName}</span>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: 0, height: '500px', display: 'flex', flexDirection: 'column' }}>
        {/* Clause Info Banner */}
        {clause && (
          <div style={{
            padding: '14px 24px',
            background: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            fontSize: '13px',
            color: '#495057',
            lineHeight: '1.5',
          }}>
            <span style={{ fontWeight: 600, color: '#212529' }}>Clause:</span> {clause.clause_text?.substring(0, 150)}{clause.clause_text?.length > 150 ? '...' : ''}
          </div>
        )}

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: '#ffffff'
          }}
          className="hasFullLoader"
        >
          {loading && <FullLoader />}

          {!loading && messages && messages.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6c757d',
              textAlign: 'center'
            }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#f8f9fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#495057' }}>No messages yet</p>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6c757d' }}>Start the conversation to discuss deviations</p>
            </div>
          )}

          {messages && messages.map((msg, idx) => {
            const sender = userMap[msg.created_by] || {};

            // Anonymize vendor identity in tender mode
            const senderLabel = (() => {
              if (!sender) return "";

              // Vendor user in tender → hide real company name
              if (isTender && sender.user_type === 3) {
                return vendorDisplayName;
              }

              return sender.name || "User";
            })();

            const isOwnMessage = msg.created_by === userData.id;

            return (
              <div
                key={`msg_${msg.comment_id}`}
                ref={idx === messages.length - 1 ? latestMessageRef : null}
                style={{
                  display: 'flex',
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                  marginBottom: '16px'
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: isOwnMessage ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isOwnMessage
                      ? 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)'
                      : '#f8f9fa',
                    color: isOwnMessage ? '#ffffff' : '#212529',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    opacity: isOwnMessage ? 0.9 : 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {senderLabel}
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    {msg.comment_text}
                  </p>
                  {msg.comment_files && msg.comment_files.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <FileLink
                        Files={msg.comment_files}
                        Class="badge rounded-pill py-1"
                        Style={{
                          fontSize: "11px",
                          backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : '#e9ecef',
                          color: isOwnMessage ? '#ffffff' : '#495057'
                        }}
                      />
                    </div>
                  )}
                  <div style={{
                    fontSize: '10px',
                    marginTop: '6px',
                    opacity: 0.7
                  }}>
                    {new Date(msg.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e9ecef',
          background: '#f8f9fa'
        }}>
          {/* Attached Files Preview */}
          {files && files.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <FileLink
                Files={files}
                ColumnClass="col-md-6"
                showDownload={false}
                RemoveFile={removeChatFile}
              />
            </div>
          )}

          {/* Message Input */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={handleFileClick}
              disabled={fileLoading}
              style={{
                padding: '11px',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                background: '#ffffff',
                cursor: fileLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: fileLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Attach file"
              id="attach_file-vendor_deviation_modal"
              onMouseEnter={(e) => {
                if (!fileLoading) {
                  e.currentTarget.style.background = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (!fileLoading) {
                  e.currentTarget.style.background = '#ffffff';
                }
              }}
            >
              {fileLoading ? (
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
              style={{ display: 'none' }}
              onChange={uploadToServer}
            />

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message... (Press Enter to send)"
              rows={2}
              style={{
                flex: 1,
                padding: '11px 14px',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s ease',
              }}
              id="message_input-vendor_deviation_modal"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0d6efd';
                e.currentTarget.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#ced4da';
              }}
            />

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={sendButtonLoading || !messageText.trim()}
              style={{
                padding: '11px 20px',
                border: 'none',
                borderRadius: '8px',
                background: sendButtonLoading || !messageText.trim()
                  ? '#9e9e9e'
                  : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: '#ffffff',
                cursor: sendButtonLoading || !messageText.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                opacity: sendButtonLoading || !messageText.trim() ? 0.6 : 1,
                boxShadow: sendButtonLoading || !messageText.trim()
                  ? 'none'
                  : '0 2px 6px rgba(40, 167, 69, 0.25)',
              }}
              id="send_message-vendor_deviation_modal"
              onMouseEnter={(e) => {
                if (!sendButtonLoading && messageText.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(40, 167, 69, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (!sendButtonLoading && messageText.trim()) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(40, 167, 69, 0.25)';
                }
              }}
            >
              {sendButtonLoading ? (
                <>
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  Sending
                </>
              ) : (
                <>
                  Send
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default VendorDeviationModal;
