"use client";
import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import RecentBlogs from "./RecentBlogs";
import FAQSection from "./FAQSection";
import HeroSection from "./HeroSection";
import SecondSection from "./SecondSection";
import ThirdSection from "./ThirdSection";
import FourthSection from "./FourthSection";
import FifthSection from "./FifthSection";
import SixthSection from "./SixthSection";
import SeventhSection from "./seventhSection";
import EightSection from "./EightSection";

export default function home() {
  const [openVideo, setOpenVideo] = useState({
    portal_video: false,
    demo_video: false,
  });

  const handleToggleVideo = (videoType) => {
    setOpenVideo((prevState) => ({
      ...prevState,
      [videoType]: !prevState[videoType],
    }));
  };

  return (
    <div style={{ fontFamily: "Poppins", }} >

      {/* hero section  */}
      <HeroSection
        handleToggleVideo={() => handleToggleVideo("portal_video")}
      />

      {/* second section */}
      <SecondSection />

      {/* section 3 */}
      <ThirdSection />

      {/* fourth Section */}
      <FourthSection />

      {/* fifth section */}
      <FifthSection />

      {/* SixthSection */}
      <SixthSection />

      {/* seventhSection.jsx */}
      <SeventhSection />

      {/* eight  */}
      <EightSection />

      {/* faq */}
      <FAQSection />
    </div>
  );
}
