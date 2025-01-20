"use client";
import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { TypeAnimation } from "react-type-animation";
import CallNowModal from "./CallNowModal";
import WorkDoneSoFar from "./WorkDoneSoFar";
import RenownedBodies from "./RenownedBodies";
import TopHighlights from "./TopHighlights";
import WithAndWithoutWorkwise from "./WithAndWithoutWorkwise";
import DemoVideo from "./DemoVideo";
import RecentBlogs from "./RecentBlogs";
import FAQSection from "./FAQSection";
import HeroSection from "./HeroSection";

export default function home() {
  return (
    <div>
      {/* Fixed Call Button */}
      <CallNowModal />

      <HeroSection />

      {/* demo video */}
      <DemoVideo />

      {/* Work done so far */}
      <WorkDoneSoFar />

      {/* RenownedBodies */}
      <RenownedBodies />

      {/* top highlights */}
      <TopHighlights />

      {/* wuth and without workwise */}
      <WithAndWithoutWorkwise />

      {/* demo video */}
      <DemoVideo />

      {/* recent blog */}
      <RecentBlogs />

      {/* faq */}
      <FAQSection />
    </div>
  );
}
