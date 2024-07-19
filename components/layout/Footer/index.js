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
      <footer className="main-footer">
        {cmsdata &&
          !loggedinUser &&
          cmsdata.map((item) => {
            if (item.section_name == "footer-top") {
              return <DynamicSection content={item.content} key={item.id} />;
            }
          })}
        <div className="footer-top sc-pt-80 sc-pb-80">
          <div className="container">
            <div className="row">
              <div className="footer-col col-md-3">
                <h6>About Us</h6>
                <nav className="footer-navigation">
                  <ul>
                    <li>
                      <Link href="#">Profile</Link>
                    </li>
                    <li>
                      <Link href="#">Our Team</Link>
                    </li>
                    <li>
                      <Link href="#">Our Business</Link>
                    </li>
                    <li>
                      <Link href="#">Events</Link>
                    </li>
                    <li>
                      <Link href="#">Gallery</Link>
                    </li>
                    <li>
                      <Link href="/contactus">Contact</Link>
                    </li>
                  </ul>
                </nav>
              </div>
              <div className="footer-col col-md-3">
                <h6>Products</h6>
                <nav className="footer-navigation">
                  <ul>
                    <li>
                      <Link href="#">Pipes and Tubes</Link>
                    </li>
                    <li>
                      <Link href="#">Strainers</Link>
                    </li>
                    <li>
                      <Link href="#">Valves</Link>
                    </li>
                    <li>
                      <Link href="#">Sheet Plate</Link>
                    </li>
                    <li>
                      <Link href="#">Widing Wires</Link>
                    </li>
                    <li>
                      <Link href="#">Burners</Link>
                    </li>
                  </ul>
                </nav>
              </div>
              <div className="footer-col col-md-4">
                <h6>Quick Links</h6>
                <nav className="footer-navigation">
                  <ul>
                    <li>
                      <Link href="#">Browse by Category, item or vendor</Link>
                    </li>
                    <li>
                      <Link href="#">Advanced Search</Link>
                    </li>
                    <li>
                      <Link href="#">List of Approved Vendors</Link>
                    </li>
                    <li>
                      <Link href="/contactus">Contact Us</Link>
                    </li>
                    <li>
                      <Link href="/terms-of-use">Terms of Use</Link>
                    </li>
                    <li>
                      <Link href="/privacypolicy">Privacy Policy</Link>
                    </li>
                  </ul>
                </nav>
              </div>
              <div className="footer-col col-md-2">
                <h6>Social Links</h6>
                <nav className="footer-navigation social-media">
                  <ul>
                    <li>
                      <Link href="https://www.linkedin.com/" target="_blank">
                        <FontAwesomeIcon icon={faLinkedin} />{" "}
                        <span>Linkedin</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="https://www.witter.com/" target="_blank">
                        <FontAwesomeIcon icon={faFacebook} />{" "}
                        <span>Facebook</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="https://www.youtube.com/" target="_blank">
                        <FontAwesomeIcon icon={faYoutube} />{" "}
                        <span>Youtube</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="https://www.twitter.com/" target="_blank">
                        <FontAwesomeIcon icon={faTwitter} />{" "}
                        <span>Twitter</span>
                      </Link>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-copyright">
          <div className="container d-md-flex justify-content-md-between">
            <p>
              © Copyrights 2024, workwise | All rights reserved | Digital
              Partner{" "}
              <Link href="https://www.indusnet.co.in/" target="_blank">
                Indus Net Technologies
              </Link>
            </p>
            <ul>
              <li>
                <Link href="#">Verified Vendors</Link>
              </li>
              <li>
                <Link href="#">Global Network</Link>
              </li>
              <li>
                <Link href="#">Help Centre</Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
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
