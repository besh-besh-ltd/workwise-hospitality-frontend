import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  faYoutube,
  faLinkedin,
  faFacebook,
  faTwitter,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DynamicSection from "@/components/dynamicSection/dynamicSection";
import ContactUsModal from "@/components/modal/contactUsModal";
import { useRouter } from "next/router";
import { getUserDetails } from "@/services/Auth";

const Footer = ({ cmsdata, showModal = false, setshowModal, fromType }) => {
  const router = useRouter();
  const { type } = router.query;
  const [openContactUsModal, setOpenContactUsModal] = useState(false);
  const [loggedinUser, setLoggedinUser] = useState(null);

  // Set State Change
  const handleChange = (setState) => (event) => {
    setState(event);
  };

  useEffect(() => {
    if (showModal) {
      handleChange(setOpenContactUsModal(showModal));
    }
  }, [showModal]);

  const removeQueryString = () => {
    const { pathname } = router;
    router.replace({ pathname });
  };

  useEffect(() => {
    const user = getUserDetails();
    if (user?.name) {
      setLoggedinUser(user);
    } else {
      setLoggedinUser(null);
    }
  }, [router]);

  return (
    <>
      {/* OLD FOOTER COMMENTED OUT - USING NEW FOOTER */}
      {/* <footer className="main-footer">
        {cmsdata &&
          !loggedinUser &&
          cmsdata.map((item) => {
            if (item.section_name == "footer-top") {
              return <DynamicSection content={item.content} key={item.id} />;
            }
          })}
        <div className="footer-copyright">
          <div className="container d-md-flex justify-content-md-between">
            <p>
              © Copyrights 2024, Workwise | All rights reserved 
            </p>
            <ul>
              <li>
              <Link href="/privacypolicy">Privacy Policy</Link>
              </li>
              <li>
              <Link href="/terms-of-use">Terms of Use</Link>
              </li>
              <li>
              <Link href="https://www.linkedin.com/company/workwise11/" target="_blank">
                        <FontAwesomeIcon icon={faLinkedin} />{" "}
                        <span>Linkedin</span>
                      </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer> */}
      {/* ------------- Contact Modal ------------- */}
      <ContactUsModal
        showModal={openContactUsModal}
        fromType={fromType}
        closeModal={() => {
          //removeQueryString()
          handleChange(setOpenContactUsModal(false));
          setshowModal ? setshowModal(false) : null;
        }}
      />
    </>
  );
};
export default Footer;
