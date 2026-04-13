import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    ["clean"],
  ],
};

const editorShellStyle = {
  width: "100%",
  border: "1px solid #a5a5a5",
  borderRadius: "6px",
  overflow: "hidden",
  backgroundColor: "#fff",
};

const applyEditorSizing = (quill) => {
  const toolbar = quill.getModule("toolbar")?.container;

  if (toolbar) {
    Object.assign(toolbar.style, {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      padding: "12px",
      border: "0",
      borderBottom: "1px solid #d9d9d9",
      backgroundColor: "#fafafa",
      alignItems: "center",
    });

    toolbar.querySelectorAll(".ql-formats").forEach((group) => {
      Object.assign(group.style, {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginRight: "0",
      });
    });

    toolbar.querySelectorAll("button").forEach((button) => {
      Object.assign(button.style, {
        width: "38px",
        height: "38px",
        padding: "7px",
      });
    });

    toolbar.querySelectorAll("svg").forEach((svg) => {
      Object.assign(svg.style, {
        width: "22px",
        height: "22px",
      });
    });

    toolbar.querySelectorAll(".ql-picker").forEach((picker) => {
      Object.assign(picker.style, {
        minWidth: "104px",
        height: "38px",
        fontSize: "15px",
      });
    });

    toolbar.querySelectorAll(".ql-picker-label").forEach((label) => {
      Object.assign(label.style, {
        display: "flex",
        alignItems: "center",
        height: "38px",
        padding: "0 30px 0 12px",
        fontSize: "15px",
      });
    });

    toolbar.querySelectorAll(".ql-picker-options").forEach((options) => {
      Object.assign(options.style, {
        fontSize: "15px",
      });
    });
  }

  if (quill.container) {
    Object.assign(quill.container.style, {
      border: "0",
      fontSize: "16px",
    });
  }

  if (quill.root) {
    Object.assign(quill.root.style, {
      minHeight: "220px",
      fontSize: "16px",
      lineHeight: "1.7",
    });
  }
};

const WysiwygEditor = ({
  value,
  onChange,
  onBlur,
  placeholder = "",
  readOnly = false,
  className = "",
}) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const lastEmittedValue = useRef(value || "");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) {
      return undefined;
    }

    const quill = new Quill(editorRef.current, {
      theme: "snow",
      placeholder,
      modules,
      readOnly,
    });

    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    quill.on("text-change", () => {
      const html = quill.root.innerHTML === "<p><br></p>" ? "" : quill.root.innerHTML;
      lastEmittedValue.current = html;
      onChangeRef.current?.(html);
    });

    quill.on("selection-change", (range, oldRange) => {
      if (!range && oldRange) {
        onBlurRef.current?.();
      }
    });

    applyEditorSizing(quill);
    quillRef.current = quill;

    return () => {
      quillRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!quillRef.current) {
      return;
    }

    quillRef.current.enable(!readOnly);
  }, [readOnly]);

  useEffect(() => {
    if (!quillRef.current) {
      return;
    }

    const normalizedValue = value || "";

    // Skip if the incoming value matches what the editor last emitted
    // (the change round-tripped through Formik/Redux back to us)
    if (normalizedValue === lastEmittedValue.current) {
      return;
    }

    const currentValue =
      quillRef.current.root.innerHTML === "<p><br></p>"
        ? ""
        : quillRef.current.root.innerHTML;

    if (currentValue !== normalizedValue) {
      try {
        quillRef.current.clipboard.dangerouslyPasteHTML(normalizedValue);
      } catch {
        // Quill can throw when selection state is null; fall back to direct update
        quillRef.current.root.innerHTML = normalizedValue || "<p><br></p>";
      }
      lastEmittedValue.current = normalizedValue;
    }
  }, [value]);

  return (
    <div className={className} style={editorShellStyle}>
      <div ref={editorRef} />
    </div>
  );
};

export default WysiwygEditor;
