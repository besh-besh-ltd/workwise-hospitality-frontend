import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_KEY = "vendorRegistrationDraft";
const DB_NAME = "vendorRegistrationFiles";
const STORE_NAME = "files";
const DB_VERSION = 1;
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── IndexedDB helpers ──────────────────────────────
const openDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const saveFilesToDB = async (files) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(files, "documents");
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to save files to IndexedDB:", err);
  }
};

const loadFilesFromDB = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get("documents");
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const clearFilesFromDB = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // silent
  }
};

// ── Human-readable time ago ────────────────────────
const timeAgo = (timestamp) => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "yesterday";
};

// ── Hook ───────────────────────────────────────────
const useDraft = (isHospitality) => {
  const [draft, setDraft] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState("");
  const saveTimerRef = useRef(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      // Expiry check
      if (Date.now() - parsed.savedAt > EXPIRY_MS) {
        localStorage.removeItem(DRAFT_KEY);
        clearFilesFromDB();
        return;
      }

      // Flow mismatch check
      if (parsed.isHospitality !== isHospitality) {
        localStorage.removeItem(DRAFT_KEY);
        clearFilesFromDB();
        return;
      }

      setDraft(parsed);
      setHasDraft(true);
      setDraftAge(timeAgo(parsed.savedAt));
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [isHospitality]);

  // Save form values to localStorage (debounced)
  const saveDraft = useCallback(
    (formValues, currentStep) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          // Strip passwords for security
          const { password, confirm_password, ...safeValues } = formValues;
          const payload = {
            formValues: safeValues,
            currentStep,
            isHospitality,
            savedAt: Date.now(),
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } catch {
          // storage full or blocked
        }
      }, 1000);
    },
    [isHospitality]
  );

  // Save files to IndexedDB
  const saveFiles = useCallback(async (documentFiles) => {
    // Only store actual File objects (skip nulls)
    const toStore = {};
    Object.entries(documentFiles).forEach(([key, file]) => {
      if (file instanceof File) {
        toStore[key] = file;
      }
    });
    if (Object.keys(toStore).length > 0) {
      await saveFilesToDB(toStore);
    }
  }, []);

  // Load files from IndexedDB
  const loadFiles = useCallback(async () => {
    return await loadFilesFromDB();
  }, []);

  // Clear everything
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    clearFilesFromDB();
    setDraft(null);
    setHasDraft(false);
    setDraftAge("");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { draft, hasDraft, draftAge, saveDraft, saveFiles, loadFiles, clearDraft };
};

export default useDraft;
