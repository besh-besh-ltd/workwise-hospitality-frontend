import React from "react";

// Shared scaffold body. Each page shell passes its title; the owning task
// replaces the shell's body and drops this import.
const PagePlaceholder = ({ title, children }) => (
  <div className="main-body">
    <h1 className="page-h1">{title}</h1>
    <p>Coming soon</p>
    {children}
  </div>
);

export default PagePlaceholder;
