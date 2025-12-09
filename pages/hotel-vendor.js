import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import RegisterUserModal from "../components/modal/RegisterUserModal";
import AuthModal from "../components/modal/AuthModal";

const HotelVendor = () => {
  const router = useRouter();
  const { register, login } = router.query;
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    if (register === "true" || register === "") {
      setShowRegisterModal(true);
    }
    if (login === "true" || login === "") {
      setShowLoginModal(true);
      setActiveTab("login");
    }
  }, [register, login]);

  return (
    <>
      <Head>
        <title>Welcome to Phileein</title>
        <meta
          name="description"
          content="Phileein vendor onboarding"
        />
      </Head>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "white",
            marginBottom: "2rem",
          }}
        >
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: "bold",
              marginBottom: "0.5rem",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            Phileein
          </h1>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "normal",
              textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            Welcome to Phileein
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => {
              setShowLoginModal(true);
              setActiveTab("login");
            }}
            style={{
              padding: "12px 32px",
              fontSize: "1.1rem",
              fontWeight: "600",
              backgroundColor: "white",
              color: "#667eea",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 8px rgba(0,0,0,0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
            }}
          >
            Login
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            style={{
              padding: "12px 32px",
              fontSize: "1.1rem",
              fontWeight: "600",
              backgroundColor: "white",
              color: "#667eea",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 8px rgba(0,0,0,0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
            }}
          >
            Register
          </button>
        </div>
      </div>

      <RegisterUserModal
        showModal={showRegisterModal}
        setShowModal={setShowRegisterModal}
        showButton={false}
        isPaidSubscription={true}
        isHospitality={true}
      />

      <AuthModal
        showModal={showLoginModal}
        closeModal={() => setShowLoginModal(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAuthModal={showLoginModal}
        setOpenAuthModal={setShowLoginModal}
        setEmail={() => {}}
        setPassword={() => {}}
        loading={false}
        setloading={() => {}}
        loginSubmitHandler={() => {}}
        loginWithGoogle={() => {}}
      />
    </>
  );
};

export default HotelVendor;


