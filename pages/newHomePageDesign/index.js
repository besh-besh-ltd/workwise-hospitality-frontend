// "use client";
// import React, { useEffect, useState } from "react";
// import RecentBlogs from "./RecentBlogs";
import FAQSection from "./FAQSection";
import HeroSection from "./HeroSection";
import SecondSection from "./SecondSection";
import ThirdSection from "./ThirdSection";
import FourthSection from "./FourthSection";
import FifthSection from "./FifthSection";
import SixthSection from "./SixthSection";
import SeventhSection from "./seventhSection";
import EightSection from "./EightSection";
import "bootstrap/dist/css/bootstrap.min.css";


export default function NewHomePage() {

  return (
    <div >

      {/* hero section  */}
      <HeroSection />

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
