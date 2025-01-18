import { parentCategoryList } from '@/services/products';
import { faCirclePlay, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import Slider from 'react-slick';
import { toast } from 'react-toastify';
import TypewriterEffect from './type-writer-effect';
import CallButton from './CallButton';


const vendors = [
    { name: 'Vendor 1', description: 'Trusted partner for quality services.', logo: 'path/to/logo1.png' },
    { name: 'Vendor 2', description: 'Leading provider of innovative solutions.', logo: 'path/to/logo2.png' },
    { name: 'Vendor 3', description: 'Expert in delivering exceptional results.', logo: 'path/to/logo3.png' },
];

const vendorLogos = [
    'path/to/logo1.png',
    'path/to/logo2.png',
    'path/to/logo3.png',
    'path/to/logo4.png',
    'path/to/logo5.png'
];


const TempPage = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [solutionsList, setSolutionsList] = useState(null);

    const handleOpen = () => {
        setIsPlaying(true);
    };

    const handleClose = () => {
        setIsPlaying(false);
    };

    const handleFormModal = () => {

    }

    const logoSettings = {
        dots: false,
        arrows: false,
        infinite: true,
        speed: 500,
        slidesToShow: 5,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 2000,
        responsive: [
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 480,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                },
            },
        ],
    };

    const getParentCategories = async () => {
        try {
            const res = await parentCategoryList();
            setSolutionsList(res.data);
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        getParentCategories();
    }, []);

    return (
        <>
            <CallButton />
            <section className="home-banner" id="home_banner" aria-label="home-banner">
                <div className="home-banner-content">
                    <div className="container" style={{ maxWidth: '1320px' }}>
                        <h1><strong><br />Maximise your profit through our AI-powered procurement solution<br /></strong></h1>
                        <h2></h2>
                        <h2 className="h3 mb-5" style={{ color: 'rgb(236, 240, 241)' }}>Work smart with Workwise.</h2>
                        <TypewriterEffect texts={['Causing Cost Overrun ?', 'Delaying Your Projects ?', 'Eating into your Profits ?']} />
                        <div className="d-flex justify-content-center align-items-center mb-5">
                            <h2 className="h3 mb-0" style={{ color: 'rgb(236, 240, 241)' }}>If Yes, Then Enter</h2>
                            <Link className="btn btn-secondary fw-bold ms-2 border-0" style={{ width: '280px' }} href="#video_media" >Watch Video to Know More</Link>
                        </div>
                    </div>
                </div>
                <div className="home-banner-item">
                    <div className="home-banner-img">
                        <img
                            alt="Workwise"
                            loading="lazy"
                            width="1920"
                            height="820"
                            decoding="async"
                            data-nimg="1"
                            srcSet="/_next/image?url=https%3A%2F%2Fapi.letsworkwise.com%2Fbanner_image%2F1722515545528-100eb1f7-5df2-4b2b-8ab6-5916654bdd67.jpg&amp;w=1920&amp;q=75 1x, /_next/image?url=https%3A%2F%2Fapi.letsworkwise.com%2Fbanner_image%2F1722515545528-100eb1f7-5df2-4b2b-8ab6-5916654bdd67.jpg&amp;w=3840&amp;q=75 2x"
                            src="/_next/image?url=https%3A%2F%2Fapi.letsworkwise.com%2Fbanner_image%2F1722515545528-100eb1f7-5df2-4b2b-8ab6-5916654bdd67.jpg&amp;w=3840&amp;q=75"
                            style={{ color: 'transparent', opacity: '0.9' }}
                        />
                    </div>
                </div>
            </section>

            <section className="container-fluid sc-pt-80 sc-pb-80" id="video_media" aria-label="video-media" style={{ backgroundColor: "#eef3f5" }}>
                <div className="container">
                    <div className="row d-flex align-items-stretch" style={{ height: '100%' }}>
                        <div className="col-md-5 d-flex justify-content-center align-items-center">
                            <div>
                                <h2>For the First time in World!</h2>
                                <p>Experience AI Powered Software and Service Together</p>
                                <p>Discover the latest features of our platform and how they can help you achieve your goals efficiently.</p>
                                <p>Don't miss out! Click the button to watch the full video.</p>
                            </div>
                        </div>
                        <div className="col-md-7">
                            {!isPlaying && (
                                <div className="video-highlight border border-2" onClick={handleOpen} style={{ cursor: 'pointer', position: 'relative' }}>
                                    <video
                                        width="100%"
                                        height="100%"
                                        muted
                                        autoPlay
                                        loop
                                        style={{ objectFit: 'cover' }}
                                    >
                                        <source src="/videos/Motion Graphic_3840x2160.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    <button
                                        type="button"
                                        className="btn btn-secondary border-0 w-75"
                                        onClick={handleOpen}
                                        style={{
                                            position: 'absolute',
                                            bottom: '50px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            zIndex: 1
                                        }}
                                    >
                                        <div className="d-flex justify-content-center align-items-center">
                                            <FontAwesomeIcon icon={faCirclePlay} fontSize={28} className="me-2" />
                                            Click here to view portal full video
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isPlaying && (
                    <div className="d-flex justify-content-center align-items-center" style={{
                        height: '100vh',
                        width: '100vw',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 9999
                    }}>
                        <div className="position-absolute" style={{ width: '75%', height: '75%' }}>
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/-JPa1MX2HVE?autoplay=1"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Video Media"
                            ></iframe>
                        </div>
                        <button
                            onClick={handleClose}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontSize: '2rem',
                                cursor: 'pointer'
                            }}
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                )}
            </section>

            <section className="clients py-5" aria-label="video-media">
                <div className="container">
                    <h2 className="text-center mb-4">Work Done So Far</h2>
                    <div className="row">
                        {vendors.map((vendor, index) => (
                            <div className="col-md-4 mb-4" key={index}>
                                <div className="card text-center">
                                    <img src={vendor.logo} alt={vendor.name} className="card-img-top" style={{ height: '150px', objectFit: 'contain' }} />
                                    <div className="card-body">
                                        <h5 className="card-title">{vendor.name}</h5>
                                        <p className="card-text">{vendor.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>                    
                </div>
            </section>

            <section className="container-fluid py-5" aria-label="video-media" style={{ backgroundColor: "#eef3f5" }}>
                <div className="container text-center">
                    <h2 className="mb-5">Explore 10,000+ Approved Vendors on Our Platform</h2>
                    <h2 className="h3 mb-5">From This Renowed Bodies</h2>
                    <Slider {...logoSettings}>
                        {vendorLogos.map((logo, index) => (
                            <div key={index} className="d-flex justify-content-center">
                                <img src={logo} alt={`Vendor Logo ${index}`} className="mx-3" style={{ height: '50px', objectFit: 'contain' }} />
                            </div>
                        ))}
                    </Slider>
                </div>
            </section>

        </>
    )
}

export default TempPage
