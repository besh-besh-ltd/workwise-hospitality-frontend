import React, { useEffect, useState } from "react";
import { getAboutProfiles, getCmsData, getPageBanner, getTeamMembers } from "@/services/cms";
import { HomeLists1Service } from "@/services/Home";
import DynamicSection from "../dynamicSection/dynamicSection";
import { toast } from "react-toastify";
import Slider from "react-slick";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";


const Aboutus = (props) => {
  const [cmsdata, setCmsdata] = useState([]);
  const [bannerdata, setBanner] = useState(null);
  const [showHomeLists1, setHomeLists1] = useState([]);
  const [teamList, setTeamList] = useState(null);

  const [bod, setbod] = useState([]);
  const [kp, setkp] = useState([]);

  useEffect(() => {
    getBanner();
    getCmsSections();
    getTeamData();
    // getHomeLists1();
    getBod();
    getKp();
  }, []);

  const getCmsSections = () => {
    getCmsData(2)
      .then((response) => {
        if (response.data.length > 0) {
          setCmsdata(response.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

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

  const getBanner = () => {
    getPageBanner(2)
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

  const getTeamData = async ()=> {
    try {
      const res = await getTeamMembers();
      setTeamList(res.data);
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Set State Change
  const handleChange = (setState) => (event) => {
    setState(event);
  };

  const getBod = () => {
    getAboutProfiles(1).then((response) => {
      setbod(response.data);
    });
  };
  const getKp = () => {
    getAboutProfiles(2).then((response) => {
      setkp(response.data);
    });
  };

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4, // Default for extra-large screens
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1200, // Tablets (up to 1200px)
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 576, // Mobile (up to 576px)
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
    ],
  };


  return (
    <>
      <section
        aria-label="about-us"
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
      </section>

      <section className="breadcrumbs">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="breadcrumbs-con">
                <a href="/" className="p-bread" >Home</a>
                {" / "}
                <a href="/aboutus" className="c-bread" >About Us</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------- About Us - Our Mission --------- */}
      {cmsdata &&
        cmsdata.map((item) => {
          return <DynamicSection content={item.content} key={item.id} />;
        })}

      {/* --------- Who We Are ----------- */}
      {showHomeLists1.map((item) => {
        if (item.id === 4) {
          return <DynamicSection content={item.content} key={item.id} />;
        }
      })}

      {/* ---------- Meet the Team ---------- */}
      {/* {teamList &&
        <section className="about-sec-5 sc-pt-80" aria-label="Meet our team" >
          <div className="container">
            <div className="about-sec-5-top">
              <div className="common-header text-center">

                <h2><strong >Meet Our Team<br /></strong></h2>

                <div className="member-container mt-5" >
                  <Slider {...sliderSettings}>
                    {teamList.map((member, index) => (
                      <div key={`team_member_${index}`} className="card-wrapper p-3">
                        <div className="team-card rounded-4 p-3" style={{ backgroundColor: "#eaedf1" }} >
                          <div
                            className="image-container mb-4"
                            style={{
                              overflow: "hidden",
                              width: "100%",
                              maxHeight: "220px",
                              margin: "0 auto",
                              position: "relative",
                            }}
                          >
                            <img
                              src={member.profile_image}
                              alt={member.name}
                              style={{ width: "250px", height: "250px", objectFit: "cover" }}
                            />
                          </div>
                          <h2 className="fs-5" style={{ margin: "10px 0 5px" }}>{member.name}</h2>
                          <p style={{ fontSize: "14px" }}>{member.role}</p>
                          <Link
                            href={member.linkedin || "#"}
                            target="_blank"
                          >
                            <FontAwesomeIcon icon={faLinkedin} className="me-2" />
                            LinkedIn Profile
                          </Link>
                        </div>
                      </div>
                    ))}
                  </Slider>
                </div>

              </div>
            </div>

          </div>
        </section>
      } */}

      {/* {bod && <PersonalProfiles profiles={bod}/>}
      		{kp &&<PersonalProfiles pb={80} title="Other key Personnel" subtitle="International Subsidiaries" profiles={kp}/>} */}

      <div className="title-text container text-center sc-pb-80 ">
        <p>Join us in shaping the future of the heavy industry. Together, let's build a more efficient, connected, and prosperous ecosystem</p>
      </div>
    </>
  );
};

export default Aboutus;
