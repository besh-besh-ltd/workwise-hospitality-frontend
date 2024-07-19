import React from "react";
import Image from "next/image";
import Link from "next/link";
import Slider from "react-slick";
import Accordion from "react-bootstrap/Accordion";
import Modal from "react-modal";
import { useEffect, useState } from "react";
import HomeBanner from "./homeBanner";
import { ToastContainer, toast } from "react-toastify";
import { HomeBannerService, HomeLists1Service } from "@/services/Home";
import DynamicSection from "../dynamicSection/dynamicSection";
import {
  getBLOGS,
  getFaqs,
  getHomeCompanies,
  getHomeMediaVideo,
  getProducts,
  getTestimonials,
} from "@/services/cms";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";

const initialSections = [
  "homepage-section-1",
  "homepage-section-2",
  "homepage-section-3",
];

const predefinedPageSections = [
  "homepage-section-1",
  "homepage-section-2",
  "homepage-section-3",
  "homepage-section-5",
  "homepage-faq-section",
  "homepage-blog-section",
  "homepage-media-section",
  "homepage-company-section",
  "homepage-section-products",
  "Home-section bottom",
  "banner-contents",
];

export default function Homepage() {
  const [showBannerLists, setBannerLists] = useState([]);
  const [showHomeLists1, setHomeLists1] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [video, setVideo] = useState(null);
  const [companies, setCompanies] = useState(null);
  const [products, setProducts] = useState(null);

  const [modal1IsOpen, setModal1IsOpen] = useState(false);
  const [modal2IsOpen, setModal2IsOpen] = useState(false);
  const [middleIndex, setmiddleIndex] = useState(0);
  const [playVideo, setPlayVideo] = useState(null);
  const LINKEDIN_CLIENT_SECRET = "Nj013dgpw51YIi1Z";
  const LINKEDIN_CLIENT_ID = "77xquc68cjr3s6";
  const LINKEDIN_CALLBACK_URL = "http://localhost:8111";
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (code) {
      handleLogin(code);
    }
  }, [router, code]);

  const handleLogin = async (code) => {
    axios
      .get(
        `http://www.linkedin.com/oauth/v2/accessToken?grant_type=authorization_code&client_id=${LINKEDIN_CLIENT_ID}&client_secret=${LINKEDIN_CLIENT_SECRET}&code=${code}&redirect_uri=${LINKEDIN_CALLBACK_URL}`
      )
      .then(async (res) => {
        console.log(res.data.access_token);
        let accessToken = res.data.access_token;
        const userProfile = await fetch(
          "http://api.linkedin.com/v2/me?projection=(id,firstName,lastName)",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        console.log("userProfile", userProfile);
      });
  };

  // Set State Change
  const handleChange = (setState) => (event) => {
    setState(event);
  };

  const openModal1 = () => {
    setModal1IsOpen(true);
  };

  const closeModal1 = () => {
    setModal1IsOpen(false);
    setPlayVideo(null);
  };

  const openModal2 = () => {
    setModal2IsOpen(true);
  };

  const closeModal2 = () => {
    setModal2IsOpen(false);
  };

  // Use useEffect to handle the body overflow property for both modals
  useEffect(() => {
    const handleBodyOverflow = () => {
      document.body.style.overflow =
        modal1IsOpen || modal2IsOpen ? "hidden" : "auto";
    };

    handleBodyOverflow(); // Set initial state

    // Cleanup function to restore body overflow when the component unmounts
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [modal1IsOpen, modal2IsOpen]);

  var customerslider = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    autoplay: false,
    dots: false,
    arrows: true,
  };

  var productsSlider = {
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          dots: false,
          arrows: true,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          dots: true,
          arrows: false,
        },
      },
    ],
  };

  var companiesSlider = {
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    dots: false,
    arrows: false,
    responsive: [
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
    ],
  };

  var resourceSlider = {
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          dots: false,
          arrows: true,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          dots: true,
          arrows: false,
        },
      },
    ],
  };

  // ----------- Banner ---------
  const getHomeBannerLists = () => {
    HomeBannerService()
      .then((response) => {
        handleChange(setBannerLists(response.data));
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };
  // ----------- Why Choose Us / Process Overview  -----------
  const getHomeLists1 = () => {
    HomeLists1Service()
      .then((response) => {
        handleChange(setHomeLists1(response.data));
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };

  const getFAQS = () => {
    getFaqs()
      .then((response) => {
        setmiddleIndex(Math.ceil(response.data.length / 2));
        setFaqs(response.data);
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };

  const getBlogs = () => {
    getBLOGS()
      .then((response) => {
        setBlogs(response.data);
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };

  const getMedioVideo = () => {
    getHomeMediaVideo()
      .then((response) => {
        setVideo(response.data);
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };
  const getCompaniesLogos = () => {
    getHomeCompanies()
      .then((response) => {
        setCompanies(response.data);
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };
  const getTestimonialsList = () => {
    getTestimonials()
      .then((response) => {
        setTestimonials(response.data);
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };

  const getProductsList = () => {
    getProducts()
      .then((response) => {
        setProducts(response.data);
      })
      .catch((error) => {
        // if (error.message.response?.status === 400) {
        // 	toast.error(error.message.response.data.message, {
        // 		position: "top-center",
        // 	});
        // } else {
        // 	toast.error(error.message.message, {
        // 		position: "top-center",
        // 	});
        // }
      });
  };
  useEffect(() => {
    getHomeBannerLists();
    getHomeLists1();
    getFAQS();
    getBlogs();
    getMedioVideo();
    getCompaniesLogos();
    getTestimonialsList();
    getProductsList();
  }, []);

  return (
    <>
      <Head>
        <title>Workwise | Home</title>
      </Head>
      {/* ----- Banner -------- */}
      {showBannerLists && (
        <HomeBanner bannerContent={showHomeLists1} content={showBannerLists} />
      )}

      {/* --------- Why Choose Us / Process Overview --------- */}
      {showHomeLists1.map((item) => {
        if (initialSections.includes(item.section_name)) {
          return <DynamicSection content={item.content} key={item.id} />;
        }
      })}

      {/* Testimonials */}
      {testimonials && (
        <section className="home-sec-3 sc-pb-80 nobgimg">
          <div className="container">
            <div className="home-sec-3-btm">
              <Slider {...customerslider}>
                {testimonials.map((item) => {
                  return (
                    <div
                      className="customer-slide"
                      key={`testimonial ${item.id}`}
                    >
                      <div className="customer-panel">
                        <div className="customer-img">
                          <div className="customer-vdo">
                            <p>
                              Watch <br />
                              Video Story
                            </p>
                            <button
                              onClick={() => {
                                openModal1(item?.url);
                                setPlayVideo(item?.url);
                              }}
                              className="video-play-button"
                            >
                              <Image
                                src="/assets/images/vdo-play.svg"
                                alt="Play"
                                width={99}
                                height={99}
                                priority={true}
                              />
                            </button>
                            <Modal
                              isOpen={modal1IsOpen}
                              onRequestClose={closeModal1}
                              contentLabel="Video Modal"
                              style={{
                                overlay: {
                                  backgroundColor: "rgba(0, 0, 0, 0.75)",
                                },
                                content: {
                                  position: "relative",
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%)",
                                  maxWidth: "800px", // Adjust this value as needed
                                  width: "auto", // Set to 'auto' or a specific value based on your design
                                  maxHeight: "90vh", // Adjust this value as needed
                                  border: "none",
                                  background: "transparent",
                                  overflow: "hidden",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "30px",
                                },
                              }}
                            >
                              <div class="modal-header">
                                <button
                                  onClick={closeModal1}
                                  class="btn-close"
                                  aria-label="Close"
                                ></button>
                              </div>

                              <div className="modal-body">
                                <div className="video-container">
                                  <iframe
                                    src={playVideo}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    width="100%"
                                    height="450"
                                  ></iframe>
                                </div>
                              </div>
                            </Modal>
                          </div>
                          <figure>
                            <Image
                              src={item?.image_url}
                              alt="Workwise"
                              width={540}
                              height={528}
                              priority={true}
                            />
                          </figure>
                        </div>
                        <div className="customer-con">
                          <div className="common-header">
                            <h6>What Customers Say About Us</h6>
                            <h2>{item?.title}</h2>
                          </div>
                          <div className="customer-text">
                            <p>{item?.description}</p>
                          </div>
                          <div className="client-arewa">
                            <div className="client-img">
                              {/* <Image
                                src="/assets/images/client.jpg"
                                alt="Workwise"
                                width={72}
                                height={72}
                                priority={true}
                              /> */}
                              <Image
                                src={
                                  item?.created_image_url == "" ||
                                  item?.created_image_url == null
                                    ? "/assets/images/products-1.jpg"
                                    : item?.created_image_url
                                }
                                alt={item?.name}
                                width={72}
                                height={72}
                                priority={true}
                              />
                            </div>
                            <div className="client-con">
                              <p>
                                {item?.created_name}{" "}
                                {/* <span>Dat pretium augue</span> */}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Slider>
            </div>
          </div>
        </section>
      )}
      {/* Testimonials end*/}

      {/* expert-consulting */}
      {showHomeLists1.map((item) => {
        if (item.section_name == "homepage-section-5") {
          return <DynamicSection content={item.content} key={item.id} />;
        }
      })}
      {/* expert-consulting end*/}

      {products && products.length > 0 && (
        <section className="home-sec-4 sc-pt-80 sc-pb-80" id="products">
          <div className="container">
            {showHomeLists1.map((item) => {
              if (item.section_name == "homepage-section-products") {
                return <DynamicSection content={item.content} key={item.id} />;
              }
            })}

            <div className="home-sec-products">
              <Slider {...productsSlider}>
                {products.map((item) => {
                  return (
                    <div className="producs-slider-area" key={item?.name}>
                      {/* <Link href={`product/${item?.slug}`}> */}
                      <Link
                        href={`/products?s=${item?.name.split(" ").join("+")}`}
                      >
                        <figure>
                          {" "}
                          <Image
                            src={
                              item?.image_url == "" || item?.image_url == null
                                ? "/assets/images/products-1.jpg"
                                : item?.image_url
                            }
                            alt={item?.name}
                            width={350}
                            height={440}
                            priority={true}
                          />
                        </figure>
                        <div className="producs-bottom-area">
                          <div className="producs-bottom-con">
                            <span>{item?.name}</span>
                            <p>{item?.short_description}</p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </Slider>
            </div>
          </div>
        </section>
      )}

      {/* video media start */}

      {video && (
        <section className="home-sec-5 sc-pt-80 media-sec-home">
          <div className="container">
            {showHomeLists1.map((item) => {
              if (item.section_name == "homepage-media-section") {
                return <DynamicSection content={item.content} key={item.id} />;
              }
            })}
          </div>
        </section>
      )}

      {video && (
        <section className="home-sec-5 sc-pb-80">
          <div className="container">
            <div className="search-vdo">
              <div className="watch-vdo">
                <span>Watch Video on</span>
                <Link href="#" target="_blank">
                  <Image
                    src="/assets/images/youtube-logo.svg"
                    alt="Play"
                    width={42}
                    height={42}
                    priority={true}
                  />
                </Link>
              </div>
              <button
                onClick={() => openModal2(video.url)}
                className="video-play-button"
              >
                <Image
                  src="/assets/images/vido-btn-orange.svg"
                  alt="Play"
                  width={135}
                  height={135}
                  priority={true}
                />
              </button>
              <Modal
                isOpen={modal2IsOpen}
                onRequestClose={closeModal2}
                contentLabel="Video Modal"
                style={{
                  overlay: {
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                  },
                  content: {
                    position: "relative",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    maxWidth: "800px", // Adjust this value as needed
                    width: "auto", // Set to 'auto' or a specific value based on your design
                    maxHeight: "90vh", // Adjust this value as needed
                    border: "none",
                    background: "transparent",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "30px",
                  },
                }}
              >
                <div class="modal-header">
                  <button
                    onClick={closeModal2}
                    class="btn-close"
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body">
                  <div className="video-container">
                    <iframe
                      width="100%"
                      height="450"
                      src={video?.url}
                      title="YouTube video player"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              </Modal>
              <figure className="image-area">
                {video?.thumbnail_url.includes("http://") ? (
                  <Image
                    src={video?.thumbnail_url}
                    alt="Play"
                    width={1100}
                    height={514}
                    priority={true}
                  />
                ) : (
                  <Image
                    src="/assets/images/vido-btn-orange.svg"
                    alt="Play"
                    width={1100}
                    height={514}
                    priority={true}
                  />
                )}
              </figure>
            </div>
          </div>
        </section>
      )}
      {/* video media end */}

      {/* companies */}
      {companies && (
        <section className="home-sec-6 sc-pt-80 sc-pb-80">
          <div className="container">
            {showHomeLists1.map((item) => {
              if (item.section_name == "homepage-company-section") {
                return <DynamicSection content={item.content} key={item.id} />;
              }
            })}
            <div className="home-sec-companies">
              <Slider {...companiesSlider}>
                {companies &&
                  companies.map((item) => {
                    return (
                      <div
                        className="companies-slider-area"
                        key={`companies-${item.id}`}
                      >
                        {item.image_url && (
                          <figure>
                            <Image
                              src={item.image_url}
                              alt="Workwise"
                              width={198}
                              height={57}
                              priority={true}
                            />
                          </figure>
                        )}
                      </div>
                    );
                  })}
              </Slider>
            </div>
          </div>
        </section>
      )}
      {/* companies end */}

      {/* blogs start */}

      {blogs && (
        <section className="home-sec-7 sc-pt-80 faq-sec">
          <div className="container">
            {showHomeLists1.map((item) => {
              if (item.section_name == "homepage-blog-section") {
                return <DynamicSection content={item.content} key={item.id} />;
              }
            })}
          </div>
        </section>
      )}

      {blogs && (
        <section className="home-sec-7 sc-pb-80 faq-sec">
          <div className="container">
            <div className="home-sec-resource">
              <Slider {...resourceSlider}>
                {blogs.map((item) => {
                  return (
                    <div
                      className="resource-slider-area"
                      key={`blog-${item.id}`}
                    >
                      {/*  <Link href={`blog/${item?.slug}`}>  */}
                      <figure>
                        {" "}
                        <Image
                          src={item?.image_url}
                          alt={item?.title}
                          width={350}
                          height={363}
                          priority={true}
                        />
                      </figure>
                      <div className="resource-bottom-area">
                        <div className="resource-bottom-con">
                          <span>{item?.blog_category}</span>
                          <p>{item?.description}</p>
                        </div>
                      </div>
                      {/* </Link> */}
                    </div>
                  );
                })}
              </Slider>
            </div>
          </div>
        </section>
      )}

      {/* blogs end */}

      {/* FAQ start */}
      {faqs && (
        <section className="home-sec-8">
          <div className="container sc-pt-80 ">
            {showHomeLists1.map((item) => {
              if (item.section_name == "homepage-faq-section") {
                return <DynamicSection content={item.content} key={item.id} />;
              }
            })}
          </div>
        </section>
      )}
      {faqs && (
        <section className="home-sec-8 ">
          <div className="container sc-pb-80 nobgimg">
            <div className="faq-area">
              <div className="row">
                <div className="col-md-6 first-col">
                  <div className="accordion-container">
                    {faqs && faqs.length > 0 && (
                      <Accordion>
                        {faqs.slice(0, middleIndex).map((item, index) => {
                          return (
                            <Accordion.Item
                              eventKey={item.id}
                              key={`faq-${item.id}`}
                            >
                              <Accordion.Header>
                                {item.question}
                              </Accordion.Header>
                              <Accordion.Body>
                                {item.description}
                              </Accordion.Body>
                            </Accordion.Item>
                          );
                        })}
                      </Accordion>
                    )}
                  </div>
                </div>
                <div className="col-md-6 last-col">
                  <div className="accordion-container">
                    {faqs && faqs.length > 0 && (
                      <Accordion>
                        {faqs.slice(middleIndex).map((item, index) => {
                          return (
                            <Accordion.Item eventKey={item.id} key={item.id}>
                              <Accordion.Header>
                                {item.question}
                              </Accordion.Header>
                              <Accordion.Body>
                                {item.description}
                              </Accordion.Body>
                            </Accordion.Item>
                          );
                        })}
                      </Accordion>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* OTHER SECTIONS */}
      {showHomeLists1.map((item) => {
        if (!predefinedPageSections.includes(item.section_name)) {
          return (
            <div className="container sc-pb-80">
              <div
                dangerouslySetInnerHTML={{
                  __html: item.content,
                }}
              ></div>
            </div>
          );
        }
      })}

      {/* FAQ end */}
      <ToastContainer />
    </>
  );
}
