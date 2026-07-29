/* ────────────────────────────────────────────────────────────
   ClauseChatDrawer — per-clause buyer/vendor chat drawer
   used by the SendQuoteWizard tech-evaluation step.

   Wraps the existing /rfq/get-tech-comments + /rfq/add-tech-comment
   endpoints (same backend the existing tech-eval page uses, no
   new backend). Pure UI in the wizard's design language.
   ──────────────────────────────────────────────────────────── */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Paperclip, MessageCircle } from "lucide-react";
import { toast } from "react-toastify";

import { addChatComment, fetchChatData } from "@/services/rfq";
import { handleFileUpload } from "@/utils/sharedFunctions";

import styles from "./SendQuoteWizard.module.scss";

const formatTime = (raw) => {
  if (!raw) return "";
  try {
    const isIso = raw.includes("T") || raw.includes("Z") || raw.includes("+");
    const d = new Date(isIso ? raw : raw + "+05:30");
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch (_) {
    return "";
  }
};

const initials = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
};

const ClauseChatDrawer = ({
  open,
  onClose,
  clause,                 // { clause_id, clause_text }
  productName,
  clauseIndex,            // 1-based index for display
  currentUser,            // { id, name? }
  otherUser,              // { buyer_id, vendor_id, contactName, companyName, rfq_no, rfq_id }
  product,
  rfq,
  token,
  onMessagesChanged,      // (count) => void — refresh preview on parent
}) => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef(null);
  const bodyRef = useRef(null);

  const receiverId = useMemo(() => {
    return parseInt(otherUser?.buyer_id || otherUser?.vendor_id || 0);
  }, [otherUser]);

  const senderId = useMemo(() => parseInt(currentUser?.id || 0), [currentUser]);

  const loadMessages = async () => {
    if (!clause?.clause_id) return;
    try {
      setLoading(true);
      const res = await fetchChatData(
        {
          clause_id: clause.clause_id,
          sender_id: senderId,
          receiver_id: receiverId,
        },
        token
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      setMessages(list);
      if (typeof onMessagesChanged === "function") {
        onMessagesChanged(list.length);
      }
    } catch (_) {
      // Quiet — first-load failure shouldn't block the chat shell.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setDraft("");
      setFiles([]);
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clause?.clause_id]);

  // Escape closes drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages.length]);

  const handleAttach = () => fileInputRef.current?.click();

  const onFileChange = async (e) => {
    setFileUploading(true);
    try {
      const url = await handleFileUpload(e, token);
      setFiles((prev) => [...prev, url]);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setFileUploading(false);
      e.target.value = null;
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const sendMessage = async () => {
    const text = (draft || "").trim();
    if (!text && files.length === 0) {
      toast.error("Type a message or attach a file");
      return;
    }
    setSending(true);
    try {
      await addChatComment(
        {
          clause_id: clause.clause_id,
          sender_id: senderId,
          receiver_id: receiverId,
          text,
          file_url: files.length ? files : null,
          product,
          vendor: otherUser,
          rfq_no: { ...(otherUser || {}) },
        },
        token
      );
      setDraft("");
      setFiles([]);
      await loadMessages();
    } catch (err) {
      toast.error("Couldn't send message — please retry.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className={styles.chatOverlay} onClick={onClose} />
      <aside
        className={styles.chatDrawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clause-chat-title"
      >
        <header className={styles.chatHead}>
          <div className={styles.chatHeadRow}>
            <span className={styles.chatEyebrow}>
              <span className={styles.chatEyebrowDot} />
              Chat with buyer
            </span>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <h3 id="clause-chat-title" className={styles.chatHeadTitle}>
            {productName || "Product"}
            <span className={styles.chatHeadTitleMeta}>
              {" · "}Clause #{String(clauseIndex || 1).padStart(2, "0")}
            </span>
          </h3>
          <div className={styles.chatClauseCtx}>
            <span className={styles.chatClauseLbl}>In reference to</span>
            {clause?.clause_text || "—"}
          </div>
        </header>

        <div className={styles.chatBody} ref={bodyRef}>
          {loading && messages.length === 0 ? (
            <div className={styles.chatEmpty}>
              <div className={styles.ic}>
                <MessageCircle size={20} strokeWidth={1.8} />
              </div>
              <div className={styles.ttl}>Loading messages…</div>
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.chatEmpty}>
              <div className={styles.ic}>
                <MessageCircle size={20} strokeWidth={1.8} />
              </div>
              <div className={styles.ttl}>Start a conversation</div>
              <div className={styles.sub}>
                Ask the buyer for clarification on this clause. Replies typically
                arrive within 24 hours during business days.
              </div>
            </div>
          ) : (
            messages.map((m, i) => {
              const isOwn = String(m.created_by) === String(currentUser?.id);
              const senderName = isOwn
                ? "You"
                : m.sender_user_type === 3 || m.sender_user_type === "3"
                ? "Vendor"
                : m.sender_name || otherUser?.contactName || "Buyer";
              return (
                <div
                  key={m.comment_id || i}
                  className={`${styles.chatMsg} ${
                    isOwn ? styles.chatMsgVendor : styles.chatMsgBuyer
                  }`}
                >
                  <div
                    className={`${styles.chatAvatar} ${
                      isOwn ? styles.chatAvatarVendor : styles.chatAvatarBuyer
                    }`}
                  >
                    {initials(senderName)}
                  </div>
                  <div className={styles.chatBubbleWrap}>
                    <div className={styles.chatMeta}>
                      <span className={styles.chatMetaName}>{senderName}</span>
                      <span className={styles.chatMetaTime}>
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                    <div className={styles.chatBubble}>{m.comment_text}</div>
                    {m.comment_files && m.comment_files.length > 0 && (
                      <div className={styles.chatBubbleFiles}>
                        {m.comment_files.map((f, fi) => (
                          <a
                            key={fi}
                            href={f}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.fileChip}
                          >
                            File {m.comment_files.length > 1 ? fi + 1 : ""}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className={styles.chatFoot}>
          {files.length > 0 && (
            <div className={styles.chatPendingFiles}>
              {files.map((f, i) => (
                <span key={i} className={styles.chatPendingFile}>
                  <span className={styles.name}>{String(f).split("/").pop()}</span>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => removeFile(i)}
                    aria-label="Remove file"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className={styles.chatInputWrap}>
            <button
              type="button"
              className={styles.chatAttachBtn}
              onClick={handleAttach}
              aria-label="Attach file"
              disabled={fileUploading}
              title="Attach file"
            >
              <Paperclip size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
              style={{ display: "none" }}
              onChange={onFileChange}
            />
            <textarea
              className={styles.chatTextarea}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!sending) sendMessage();
                }
              }}
              rows={1}
              placeholder="Type your message…"
              maxLength={500}
            />
            <button
              type="button"
              className={styles.chatSend}
              onClick={sendMessage}
              disabled={sending || (!draft.trim() && files.length === 0)}
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </div>
          <div className={styles.chatHint}>
            <span className={styles.kbd}>Enter</span> to send ·{" "}
            <span className={styles.kbd}>Shift+Enter</span> for new line
          </div>
        </footer>
      </aside>
    </>
  );
};

export default ClauseChatDrawer;
