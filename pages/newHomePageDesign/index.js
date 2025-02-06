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
    <div style={{ fontFamily: "Poppins",
}} >
      {/* Fixed Call Button */}
      {/* <CallNowModal /> */}

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

      {/* Teaser demo video */}
      {/* <DemoVideo
        type={"portal_video"}
        title={
          "For the first time in the world, experience AI-powered software and service together"
        }
        videoLink={"https://www.youtube.com/embed/-JPa1MX2HVE"}
        openVideo={openVideo}
        handleToggleVideo={() => handleToggleVideo("portal_video")}
      /> */}

      {/* Work done so far */}
      {/* <WorkDoneSoFar /> */}

      {/* Testimonials */}
      {/* <Testimonials /> */}

      {/* RenownedBodies */}
      {/* <RenownedBodies /> */}

      {/* top highlights
      <TopHighlights /> */}

      {/* auth and without workwise */}
      {/* <WithAndWithoutWorkwise /> */}

      {/* portal demo video */}
      {/* <DemoVideo
        type={"demo_video"}
        title={"Portal Demo Video"}
        videoLink={
          "https://www.youtube.com/embed/gAOdMT-Hqu0?si=ikJ1agQj6dAFVs2r"
        }
        openVideo={openVideo}
        handleToggleVideo={() => handleToggleVideo("demo_video")}
      /> */}

      {/* recent blog */}

      {/* <RecentBlogs /> */}
      

      {/* faq */}
      <FAQSection />
    </div>
  );
}
