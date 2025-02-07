import { getCmsData, getPageBanner } from "@/services/cms";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Modal from "react-modal";
import Slider from "react-slick";
import { toast } from "react-toastify";
import DynamicSection from "../dynamicSection/dynamicSection";
import { getTestimonials, getHomeMediaVideo } from "@/services/cms";
import RegisterUserModal from "../modal/RegisterUserModal";

const ForVendors = (props) => {
  const [cmsdata, setCmsdata] = useState([]);
  const [bannerdata, setBanner] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [video, setVideo] = useState(null);
  const [modal2IsOpen, setModal2IsOpen] = useState(false);
  const pageRef = useRef(6);

  var customerslider = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    autoplay: false,
    dots: false,
    arrows: true,
  };

  const openModal2 = () => {
    setModal2IsOpen(true);
  };

  const closeModal2 = () => {
    setModal2IsOpen(false);
  };

  const getTestimonialsList = () => {
    getTestimonials(pageRef.current)
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

  const getMedioVideo = () => {
    getHomeMediaVideo(pageRef.current)
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

  useEffect(() => {
    getCmsSections();
    // getBanner();
    getTestimonialsList();
    getMedioVideo();
  }, []);

  const getCmsSections = () => {
    getCmsData(6)
      .then((response) => {
        if (response.data.length > 0) {
          setCmsdata(response.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getBanner = () => {
    getPageBanner(6)
      .then((response) => {
        if (response.data.length > 0) {
          const regex = /(<([^>]+)>)/gi;
          const content = response.data[0].content.replace(regex, " ");

          setBanner({
            content: content,
            image: response.data[0].image,
            image_url: response.data[0].image_url,
          });
        }
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

  return (
    <>
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{
			
          background: "linear-gradient(50deg, #005F96, #50A055)",
          color: "white",
          padding: "40px 20px",
          textAlign: "center",
          minHeight: "100vh",
          marginTop: "50px",
        }}
      >
        <h1 style={{color:"white", fontSize:"40px"}} > Sellers, Meet Genuine Buyers </h1>
        <h3 style={{color:"white", fontSize:"30px"}} > Join 10,000+ PSU approved Vendors & get verified buyer leads </h3>
        <RegisterUserModal />
      </div>

      {/* hide banner for now */}
      {/* <section
				aria-label="for-vendor-page-banner"
				className="about-sec-1 sc-pt-80"
				style={{
					backgroundImage: "url(" + bannerdata?.image_url + ")",
				}}
			>
				<div className="container">
					<div className="row">
						<div className="col-md-12">
							<div className="about-sec-1-con">
								{bannerdata && <h1>{bannerdata?.content}</h1>}
							</div>
						</div>
					</div>
				</div>
			</section> */}

      {/* <section className="breadcrumbs" aria-label="page-path" >
				<div className="container">
					<div className="row">
						<div className="col-md-12">
							<div className="breadcrumbs-con">
								<a href="/" className="p-bread" rel="noreferer">Home</a>
								{" / "}
								<a href="/for-vendors" className="c-bread" >For vendors</a>
							</div>
						</div>
					</div>
				</div>
			</section> */}

      {cmsdata &&
        cmsdata.map((item) => {
          return <DynamicSection content={item.content} key={item.id} />;
        })}

      {/* Testimonials */}
      {testimonials && (
        <section
          className="home-sec-3 sc-pt-80 sc-pb-80 nobgimg"
          aria-label="vendor-testimonials"
        >
          <div className="container">
            <div className="home-sec-3-btm common-header">
              <h2
                class="fs-6"
                style={{
                  color: "var(--primary-color)",
                  fontWeight: "500",
                  margin: "0 0 15px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                What Our Vendors Say About Us
                <span
                  style={{
                    width: "48px",
                    height: "3px",
                    display: "block",
                    backgroundColor: "var(--primary-color)",
                    marginLeft: "10px",
                  }}
                ></span>
              </h2>
              <h2>Testimonials</h2>
              <Slider {...customerslider}>
                {testimonials.map((item) => {
                  return (
                    <div
                      className="customer-slide"
                      key={`testimonial ${item.id}`}
                    >
                      <div className="customer-panel">
                        <div className="customer-con">
                          <div className="common-header"></div>
                          <div className="customer-text">
                            <p>{item?.description}</p>
                          </div>
                          <div className="client-arewa">
                            <div className="client-img">
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
                              <p
                                className="opacity-75"
                                style={{ fontSize: "16px" }}
                              >
                                {item?.title}
                              </p>
                              <p>{item?.created_name} </p>
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

      {/* video media start */}
      {video && (
        <section
          className="home-sec-5 sc-pt-80 sc-pb-80 media-sec-home"
          aria-label="portal-demo-video"
        >
          <div className="container">
            <div className="common-header">
              <h2
                class="fs-6"
                style={{
                  color: "var(--primary-color)",
                  fontWeight: "500",
                  margin: "0 0 15px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Portal Demo
                <span
                  style={{
                    width: "48px",
                    height: "3px",
                    display: "block",
                    backgroundColor: "var(--primary-color)",
                    marginLeft: "10px",
                  }}
                ></span>
              </h2>
              <h2>See Our Platform in Action</h2>
            </div>
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
                <div className="modal-header">
                  <button
                    onClick={closeModal2}
                    className="btn-close"
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
              <figure className="image-area" style={{ maxHeight: "500px" }}>
                {video?.thumbnail_url.includes("https://") ? (
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

      {/* For-vendors Section-end */}
      <div className="container sc-pb-80 sc-pt-80 ">
        <div className="text-center">
          <p dir="ltr" className="title-text">
            Join Workwise Today
          </p>
          <p dir="ltr" className="common-header">
            <strong>
              Ready to elevate your business? Sign up now and unlock premium
              opportunities and seamless growth with Workwise.
            </strong>
          </p>
        </div>
      </div>
    </>
  );
};

export default ForVendors;
