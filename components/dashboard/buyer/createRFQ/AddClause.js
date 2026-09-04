import { toast } from "react-toastify";
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip, faTrash } from "@fortawesome/free-solid-svg-icons";
import { handleFileUpload } from "@/utils/sharedFunctions";
import FileLink from "@/components/shared/FileLink";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { addClause, getClausesByRfqProductId, removeClause, updateClause, updateMinimumPassingScore } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";

// Inline read-more for clause text. Anything beyond 500 chars collapses by
// default; clicking "Show more" expands inline (no modal). Lives outside the
// AddClauseModal component so each card owns its own expanded/collapsed state.
const CLAUSE_TEXT_TRUNCATE = 500;
const ClauseText = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    const value = text || "";
    if (value.length <= CLAUSE_TEXT_TRUNCATE) {
        return <p className="rfq-clause-card__text">{value}</p>;
    }
    const display = expanded ? value : `${value.slice(0, CLAUSE_TEXT_TRUNCATE)}…`;
    return (
        <p className="rfq-clause-card__text">
            {display}{" "}
            <button
                type="button"
                className="rfq-clause-card__readmore"
                onClick={() => setExpanded((v) => !v)}
            >
                {expanded ? "Show less" : "Show more"}
            </button>
        </p>
    );
};

