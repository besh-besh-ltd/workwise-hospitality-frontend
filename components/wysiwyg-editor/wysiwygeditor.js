// components/WysiwygEditor.js
import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const WysiwygEditor = ({ value, onChange }) => {
  const handleEditorChange = (html) => {
    onChange(html);
  };

  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={handleEditorChange}
      modules={{
        toolbar: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline", "strike", "blockquote"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
      }}
      formats={[
        "header",
        "bold",
        "italic",
        "underline",
        "strike",
        "blockquote",
        "list",
        "bullet",
        "link",
        "image",
      ]}
    />
  );
};

export default WysiwygEditor;
