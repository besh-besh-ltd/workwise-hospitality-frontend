import React, { useEffect, useState } from 'react';
import Modal from "react-modal";
import { CircleAlert, TriangleAlert, CheckCircle, Info, HelpCircle, X } from 'lucide-react';
import styles from "./ConfirmationModal.module.scss";

const VARIANTS = {
    danger:    { icon: CircleAlert,   iconCls: styles.iconDanger,    btnCls: styles.btnDanger,    accentCls: styles.accentDanger },
    warning:   { icon: TriangleAlert, iconCls: styles.iconWarning,   btnCls: styles.btnWarning,   accentCls: styles.accentWarning },
    success:   { icon: CheckCircle,   iconCls: styles.iconSuccess,   btnCls: styles.btnSuccess,   accentCls: styles.accentSuccess },
    info:      { icon: Info,          iconCls: styles.iconInfo,      btnCls: styles.btnInfo,      accentCls: styles.accentInfo },
    primary:   { icon: HelpCircle,    iconCls: styles.iconPrimary,   btnCls: styles.btnPrimary,   accentCls: styles.accentPrimary },
    secondary: { icon: HelpCircle,    iconCls: styles.iconSecondary, btnCls: styles.btnSecondary, accentCls: styles.accentSecondary },
};

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    description = "Are you sure you want to proceed with this action?",
    confirmButtonColor = "danger",
    confirmButtonText = "Confirm",
    cancelButtonText = "Cancel",
    showCloseButton = false,
    customFooter = null,
    hideCancelButton = false,
    requireComment = false,
    commentLabel = "Comment",
    commentPlaceholder = "Enter your comment...",
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [comment, setComment] = useState("");
    const [commentTouched, setCommentTouched] = useState(false);
    const v = VARIANTS[confirmButtonColor] || VARIANTS.danger;
    const Icon = v.icon;

    useEffect(() => {
        if (!isOpen) {
            setIsProcessing(false);
            setComment("");
            setCommentTouched(false);
        }
    }, [isOpen]);

    const isCommentValid = !requireComment || comment.trim().length > 0;

    const handleConfirmClick = async () => {
        if (isProcessing) return;
        if (requireComment) {
            setCommentTouched(true);
            if (!comment.trim()) return;
        }
        setIsProcessing(true);
        try {
            await onConfirm?.(requireComment ? comment.trim() : undefined);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div>
            <Modal
                isOpen={isOpen}
                onRequestClose={onClose}
                ariaHideApp={false}
                contentLabel="Confirmation Modal"
                shouldCloseOnOverlayClick={!isProcessing}
                shouldCloseOnEsc={!isProcessing}
                overlayClassName={styles.overlay}
                className={styles.content}
            >
                <div className={`${styles.accentBar} ${v.accentCls}`} />

                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className={styles.closeBtn}
                        aria-label="Close"
                        id="close_confirmation_modal-modal_header-confirmation_modal"
                        disabled={isProcessing}
                    >
                        <X size={14} />
                    </button>
                )}

                <div className={styles.inner}>
                    <div className={styles.header}>
                        <div className={`${styles.iconWrap} ${v.iconCls}`}>
                            <Icon size={18} strokeWidth={1.8} />
                        </div>
                        {/* Stack title + description in a column next to the icon
                            so the title→description gap is exactly title's
                            margin-bottom (no wasted flex space from icon being
                            taller than the title). */}
                        <div className={styles.headerText}>
                            <h4 className={styles.title}>{title}</h4>
                            {description && (
                                <p
                                    className={styles.desc}
                                    dangerouslySetInnerHTML={{
                                        __html: description.replace(/\\n/g, '<br />')
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {requireComment && (
                        <div className={styles.commentGroup}>
                            <label className={styles.commentLabel}>{commentLabel} <span style={{ color: '#ef4444' }}>*</span></label>
                            <textarea
                                className={styles.commentTextarea}
                                placeholder={commentPlaceholder}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                onBlur={() => setCommentTouched(true)}
                                rows={3}
                                disabled={isProcessing}
                            />
                            {commentTouched && !comment.trim() && (
                                <span className={styles.commentError}>Comment is required</span>
                            )}
                        </div>
                    )}

                    {customFooter && (
                        <div className={styles.footer}>{customFooter}</div>
                    )}

                    <div className={styles.actions}>
                        {!hideCancelButton && (
                            <button
                                onClick={onClose}
                                className={`${styles.btn} ${styles.btnCancel}`}
                                id="cancel_confirmation_modal-modal_body-confirmation_modal"
                                disabled={isProcessing}
                            >
                                {cancelButtonText}
                            </button>
                        )}
                        <button
                            onClick={handleConfirmClick}
                            className={`${styles.btn} ${v.btnCls}`}
                            id="confirm_confirmation_modal-modal_body-confirmation_modal"
                            disabled={isProcessing || !isCommentValid}
                        >
                            {isProcessing && <span className={styles.spinner} role="status" aria-hidden="true" />}
                            {confirmButtonText}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ConfirmationModal;
