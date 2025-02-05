import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const InterestForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    phoneNumber: "",
    email: "",
    painPoints: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setFormData({
      name: "",
      companyName: "",
      phoneNumber: "",
      email: "",
      painPoints: "",
    });
  };

  return (
    <>
      <div
        className="min-vh-100 bg-light d-flex justify-centent-center align-items-center p-4 "
        style={{
          marginTop: "40px",
          background: "linear-gradient(50deg, #005F96, #50A055)",
        }}
      >
        <div
          className="card p-4 shadow-lg w-100 mx-auto "
          style={{
            maxWidth: "500px",
            background: "rgba(160, 169, 188, 0.4)",
            backdropFilter: "blur(15px)",
            webkitBackdropFilter: "blur(15px)",
            borderRadius: "15px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {" "}
          {/* <img src="/logo.png" alt="Workwise Logo" className="mx-auto d-block mb-3" style={{ width: "100px" }} /> */}
          <h2
            className="text-center mb-3 text-white"
            style={{ fontWeight: "700" }}
          >
            Welcome to the Interest Form for India Energy Week!
          </h2>
          <p
            className="text-center mb-3 text-white "
            style={{ fontWeight: "600", color: "white" }}
          >
            We’re excited for you to join us in discussing procurement
            opportunities in the energy sector.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="form-control mb-3"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name"
              required
            />
            <input
              type="text"
              className="form-control mb-3"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Company Name"
              required
            />
            <input
              type="text"
              className="form-control mb-3"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Phone Number"
              required
            />
            <input
              type="email"
              className="form-control mb-3"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email (Optional)"
            />
            <textarea
              className="form-control mb-3"
              name="painPoints"
              value={formData.painPoints}
              onChange={handleChange}
              placeholder="Pain Points/Any Other Comments?"
              rows="3"
            ></textarea>
            <button type="submit" className="btn btn-primary w-100">
              Submit Your Interest
            </button>
          </form>
        </div>
      </div>

    </>
  );
};

export default InterestForm;