function AddClauseModal({ show, onClose, product, rfq_id, onClauseChange, openToMinimumScore = false }) {
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState([]);
    const [fileLoading, setFileLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    const [currentClause, setCurrentClause] = useState(null);
    const [update, setUpdate] = useState(false);
    const [previousClauses, setPreviousClauses] = useState(null);
    // Clauses queued by Add Clause but not yet persisted to the backend.
    // The footer Save button is the only place that flushes these via the
    // API; everything in here is purely client-side until then.
    const [pendingClauses, setPendingClauses] = useState([]);
    const [weightage, setWeightage] = useState("");
    const [minimumPassingScore, setMinimumPassingScore] = useState(null);
    const [minScoreInput, setMinScoreInput] = useState("");
    const [savingMinScore, setSavingMinScore] = useState(false);

    // Sampling clause specific state
    const [showSamplingForm, setShowSamplingForm] = useState(false);
    const [samplingWeightage, setSamplingWeightage] = useState("");

    // Compute if sampling clause already exists
    const existingSamplingClause = previousClauses?.find(c => c.clause_type === 'sampling');
    const hasSamplingClause = !!existingSamplingClause;

    const handleAttachFileClick = () => {
        fileInputRef.current.click(); // Trigger the file input when the "Attach file" button is clicked
    };

    const uploadToServer = async (e) => {
        setFileLoading(true)
        try {
            const filePath = await handleFileUpload(e, undefined, { allowAllTypes: true });
            const newList = [...files, filePath];
            setFiles(newList);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setFileLoading(false);
            e.target.value = null;
        }
    }

    const getPreviousClauses = async () => {
        const payload = {
            // rfq_id,
            rfq_product_id: product.id
        }
        setLoading(true);
        try {
            const res = await getClausesByRfqProductId(payload);
            // Response structure (axios interceptor unwraps response.data):
            // res = { success, vendor_response, minimum_passing_score, data: [...] }
            let clausesData = [];
            if (res && res.data && Array.isArray(res.data)) {
                clausesData = res.data;
            }

            // Show all clauses (both regular and sampling)
            setPreviousClauses(clausesData);

            // Fetch minimum passing score from response
            // res is already the backend response (axios interceptor unwraps it)
            const minimumScore = res?.minimum_passing_score;

            if (minimumScore !== undefined && minimumScore !== null) {
                // Convert to number to ensure proper handling (including 0)
                const score = Number(minimumScore);
                if (!isNaN(score)) {
                    setMinimumPassingScore(score);
                } else {
                    setMinimumPassingScore(null);
                }
            } else {
                setMinimumPassingScore(null);
            }
        } catch (error) {
            console.error("Error fetching clauses:", error);
            toast.error("Failed to load clauses. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Add Clause — local only. Pushes the clause onto pendingClauses, clears
    // the form. The footer Save button is what actually persists via the API.
    const handleAddClause = () => {
        if (message.trim() === "") {
            toast.error("Message is required");
            return;
        }

        if (message.length > 2000) {
            toast.error("Clause text must be at most 2000 characters");
            return;
        }

        if (!weightage || weightage === "") {
            toast.error("Marks is required");
            return;
        }

        const localClause = {
            _localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            isPending: true,
            clause_text: message,
            files: [...files],
            clause_type: 'clause',
            weightage: parseInt(weightage),
        };
        setPendingClauses((prev) => [...prev, localClause]);

        setMessage("");
        setFiles([]);
        setWeightage("");
    };

    // Footer Save — commits every queued pending clause via the API in turn.
    // If the user has typed into the form but not pressed Add Clause, that
    // entry is included too so a single click finishes the job.
    const handleSaveAll = async () => {
        let toCommit = [...pendingClauses];

        const formHasContent = message.trim() !== "" && weightage !== "";
        if (formHasContent && !update) {
            // Re-use validation from handleAddClause without pushing a toast
            // for cases that pass; we just inline the same checks.
            if (message.length > 2000) {
                toast.error("Clause text must be at most 2000 characters");
                return;
            }
            toCommit.push({
                _localId: `local-${Date.now()}`,
                clause_text: message,
                files: [...files],
                clause_type: 'clause',
                weightage: parseInt(weightage),
            });
        }

        if (update) {
            // Existing in-flight edit of a persisted clause — fall through to
            // the existing Update flow so a single Save commits it too.
            await handleUpdateClause();
            return;
        }

        if (toCommit.length === 0) {
            toast.info("No changes to save.");
            return;
        }

        setLoading(true);
        try {
            for (const c of toCommit) {
                const payload = {
                    rfq_id,
                    rfq_product_id: product.id,
                    clause_text: c.clause_text,
                    file_url: c.files || [],
                    clause_type: 'clause',
                    weightage: c.weightage,
                };
                await addClause(payload);
                onClauseChange && onClauseChange({
                    action: 'add',
                    payload: {
                        ...payload,
                        product_variant_id: product.product_id,
                        variant: product.variant,
                    },
                });
            }
            toast.success(`${toCommit.length} clause${toCommit.length === 1 ? '' : 's'} saved`);
            setPendingClauses([]);
            setMessage("");
            setFiles([]);
            setWeightage("");
            await getPreviousClauses();
        } catch (error) {
            toast.error(error.message || "Failed to save clauses");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSamplingClause = async () => {
        // Check if sampling clause already exists
        if (previousClauses?.some(c => c.clause_type === 'sampling')) {
            toast.error("A sampling clause already exists for this item");
            return;
        }

        if (!samplingWeightage || samplingWeightage === "") {
            toast.error("Marks is required for sampling clause");
            return;
        }

        const payload = {
            rfq_id,
            rfq_product_id: product.id,
            clause_text: "Sampling",
            file_url: [],
            clause_type: 'sampling',
            weightage: parseInt(samplingWeightage)
        };

        setLoading(true);
        try {
            const res = await addClause(payload);
            toast.success("Sampling clause added successfully");
            setShowSamplingForm(false);
            setSamplingWeightage("");
            setTimeout(() => {
                getPreviousClauses();
            }, 100);
            onClauseChange && onClauseChange({
                action: 'add',
                payload: {
                    ...payload,
                    product_variant_id: product.product_id,
                    variant: product.variant,
                },
            });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateClause = async () => {
        if (message && message.length > 2000) {
            toast.error("Clause text must be at most 2000 characters");
            return;
        }

        if (!weightage || weightage === "") {
            toast.error("Marks is required");
            return;
        }

        const payload = {
            clause_id: currentClause.clause_id,
            clause_text: message,
            file_url: files,
            clause_type: currentClause.clause_type || 'clause',
            weightage: parseInt(weightage)
        }
        setLoading(true);
        try {
            const res = await updateClause(payload);
            toast.success(res.message)
            getPreviousClauses();
            onClauseChange && onClauseChange({
                action: 'update',
                payload: {
                    ...payload,
                    rfq_product_id: product.id,
                    product_variant_id: product.product_id,
                    variant: product.variant,
                },
            });

        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false);
            setMessage("");
            setFiles([]);
            setWeightage("");
            setCurrentClause(null);
            setUpdate(false);
        }
    }

    const handleDeleteClause = async (clause_id) => {
        setLoading(true);
        try {
            const res = await removeClause(clause_id);
            toast.success(res.message)
            getPreviousClauses();
            onClauseChange && onClauseChange({
                action: 'delete',
                payload: {
                    clause_id,
                    rfq_product_id: product.id,
                    product_variant_id: product.product_id,
                    variant: product.variant,
                },
            });
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false);
        }
    }

    // Pending (not-yet-saved) clauses live only on the client, so dropping
    // one is a simple state filter — no API call.
    const handleDeletePendingClause = (localId) => {
        setPendingClauses((prev) => prev.filter((c) => c._localId !== localId));
    };

    const openUpdateField = (clause) => {
        if (clause.isPending) {
            // Editing a pending clause: pull it back into the form, drop from
            // pendingClauses; pressing Add Clause again will re-queue it.
            setPendingClauses((prev) => prev.filter((c) => c._localId !== clause._localId));
            setMessage(clause.clause_text);
            setFiles(clause.files || []);
            setWeightage(clause.weightage || "");
            setUpdate(false); // not a server-side update; behaves like a fresh add
            setCurrentClause(null);
            return;
        }
        // Editing a persisted clause: existing flow (hits API on Update).
        const updatedClauses = previousClauses.filter((c) => c.clause_id !== clause.clause_id);
        setPreviousClauses(updatedClauses);
        setMessage(clause.clause_text);
        setFiles(clause.files || []);
        setWeightage(clause.weightage || "");
        setUpdate(true);
        setCurrentClause(clause);
    }

    const handleUpdateMinimumScore = async () => {
        if (!minScoreInput || minScoreInput === "") {
            toast.error("Please enter minimum passing percentage");
            return;
        }

        const newMinimumScore = parseInt(minScoreInput);

        if (newMinimumScore < 0 || newMinimumScore > 100) {
            toast.error("Minimum passing percentage must be between 0 and 100");
            return;
        }

        const payload = {
            rfq_id,
            rfq_product_id: product.id,
            minimum_passing_score: newMinimumScore
        }

        setSavingMinScore(true);
        try {
            const res = await updateMinimumPassingScore(payload);

            if (res && res.status === 1) {
                setMinimumPassingScore(newMinimumScore);
                toast.success(res.message || "Minimum passing percentage updated successfully");
                setTimeout(async () => {
                    await getPreviousClauses();
                }, 300);
            } else {
                toast.error(res?.message || "Failed to update minimum passing percentage");
            }
        } catch (error) {
            toast.error(error.message || "Failed to update minimum passing percentage");
        } finally {
            setSavingMinScore(false);
        }
    }

    const handleRemoveFile = (fileType, file) => {
        const fileList = files.filter((fileItem) => fileItem !== file);
        setFiles(fileList);
    }

    useEffect(() => {
        if (show) {
            getPreviousClauses();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, product.id])

    // Keep the inline min-score input in sync with the loaded value.
    useEffect(() => {
        if (minimumPassingScore !== null && minimumPassingScore !== undefined) {
            setMinScoreInput(minimumPassingScore.toString());
        } else {
            setMinScoreInput("");
        }
    }, [minimumPassingScore]);

    const hasUnsavedChanges = () => {
        if (pendingClauses.length > 0) return true;
        if (message.trim() !== "") return true;
        if (files.length > 0) return true;
        return false;
    };

    const handleHide = () => {
        if (hasUnsavedChanges()) {
            const proceed = window.confirm(
                "The unsaved changes will be lost if closing this modal without saving, are you sure to close the modal?"
            );
            if (!proceed) return;
        }
        setPendingClauses([]);
        setMessage("");
        setFiles([]);
        setWeightage("");
        setUpdate(false);
        setCurrentClause(null);
        setShowSamplingForm(false);
        setSamplingWeightage("");
        onClose();
    };
    const minScoreNum = parseInt(minScoreInput);
    const minScoreOutOfRange =
        minScoreInput !== "" && !isNaN(minScoreNum) &&
        (minScoreNum < 0 || minScoreNum > 100);
    const minScoreUnchanged =
        minScoreInput !== "" && !isNaN(minScoreNum) && minScoreNum === minimumPassingScore;
    const visibleClauses = [
        ...((previousClauses || []).filter(c => c.clause_type !== 'sampling')),
        ...pendingClauses,
    ];
    // Clause-text soft cap. Native maxLength stops new typing past 2000;
    // messageOverLimit catches legacy values already over and is what the
    // counter / red-border / submit-side guard react to. messageNearLimit
    // (yellow outline + yellow counter) only fires exactly at the cap so
    // the warning clears as soon as the user deletes a character.
    const CLAUSE_TEXT_MAX = 2000;
    const messageLength = (message || "").length;
    const messageOverLimit = messageLength > CLAUSE_TEXT_MAX;
    const messageNearLimit = !messageOverLimit && messageLength === CLAUSE_TEXT_MAX;
    // Numeric clamp for the min-passing-percentage input. Strips non-digits
    // (the field is an integer), and bounds within 0-100.
    const handleMinScoreChange = (e) => {
        const raw = e.target.value;
        if (raw === "") { setMinScoreInput(""); return; }
        const digits = raw.replace(/[^0-9]/g, "");
        if (digits === "") { setMinScoreInput(""); return; }
        let n = parseInt(digits, 10);
        if (n > 100) n = 100;
        if (n < 0) n = 0;
        setMinScoreInput(String(n));
    };

    return (
        <Modal
            show={show}
            onHide={handleHide}
            centered
            size="lg"
            dialogClassName="rfq-clause-modal-dialog"
            contentClassName="rfq-clause-modal"
        >
            <Modal.Header closeButton className="rfq-clause-modal__header">
                <Modal.Title className="rfq-clause-modal__title-row">
                    <span className="rfq-clause-modal__title">
                        Technical and Sampling Clauses
                        <span className="rfq-clause-modal__product"> · {product.name}</span>
                    </span>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="rfq-clause-modal__body">
                {/* Minimum passing percentage — inline */}
                <div className="rfq-clause-minscore-row">
                    <div className="rfq-clause-minscore-row__label">
                        <p className="rfq-clause-minscore-row__title">Minimum passing percentage</p>
                        <p className="rfq-clause-minscore-row__hint">Vendors must score at least this much to pass the technical evaluation.</p>
                    </div>
                    <div className="rfq-clause-minscore-row__input-wrap">
                        <Form.Control
                            type="number"
                            placeholder="100"
                            min="0"
                            max="100"
                            className="rfq-clause-input rfq-clause-input--narrow"
                            value={minScoreInput}
                            onChange={handleMinScoreChange}
                        />
                        <span className="rfq-clause-minscore-row__unit">%</span>
                    </div>
                    <button
                        type="button"
                        className="rfq-btn rfq-btn--primary rfq-btn--sm"
                        onClick={handleUpdateMinimumScore}
                        disabled={savingMinScore || minScoreInput === "" || minScoreOutOfRange || minScoreUnchanged}
                    >
                        {savingMinScore
                            ? <span className="rfq-clause-spinner" />
                            : minimumPassingScore === null || minimumPassingScore === undefined ? "Set" : "Update"}
                    </button>
                </div>
                {minScoreOutOfRange && (
                    <p className="rfq-clause-modal__error">Minimum passing percentage must be between 0 and 100</p>
                )}

                {/* Sampling Clause */}
                <div className="rfq-sampling-card">
                    <div className="rfq-sampling-card__head">
                        <div>
                            <p className="rfq-sampling-card__title">Sampling Clause</p>
                            <p className="rfq-sampling-card__hint">Maximum 1 sampling clause per item</p>
                        </div>
                        {hasSamplingClause ? (
                            <div className="rfq-sampling-card__status">
                                <span className="rfq-tag rfq-tag--success">Added</span>
                                <span className="rfq-sampling-card__marks">Marks: {existingSamplingClause.weightage || 0}</span>
                                <button
                                    type="button"
                                    className="rfq-clause-pill-btn rfq-clause-pill-btn--danger"
                                    onClick={() => handleDeleteClause(existingSamplingClause.clause_id)}
                                    disabled={loading}
                                >
                                    Remove
                                </button>
                            </div>
                        ) : showSamplingForm ? (
                            <div className="rfq-sampling-card__form">
                                <Form.Control
                                    type="number"
                                    placeholder="Marks"
                                    min="0"
                                    className="rfq-clause-input rfq-clause-input--narrow"
                                    value={samplingWeightage}
                                    onChange={(e) => setSamplingWeightage(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="rfq-clause-pill-btn rfq-clause-pill-btn--primary"
                                    onClick={handleAddSamplingClause}
                                    disabled={loading || !samplingWeightage}
                                >
                                    {loading ? '…' : 'Add'}
                                </button>
                                <button
                                    type="button"
                                    className="rfq-clause-pill-btn"
                                    onClick={() => { setShowSamplingForm(false); setSamplingWeightage(""); }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="rfq-clause-pill-btn rfq-clause-pill-btn--primary"
                                onClick={() => setShowSamplingForm(true)}
                                disabled={loading}
                            >
                                + Add Sampling Clause
                            </button>
                        )}
                    </div>
                </div>

                {/* Add / Update clause form (accordion) */}
                <div className={`rfq-clause-form rfq-clause-form--accordion${(update || message.length > 0) ? ' rfq-clause-form--open' : ''}`}>
                    <div className="rfq-clause-form__header">
                        <div className="rfq-clause-form__marks">
                            <label className="rfq-clause-label">Marks <span className="rfq-required">*</span></label>
                            <Form.Control
                                type="number"
                                placeholder="e.g. 10"
                                className="rfq-clause-input"
                                min="0"
                                value={weightage}
                                onChange={(e) => setWeightage(e.target.value)}
                            />
                        </div>
                        <div className="rfq-clause-form__attach">
                            <label className="rfq-clause-label">&nbsp;</label>
                            <button
                                type="button"
                                onClick={handleAttachFileClick}
                                className="rfq-clause-attach-btn"
                            >
                                <FontAwesomeIcon icon={faPaperclip} />
                                <span>Attach file</span>
                                {fileLoading && <span className="rfq-clause-attach-btn__spinner" />}
                            </button>
                        </div>
                        <div className="rfq-clause-form__cta-wrap">
                            <label className="rfq-clause-label">&nbsp;</label>
                            {update ? (
                                <button
                                    type="button"
                                    className="rfq-btn rfq-btn--primary rfq-clause-form__cta"
                                    onClick={handleUpdateClause}
                                    disabled={!message || message.length === 0 || !weightage || weightage === ""}
                                >
                                    Update
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="rfq-btn rfq-btn--primary rfq-clause-form__cta"
                                    onClick={handleAddClause}
                                    disabled={!message || message.length === 0 || !weightage || weightage === ""}
                                >
                                    Add Clause
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="rfq-clause-form__accordion-body">
                        <div className="rfq-clause-form__field">
                            <label className="rfq-clause-label">{update ? "Edit clause" : "Add a clause"} <span className="rfq-required">*</span></label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Full clause text — what the vendor must comply with"
                                className={`rfq-clause-input rfq-clause-input--textarea${messageOverLimit ? " rfq-clause-input--invalid" : messageNearLimit ? " rfq-clause-input--warn" : ""}`}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                maxLength={CLAUSE_TEXT_MAX}
                            />
                            <div
                                className={`rfq-char-count${messageOverLimit ? " rfq-char-count--over" : messageNearLimit ? " rfq-char-count--warn" : ""}`}
                                aria-live="polite"
                            >
                                {messageLength} / {CLAUSE_TEXT_MAX}
                            </div>
                        </div>
                        {files.length > 0 && (
                            <div className="rfq-clause-attach-list">
                                <FileLink
                                    Files={files}
                                    ColumnClass="col-md-6"
                                    Style={{ fontSize: "12px" }}
                                    showDownload={false}
                                    RemoveFile={handleRemoveFile}
                                />
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => uploadToServer(e)}
                    />
                </div>

                {/* Existing clauses list */}
                <div className="rfq-clause-list-block">
                    <p className="rfq-clause-list-block__title">List of Clauses {visibleClauses.length > 0 && <span className="rfq-clause-list-block__count">({visibleClauses.length})</span>}</p>
                    {loading && <FullLoader />}
                    {!loading && visibleClauses.length === 0 && (
                        <p className="rfq-clause-list-block__empty">No clauses added yet. Add one above.</p>
                    )}
                    {!loading && visibleClauses.length > 0 && (
                        <div className="rfq-clause-list">
                            {visibleClauses.map((clause, index) => (
                                <div key={clause._localId || clause.clause_id || index} className="rfq-clause-card">
                                    <div className="rfq-clause-card__text-cell">
                                        <ClauseText text={clause.clause_text} />
                                        {clause.files && clause.files.length > 0 && (
                                            <span className="rfq-clause-card__files">
                                                <FileLink
                                                    Files={clause.files}
                                                    ColumnClass="col-md-5"
                                                    Style={{ fontSize: "11px" }}
                                                    showDownload={true}
                                                />
                                            </span>
                                        )}
                                    </div>
                                    <div className="rfq-clause-card__marks-cell">
                                        <span className="rfq-tag rfq-tag--primary">Marks: {clause.weightage || 0}</span>
                                        {clause.isPending && (
                                            <span className="rfq-tag" style={{ marginLeft: 6, fontSize: 10, background: '#fef3c7', color: '#92400e' }}>Unsaved</span>
                                        )}
                                    </div>
                                    <div className="rfq-clause-card__actions">
                                        <button
                                            type="button"
                                            className="rfq-clause-card__icon-btn"
                                            onClick={() => openUpdateField(clause)}
                                            title="Edit clause"
                                            aria-label="Edit clause"
                                        >
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        <button
                                            type="button"
                                            className="rfq-clause-card__icon-btn rfq-clause-card__icon-btn--danger"
                                            onClick={() => clause.isPending
                                                ? handleDeletePendingClause(clause._localId)
                                                : handleDeleteClause(clause.clause_id)
                                            }
                                            title="Remove clause"
                                            aria-label="Remove clause"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal.Body>

            <Modal.Footer className="rfq-clause-modal__footer">
                <button type="button" className="rfq-btn rfq-btn--ghost" onClick={handleHide}>
                    Close
                </button>
                <button
                    type="button"
                    className="rfq-btn rfq-btn--primary"
                    onClick={handleSaveAll}
                    disabled={loading}
                >
                    {loading
                        ? <span className="rfq-clause-spinner" />
                        : update ? 'Update' : 'Save'}
                </button>
            </Modal.Footer>
        </Modal>
    );
}

export default AddClauseModal;
