import React, { useEffect, useRef, useState } from 'react';
import { addChatComment, fetchChatData, getVendorDetailsByID } from '@/services/rfq';
import { getProfileById } from '@/services/Auth';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { handleFileUpload } from '@/utils/sharedFunctions';
import FileLink from '@/components/shared/FileLink';
import FullLoader from '@/components/shared/FullLoader';


const BuyerVendorChat = ({ showChat, closeChat, data, userData, otherUser, token="" ,product , rfq_no}) => {
  const [messages, setMessages] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [files, setFiles] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [sendButtonLoading, setSendButtonLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const latestMessageRef = useRef(null);
  const fileInputRef = useRef(null);
  const [userMap, setUserMap] = useState({}); // userId -> {name, company_name, user_type}
 
 

  const handleFileClick = () => {
    fileInputRef.current.click(); // Trigger the file input when the "Attach file" button is clicked
  };

  console.log("cjeck the other user" , otherUser);
  const uploadToServer = async (e) => {
    setFileLoading(true)
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
  }

  const removeChatFile = (fileType, file) => {
    const updatedList = files.filter((fileItem) => fileItem != file);
    setFiles(updatedList);
  }

  const getChatData = async () => {
    const payload = {
      clause_id: data.clause_id,
      sender_id: userData.id,
      receiver_id: otherUser.vendor_id
    }
    try {
      setLoading(true)
      const res = await fetchChatData(payload);
      setMessages(res.data);
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false);
    }
  }

  const handleSendMessage = async () => {
    if (!messageText) {
      toast.error("Message text can't be empty!", { position: "top-right" });
      setSendButtonLoading(false);
      return;
    }

    let payload = {
      clause_id: data.clause_id,
      sender_id: userData.id,
      receiver_id: otherUser.vendor_id,
      text: messageText,
      file_url: files,
      product:product,
      vendor : otherUser,
      rfq_no : {
        ...rfq_no,

      }
    }
   console.log("chekg the payload before sending", payload);
    setSendButtonLoading(true);
    try {
      const res = await addChatComment(payload);
      setMessageText("");
      setFiles(null);
      getChatData();
    } catch (error) {
      console.log(error)
    } finally {
      setSendButtonLoading(false);
    }
  }

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
            user_type: 3,
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
    if (data) {
      getChatData();
    }
  }, []);

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

  return (
    <>
      {showChat && (
        <div
          className="modal fade show d-flex flex-column bg-white shadow-lg"
          style={{
            position: 'fixed',
            top: '0',
            right: '0',
            left: 'auto', 
            zIndex: 1050,
            width: 'calc(100% - 450px)', 
            maxWidth: '450px', 
            height: '100vh',
            borderLeft: '2px solid #ddd',
            padding: '10px',
            overflow: 'hidden',
          }}
        >
          <div className="modal-header" sty le={{ borderBottom: '1px solid #ddd' }}>
            <h5 className="modal-title">Evaluation / Deviation</h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={closeChat}
            >
            </button>
          </div>

          <div
            className="modal-body hasFullLoader"
            style={{
              overflowY: 'auto',
              padding: '10px 0',
            }}
          >
            {loading && <FullLoader />}
            {messages &&
              messages.map((msg, idx) => {
                const sender = userMap[msg.created_by] || {};
                const senderLabel = sender.name;
                return (
                  <div
                    key={`cmnt_${msg.comment_id}`}
                    ref={idx === messages.length - 1 ? latestMessageRef : null}
                    className={`d-flex ${msg.created_by === userData.id ? "justify-content-end" : ""} mb-2`}
                  >
                    <div
                      className={`text-dark px-3 py-2 me-2 `}
                      style={{
                        maxWidth: "70%",
                        backgroundColor: msg.created_by === userData.id ? "#d1e7fd" : "#e0e0e0",
                        borderRadius: msg.created_by === userData.id ? "10px 0 0 10px" : "0 10px 10px 0"
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>
                        {senderLabel}
                      </div>
                      <p className="mb-0">{msg.comment_text}</p>
                      {msg.comment_files && msg.comment_files.length > 0 && (
                        <div className="mt-2">
                          <FileLink
                            Files={msg.comment_files}
                            Class="badge text-bg-secondary rounded-pill py-0"
                            Style={{ fontSize: "10px" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '10px',
              bottom: '10px',
              backgroundColor: 'white',
              boxSizing: 'border-box', 
            }}
          >
            {files &&
              <>
                <FileLink Files={files} ColumnClass="col-md-6" showDownload={false} RemoveFile={removeChatFile} />
                <hr />
              </>
            }

            <textarea
              rows="2"
              maxLength="500"
              placeholder="Type a message..."
              className="form-control"
              style={{
                resize: 'none',
                overflowY: 'auto',
                paddingRight: '30px',
                paddingBottom: '10px',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                height: 'auto',
              }}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
              }}
            ></textarea>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #ddd',
                paddingTop: '10px',
                marginTop: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
                onClick={handleFileClick}
              >
                <FontAwesomeIcon
                  icon={faPaperclip}
                  className="me-2 opacity-75"
                />
                Attach File
                {fileLoading &&
                  <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                }
              </div>

              {/* Hidden file input field triggered by the "Attach file" button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                style={{ display: 'none' }}
                onChange={uploadToServer}
              />

              {sendButtonLoading &&
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              }
              <button
                type="button"
                className="text-white border-0"
                style={{
                  backgroundColor: 'green',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
                onClick={handleSendMessage}
              >
                Send
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  color="#fff"
                  className="ms-2"
                />
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};

export default BuyerVendorChat;