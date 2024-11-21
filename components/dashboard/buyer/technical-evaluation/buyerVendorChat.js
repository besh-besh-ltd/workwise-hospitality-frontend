import React, { useEffect, useRef, useState } from 'react';
import { addChatComment, fetchChatData } from '@/services/rfq';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { handleFileUpload } from '@/utils/sharedFunctions';
import FileLink from '@/components/shared/FileLink';
import Link from 'next/link';
import FullLoader from '@/components/shared/FullLoader';

const BuyerVendorChat = ({ showChat, closeChat, data, userData }) => {
  const [messages, setMessages] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [files, setFiles] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [sendButtonLoading, setSendButtonLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const latestMessageRef = useRef(null);
  const fileInputRef = useRef(null);


  const handleFileClick = () => {
    fileInputRef.current.click(); // Trigger the file input when the "Attach file" button is clicked
  };

  const uploadToServer = async (e) => {
    setFileLoading(true)
    try {
      const filePath = await handleFileUpload(e);
      const newList = [...files, filePath];
      setFiles(newList);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFileLoading(false);
      e.target.value = null;
    }
  }

  const getChatData = async () => {
    setLoading(true)
    try {
      const res = await fetchChatData(data.clause_id);
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
      created_by: userData.id,
      text: messageText,
      file_url: files
    }

    setSendButtonLoading(true);
    try {
      const res = await addChatComment(payload);
      setMessageText("");
      setFiles([]);
      getChatData();
    } catch (error) {
      console.log(error)
    } finally {
      setSendButtonLoading(false);
    }
  }

  useEffect(() => {
    if (data) {
      getChatData();
    }
  }, []);

  useEffect(() => {
    if (latestMessageRef.current) {
      latestMessageRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  return (
    <>
      {showChat && (
        <div
          className="modal fade show"
          style={{
            position: 'fixed',
            top: '0',
            left: '1070px',
            bottom: '0',
            width: '450px',
            backgroundColor: 'white',
            boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.3)',
            zIndex: 1050,
            borderLeft: '2px solid #ddd',
            height: '100vh',
            padding: '10px',
            display: 'block',
            overflow: 'hidden',
          }}
        >
          <div className="modal-header" style={{ borderBottom: '1px solid #ddd' }}>
            <h5 className="modal-title">Queries Inbox</h5>
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
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              padding: '10px 0',
            }}
          >
            {loading && <FullLoader />}
            {messages &&
              messages.map((message, index) => (
                <div
                  key={`cmnt_${message.comment_id}`}
                  ref={index === messages.length - 1 ? latestMessageRef : null}
                  className={`d-flex ${message.created_by === userData.id ? "justify-content-end" : ""} mb-2`}
                >
                  <div
                    className={`text-dark px-3 py-2 me-2 `}
                    style={{
                      maxWidth: "70%",
                      backgroundColor: message.created_by === userData.id ? "#d1e7fd" : "#e0e0e0",
                      borderRadius: message.created_by === userData.id ? "10px 0 0 10px" : "0 10px 10px 0"
                    }}
                  >
                    <p className="mb-0">{message.comment_text}</p>
                    {message.comment_files && message.comment_files.length > 0 && (
                      <div className="mt-2">
                        {message.comment_files.map((file, idx) => (
                          <Link
                            key={idx}
                            href={file}
                            download={file}
                            target="_blank"
                            className="d-inline-block badge bg-secondary me-1"
                            style={{
                              maxWidth: "100%",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {file}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '10px',
              position: 'absolute',
              bottom: '10px',
              backgroundColor: 'white',
              width: 'calc(100% - 20px)', // Adjusted for both left and right spacing
              boxSizing: 'border-box', // Ensures padding and border are included in the width
            }}
          >
            {files.length > 0 &&
              <FileLink
                Files={files}
                Style={{ backgroundColor: "#f0f0f0" }}
                Class="px-3 py-1 rounded-4"
                showDownload={false} />
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