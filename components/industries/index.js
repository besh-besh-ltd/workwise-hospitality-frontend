import React, { useState } from 'react';
import Link from 'next/link';
import Slider from "react-slick";
import Image from "next/image";
import Modal from 'react-modal';
import { useEffect } from "react";

const IndustriesPage = () => {
    const breadcrumbPaths = [
        { title: 'Home', url: '/' },
        { title: 'Industries', url: '/industries' },
      ];

      const [modal1IsOpen, setModal1IsOpen] = useState(false);
    
      const openModal1 = () => {
        setModal1IsOpen(true);
      };
    
      const closeModal1 = () => {
        setModal1IsOpen(false);
      };
    

        // Use useEffect to handle the body overflow property for both modals
        useEffect(() => {
          const handleBodyOverflow = () => {
            document.body.style.overflow = modal1IsOpen ? 'hidden' : 'auto';
          };
      
          handleBodyOverflow(); // Set initial state
      
          // Cleanup function to restore body overflow when the component unmounts
          return () => {
            document.body.style.overflow = 'auto';
          };
        }, [modal1IsOpen]);



      var partnersSlider = {
        infinite: false,
        speed: 500,
        slidesToShow: 5,
        slidesToScroll: 1,
        arrows: false,
        responsive: [
          {
            breakpoint: 991,
            settings: {
              slidesToShow: 4,
              slidesToScroll: 1,
              dots: false,
              arrows: false,
            }
          },
          {
            breakpoint: 767,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1,
              dots: true,
              arrows: false,
            }
          }
        ]
      };

      var customerslider = {
        infinite: false,
        speed: 500,
        slidesToShow: 1,
        autoplay: false,
        dots: false,
        arrows: true,
      };
      return(
        <>
        
            <section className="indus-sec-1 sc-pt-80">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="indus-sec-1-con">
                                <h1>Industries</h1>
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
                            <a href="#" className="p-bread" title="">Home</a> / <a href="#" className="c-bread" title="">Contact Us</a>  
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="indus-sec-2 sc-pt-80 sc-pb-80">
            <div className="container">
                <div className="row">
                <div className="col-md-6">
                    <div className="indus-sec-2-con">
                    <div className="common-header">
                        <h6>Lorem Ipsum</h6>
                        <h2>Lorem Ipsum is simply <br/>dummy text of the printing.</h2>
                    </div>
                    
                    <p>Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit, nunc est sodales erat, in aliquet eros elit a erat. Mauris suscipit porttitor interdum. Quisque ut rutrum sem, eget lacinia nisi.</p>
                    <ul className="general-list">
                            <li>Quisque quis laoreet tortor dolor set.</li>
                            <li>Nunc nec convallis lacus. Duis non porttitor.</li>
                            <li>Quisque ut rutrum sem, eget lacinia nisi.</li>
                            <li>Mauris suscipit porttitor interdum.</li>
                            <li>Nullam posuere, dui non feugiat suscipit</li>
                        </ul>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="indus-sec-2-img">
                        <Image src="/assets/images/indus-sec-2.png" alt="Workwise" width={540} height={552} priority={true} />
                    </div>
                </div>
                </div>
            </div>
            </section>

            <section className="indus-sec-3 sc-pt-80">
                <div className="container">
                    <div className="indus-sec-3-top">
                        <div className="common-header text-center">
                            <h6>Our Partners</h6>
                            <h2>Lorem Ipsum place holder</h2>
                        </div>
                    </div>
    
                    <div className="indus-sec-partners">
                    <Slider {...partnersSlider}>
                        <div className="partners-slider-area">
                        <Link href="#">
                            <figure> <Image src="/assets/images/partners/lo1.png" alt="Workwise" width={206} height={151} priority={true} /></figure>
                            
                        </Link>
                        </div>
                        <div className="partners-slider-area">
                        <Link href="#">
                            <figure> <Image src="/assets/images/partners/lo2.png" alt="Workwise" width={206} height={151} priority={true} /></figure>
                            
                        </Link>
                        </div>
                        <div className="partners-slider-area">
                        <Link href="#">
                            <figure> <Image src="/assets/images/partners/lo3.png" alt="Workwise" width={206} height={151} priority={true} /></figure>
                            
                        </Link>
                        </div>
                        <div className="partners-slider-area">
                        <Link href="#">
                            <figure> <Image src="/assets/images/partners/lo4.png" alt="Workwise" width={206} height={151} priority={true} /></figure>

                        </Link>
                        </div>
                        <div className="partners-slider-area">
                        <Link href="#">
                            <figure> <Image src="/assets/images/partners/lo5.png" alt="Workwise" width={206} height={151} priority={true} /></figure>

                        </Link>
                        </div>
                    </Slider>
                    </div>
                </div>
            </section>
            
            <section className="indus-sec-4 sc-pt-80 sc-pb-80">
                <div className="container">
                    <div className="indus-sec-4-con">
                        <div className="row">
                            <div className="col-md-6">
                                <div className="indus-overview-r">
                                    <Image src="/assets/images/indus-sec-2.png" alt="Workwise" width={540} height={552} priority={true} />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="common-header common-white-header">
                                    <h6>Process Overview</h6>
                                    <h2>Curabitur lacinia urna ac urna pellentesque</h2>
                                </div>
                                <div className="indus-overview-l">
                                <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard. Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit, nunc est sodales erat, in aliquet eros elit a erat. Mauris suscipit porttitor interdum. Quisque ut rutrum sem, eget lacinia nisi. Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit. Nullam posuere, dui non feugiat suscipit, nunc est sodales erat, in aliquet eros elit a erat. Mauris suscipit porttitor interdum. Quisque ut rutrum sem, eget lacinia nisi. Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="indus-sec-5 sc-pt-80 sc-pb-80">
                <div className="container">
                    <div className="indus-sec-5-top">
                        <div className="common-header text-center">
                            <h2>Lorem Ipsum is simply dummy text of the <br />printing and typesetting industry. <br />Lorem Ipsum has been the industry.</h2>
                            
                        </div>
                    </div>
    
                    <div className="indus-sec-5-con">
                    <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently.</p>
                    </div>
                </div>
            </section>

            <section className="indus-sec-6 sc-pt-80 sc-pb-80">
            <div className="container">
                <div className="row">
                <div className="col-md-6">
                    <div className="indus-sec-6-con">
                    <div className="common-header">
                        <h6>Lorem Ipsum</h6>
                        <h2>Lorem Ipsum is simply <br/>dummy text of the printing.</h2>
                    </div>
                    
                    <p>Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit, nunc est sodales erat, in aliquet eros elit a erat. Mauris suscipit porttitor interdum. Quisque ut rutrum sem, eget lacinia nisi.</p>
                    <ul className="general-list">
                            <li>Quisque quis laoreet tortor dolor set.</li>
                            <li>Nunc nec convallis lacus. Duis non porttitor.</li>
                            <li>Quisque ut rutrum sem, eget lacinia nisi.</li>
                            <li>Mauris suscipit porttitor interdum.</li>
                            <li>Nullam posuere, dui non feugiat suscipit</li>
                        </ul>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="indus-sec-6-img">
                        <Image src="/assets/images/indus-sec-2.png" alt="Workwise" width={540} height={552} priority={true} />
                    </div>
                </div>
                </div>
            </div>
            </section>

            <section className="indus-sec-7 sc-pt-80 sc-pb-80">
                <div className="container">
                    <div className="indus-sec-7-btm">
                    <Slider {...customerslider}>
                        <div className="customer-slide">
                        <div className="customer-panel">
                            <div className="customer-img">
                            <div className="customer-vdo">
                                <p>Watch <br />
                                Video Story</p>
                                <button
                                onClick={() => openModal1('https://www.youtube.com/embed/x4U9-T202uA')}
                                className="video-play-button">
                                <Image src="/assets/images/vdo-play.svg" alt="Play" width={99} height={99} priority={true} />
                                </button>
                                <Modal
                                isOpen={modal1IsOpen}
                                onRequestClose={closeModal1}
                                contentLabel="Video Modal"
                                style={{
                                    overlay: {
                                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                    },
                                    content: {
                                    position: 'relative',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    maxWidth: '800px', // Adjust this value as needed
                                    width: 'auto', // Set to 'auto' or a specific value based on your design
                                    maxHeight: '120vh', // Adjust this value as needed
                                    border: 'none',
                                    background: 'transparent',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding:'30px'
                                    },
                                }}
                                >
                                <div class="modal-header">
                                    <button onClick={closeModal1} class="btn-close" aria-label="Close"></button>
                                </div>
                                
                                <div className="modal-body">
                                    <div className="video-container">
                                    <iframe
                                    src="https://www.youtube.com/embed/x4U9-T202uA"
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    width="100%" height="450"
                                    ></iframe>
                                    </div>
                                </div>
                                
                                </Modal>
                            </div>
                            <figure><Image src="/assets/images/customer.jpg" alt="Workwise" width={540} height={528} priority={true} /></figure>
                            </div>
                            <div className="customer-con">
                            <div className="common-header">
                                <h6>What Customers Say About Us</h6>
                                <h2>Donec semper, est ac dolor set imperdiet ultrices.</h2>
                            </div>
                            <div className="customer-text">
                                <p>Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit, tium augue auctor id. Nullam posuere, dui non feugiat nunc est sodales erat, in aliquet eros elit a erat. Mauris suscipit porttitor interdum. Quisque ut rutrum sem, eget lacinia nisi. Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit.</p>
                            </div>
                            <div className="client-arewa">
                                <div className="client-img">
                                <Image src="/assets/images/client.jpg" alt="Workwise" width={72} height={72} priority={true} />
                                </div>
                                <div className="client-con">
                                <p>Aida Bugg <span>Dat pretium augue</span></p>
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                        <div className="customer-slide">
                        <div className="customer-panel">
                            <div className="customer-img">
                            <div className="customer-vdo">
                                <p>Watch <br />
                                Video Story</p>
                                <Link href="#"><Image src="/assets/images/vdo-play.svg" alt="Workwise" width={99} height={99} priority={true} /></Link>
                            </div>
                            <figure><Image src="/assets/images/customer.jpg" alt="Workwise" width={540} height={528} priority={true} /></figure>
                            </div>
                            <div className="customer-con">
                            <div className="common-header">
                                <h6>What Customers Say About Us</h6>
                                <h2>Donec semper, est ac dolor set imperdiet ultrices.</h2>
                            </div>
                            <div className="customer-text">
                                <p>Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit, nunc est sodales erat, in aliquet eros elit a erat. Mauris suscipit porttitor interdum. Quisque ut rutrum sem, eget lacinia nisi. Fusce auctor dui mauris, at pretium augue auctor id. Nullam posuere, dui non feugiat suscipit.</p>
                            </div>
                            <div className="client-arewa">
                                <div className="client-img">
                                <Image src="/assets/images/client.jpg" alt="Workwise" width={72} height={72} priority={true} />
                                </div>
                                <div className="client-con">
                                <p>Aida Bugg <span>Dat pretium augue</span></p>
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                    </Slider>
                    </div>
                </div>
            </section>



        </>
      )
};

export default IndustriesPage;
