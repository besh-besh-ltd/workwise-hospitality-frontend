import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    faArrowsLeftRight,
    faBusinessTime,
    faCartShopping,
    faChartColumn,
    faChartLine,
    faClipboardList,
    faCodeMerge,
    faCoins,
    faGears,
    faPaperPlane,
    faPiggyBank,
    faQuoteLeft,
    faSearch,
    faSitemap,
    faStar,
    faWandMagicSparkles
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Nav, Tab } from 'react-bootstrap'
import Slider from "react-slick"
import { toast } from 'react-toastify'
import { parentCategoryList, productListByCategory } from '@/services/products'
import PlaceholderLoading from 'react-placeholder-loading'
import { useRouter } from 'next/router'


const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: false,
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


const SolutionsCategory = ({ pageTitle }) => {
    const router = useRouter();
    const [navTabs, setNavTabs] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [products, setProducts] = useState(null);
    const [productsLoading, setProductsLoading] = useState(false);

    const getParentCategories = async () => {
        try {
            const res = await parentCategoryList();
            setNavTabs(res.data);
            setActiveTab(res.data[0]);
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getProductsbyCategory = async () => {
        if (activeTab?.slug) {
            router.push(`/solutions/${activeTab.slug}`, undefined, { shallow: true });
        }
        setProductsLoading(true);
        try {
            const res = await productListByCategory(activeTab.id);
            setProducts(res.data);
        } catch (error) {
            toast.error(error.message)
        } finally {
            setProductsLoading(false);
        }
    }

    useEffect(() => {
        if (!navTabs) {
            getParentCategories();
        }
    }, [])

    useEffect(() => {
        if (activeTab) {
            getProductsbyCategory();
        }
    }, [activeTab])


    return (
        <>
            <section className="solution-header mt-5 sc-pt-80 sc-pb-80" aria-label="solution-header" style={{ backgroundColor: '#eef3f5' }}>
                <div className="container">
                    <div className="row">
                        <div className="col-md-5 mb-3">
                            <div className="d-flex h-100 justify-content-start align-items-center">
                                <div className="w-100">
                                    <h1 className="h2 fw-medium mb-3">{pageTitle} Projects</h1>
                                    <p className="mb-3">We connect you with experienced vendors renowned for their expertise in a wide range of {pageTitle} projects</p>
                                    <Link
                                        href="/vendor/all"
                                        className="btn btn-secondary border-0 fw-semibold"
                                        style={{ width: "250px" }}
                                    >
                                        Find Vendors by Products
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-7 mb-3">
                            <div className="d-flex justify-content-end">
                                <Image
                                    src="/assets/images/blog-1.jpg"
                                    alt="solutions-header"
                                    layout="responsive"
                                    responsive={true}
                                    width={1200}
                                    height={300}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="solution-section-1 py-5" aria-label="how-it-works" >
                <div className="container text-center">
                    <h2 className="h3 mb-5">How It Works</h2>

                    <div className="row">
                        <div className="col-sm-6 col-md-4 col-lg-3">
                            <div
                                className="rounded-circle mx-auto mb-4 d-flex justify-content-center align-items-center"
                                style={{
                                    width: '140px',
                                    height: '140px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--secondary-color)',
                                }}
                            >
                                <FontAwesomeIcon icon={faSearch} fontSize={36} color={'var(--primary-color)'} />
                            </div>
                            <h3 className="h4 mb-2 text-uppercase">Explore</h3>
                            <p className="mx-3">Access a database of over 10,000 vendors</p>
                        </div>

                        <div className="col-sm-6 col-md-4 col-lg-3">
                            <div
                                className="rounded-circle mx-auto mb-4 d-flex justify-content-center align-items-center"
                                style={{
                                    width: '140px',
                                    height: '140px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--secondary-color)',
                                }}
                            >
                                <FontAwesomeIcon icon={faClipboardList} fontSize={36} color={'var(--primary-color)'} />
                            </div>
                            <h3 className="h4 mb-2 text-uppercase">Shortlist</h3>
                            <p className="mx-3">Select approved vendors trusted by industry leaders</p>
                        </div>

                        <div className="col-sm-6 col-md-4 col-lg-3">
                            <div
                                className="rounded-circle mx-auto mb-4 d-flex justify-content-center align-items-center"
                                style={{
                                    width: '140px',
                                    height: '140px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--secondary-color)',
                                }}
                            >
                                <FontAwesomeIcon icon={faPaperPlane} fontSize={36} color={'var(--primary-color)'} />
                            </div>
                            <h3 className="h4 mb-2 text-uppercase">Send</h3>
                            <p className="mx-3">Make a request with just one click</p>
                        </div>

                        <div className="col-sm-6 col-md-4 col-lg-3">
                            <div
                                className="rounded-circle mx-auto mb-4 d-flex justify-content-center align-items-center"
                                style={{
                                    width: '140px',
                                    height: '140px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--secondary-color)',
                                }}
                            >
                                <FontAwesomeIcon icon={faWandMagicSparkles} fontSize={36} color={'var(--primary-color)'} />
                            </div>
                            <h3 className="h4 mb-2 text-uppercase">Get</h3>
                            <p className="mx-3">Receive an AI-generated rate comparison chart</p>
                        </div>
                    </div>

                </div>
            </section>

            <section className="solution-section-2 py-5" aria-label="project-categories" style={{ backgroundColor: '#eef3f5' }} >
                <div className="container">
                    <h2 className="h3 text-center mb-5">Explore project Vendors across 50+ service categories</h2>

                    {navTabs?.length > 0 && (
                        <Tab.Container activeKey={activeTab.title}>
                            <Nav variant="tabs">
                                {navTabs.map((navItem, index) => (
                                    <Nav.Item key={`nav_item_${index}`}>
                                        <Nav.Link
                                            eventKey={navItem.title}
                                            onClick={() => setActiveTab(navItem)}
                                        >
                                            {navItem.title}
                                        </Nav.Link>
                                    </Nav.Item>
                                ))}
                            </Nav>

                            <Tab.Content>
                                <Tab.Pane eventKey={activeTab.title}>
                                    <div className="row bg-white rounded-4 p-2 p-md-3 p-lg-5">
                                        {productsLoading ? (
                                            Array.from({ length: 15 }).map((_, index) => (
                                                <div className="col-md-6 col-lg-4 p-2 mb-1 mb-lg-2" key={`placeholder_${index}`}>
                                                    <PlaceholderLoading
                                                        shape="rect"
                                                        width="100%"
                                                        height={50}
                                                    />
                                                </div>
                                            ))
                                        ) : products?.length > 0 ? (
                                            products.map((prodItem) => (
                                                <div className="col-md-6 col-lg-4 p-2 mb-1 mb-lg-2" key={`product_${prodItem.product_id}`}>
                                                    <Link
                                                        href={`/vendor/${prodItem.slug}`}
                                                    >
                                                        <div
                                                            className="rounded-2 p-2 mb-0"
                                                            style={{
                                                                borderStyle: 'solid',
                                                                borderWidth: '2px',
                                                                borderColor: 'var(--secondary-color)',
                                                                color: 'var(--primary-color)',
                                                            }}
                                                        >
                                                            <p className="mb-1">{prodItem.product_name}</p>
                                                            <span className="d-block fw-medium text-dark" style={{ fontSize: '13px' }}>
                                                                {prodItem.product_categories.map((catItem) => (catItem.category_name)).join(" | ")}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="d-flex flex-column justify-content-center align-items-center">
                                                <FontAwesomeIcon icon={faCartShopping} fontSize={40} className="opacity-25 mb-4" />
                                                <h3 className="fs-6 text-center">No Products Available</h3>
                                            </div>
                                        )}
                                    </div>
                                </Tab.Pane>
                            </Tab.Content>

                        </Tab.Container>
                    )}
                </div>
            </section>

            <section className="solution-section-3 py-5" aria-label="how-workwise-helps" >
                <div className="container">
                    <h2 className="h3 mb-5 text-center">How Workwise Helps ?</h2>

                    <div className="table-responsive">
                        <table className="table table-borderless">
                            <colgroup>
                                <col className="col-12 col-md-4" />
                                <col className="col-12 col-md-4" />
                                <col className="col-12 col-md-4" />
                            </colgroup>
                            <tbody>
                                <tr>
                                    <td><h3 className="h4 text-uppercase">Problem</h3></td>
                                    <td></td>
                                    <td><h3 className="h4 text-uppercase">Solution</h3></td>
                                </tr>

                                <tr>
                                    <td>
                                        <p className="fw-semibold text-nowrap mb-2">Rising Procurement Costs:</p>
                                        <p>Manual negotiations and limited price visibility often lead to overspending.</p>
                                    </td>
                                    <td>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div
                                                className="rounded-circle mx-auto d-flex justify-content-center align-items-center"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--secondary-color)',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faCoins} fontSize={36} color={'var(--primary-color)'} />
                                            </div>

                                            <FontAwesomeIcon icon={faArrowsLeftRight} fontSize={40} />

                                            <div
                                                className="rounded-circle mx-auto d-flex justify-content-center align-items-center"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--secondary-color)',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faPiggyBank} fontSize={36} color={'var(--primary-color)'} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <p className="fw-semibold text-nowrap mb-2">Cost Savings with Snap Bidding:</p>
                                        <p>Reverse bidding and target pricing ensure competitive rates, lowering procurement costs by about 5%.</p>
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        <p className="fw-semibold text-nowrap mb-2">Delays in Project Timelines:</p>
                                        <p>Slow RFQ processes, follow-ups, and vendor delays push back procurement schedules, causing project overruns.</p>
                                    </td>
                                    <td>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div
                                                className="rounded-circle mx-auto d-flex justify-content-center align-items-center"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--secondary-color)',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faBusinessTime} fontSize={36} color={'var(--primary-color)'} />
                                            </div>

                                            <FontAwesomeIcon icon={faArrowsLeftRight} fontSize={40} />

                                            <div
                                                className="rounded-circle mx-auto d-flex justify-content-center align-items-center"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--secondary-color)',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faGears} fontSize={36} color={'var(--primary-color)'} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <p className="fw-semibold text-nowrap mb-2">Faster Project Execution:</p>
                                        <p>Automation of RFQs, follow-ups, technical checks, and comparisons streamlines processes and minimizes delays.</p>
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        <p className="fw-semibold text-nowrap mb-2">Evaluating Vendor Performance:</p>
                                        <p>Lack of insight into vendor performance can lead to lower quality work and potential delays.</p>
                                    </td>
                                    <td>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div
                                                className="rounded-circle mx-auto d-flex justify-content-center align-items-center"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--secondary-color)',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faChartColumn} fontSize={36} color={'var(--primary-color)'} />
                                            </div>

                                            <FontAwesomeIcon icon={faArrowsLeftRight} fontSize={40} />

                                            <div
                                                className="rounded-circle mx-auto d-flex justify-content-center align-items-center"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--secondary-color)',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faChartLine} fontSize={36} color={'var(--primary-color)'} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <p className="fw-semibold text-nowrap mb-2">Improved Vendor Quality:</p>
                                        <p>Vendor performance data helps select reliable vendors, boosting project quality and reducing rework.</p>
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        <p className="fw-semibold text-nowrap mb-2">Challenges with ERP Integration:</p>
                                        <p>Difficulty transferring procurement data to ERP systems leads to inefficiencies.</p>
                                    </td>
                                    <td>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div
                                                className="rounded-circle mx-auto d-flex justify-content-center align-items-center"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--secondary-color)',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faCodeMerge} fontSize={36} color={'var(--primary-color)'} />
                                            </div>

                                            <FontAwesomeIcon icon={faArrowsLeftRight} fontSize={40} />

                                            <div
                                                className="rounded-circle mx-auto d-flex justify-content-center align-items-center"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--secondary-color)',
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faSitemap} fontSize={36} color={'var(--primary-color)'} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <p className="fw-semibold text-nowrap mb-2">Smooth ERP Integration:</p>
                                        <p>Easy integration with IOCL’s ERP system ensures seamless workflows and faster PO generation.</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </section>

            <section className="solution-section-4 py-5" aria-label="hear-from-our-customers" style={{ backgroundColor: '#eef3f5' }} >
                <div className="container">
                    <h2 className="h3 text-center mb-5">Hear from Our Customers</h2>

                    <div className="row">
                        <div className="col-sm-6 p-2 p-lg-0 mb-3">
                            <div className="text-center">
                                <Image
                                    src="/assets/images/trusted-customer.jpg"
                                    alt="trusted-customer"
                                    layout="intrinsic"
                                    width={300}
                                    height={400}
                                // style={{ width: '300px', height: '350px', maxWidth: '100%' }}
                                />
                            </div>
                        </div>
                        <div className="col-sm-6 p-2 p-lg-0 mb-3">
                            <div className="d-flex h-100 justify-content-start align-items-center">
                                <div className="w-100">
                                    <FontAwesomeIcon icon={faQuoteLeft} fontSize={24} />
                                    <div className="d-flex gap-2 my-2">
                                        <FontAwesomeIcon icon={faStar} fontSize={16} className="text-warning" />
                                        <FontAwesomeIcon icon={faStar} fontSize={16} className="text-warning" />
                                        <FontAwesomeIcon icon={faStar} fontSize={16} className="text-warning" />
                                        <FontAwesomeIcon icon={faStar} fontSize={16} className="text-warning" />
                                        <FontAwesomeIcon icon={faStar} fontSize={16} className="text-warning" />
                                    </div>
                                    <p className="mb-4">Workwise has completely transformed our procurement process. Their platform made it effortless to
                                        connect with reliable vendors and compare rates, all while keeping
                                        everything organized in one place. The automated rate comparisons and Excel downloads
                                        have saved us countless hours, and the comprehensive dashboard gives us real-time insights
                                        into every stage of the process. </p>
                                    <p className="fw-semibold mb-1">AR Shekhar</p>
                                    <p className="text-sm fw-medium">CEO Vendor</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* <section className="solution-section-5 py-5" aria-label="listed-companies" >
                <div className="container">
                    <h2 className="h3 text-center mb-5">10,000+ Approved Vendors</h2>

                    <div className="company-logo-container mt-5" >
                        <Slider {...sliderSettings}>
                            {companyLogos?.length > 0
                                ? <div className="row">
                                {companyLogos.map((company)=> (
                                    <div key={`company_${company.id}`} className="col-md-2">

                                    </div>
                                ))}
                                </div>
                                : null}
                        </Slider>
                    </div>
                </div>
            </section> */}

            <section className="solution-section-6 py-5" aria-label="stakeholders" >
                <div className="container">
                    <h2 className="h3 text-center mb-5">Why Choose Workwise</h2>
                    <p className="mb-0">We blend over 40+ years of industry experience with the fresh ideas of talented graduates from IIT and VIT. This unique combination allows us to create MAGIC in vendor and procurement management. Whether you're a buyer looking for reliable vendors or a vendor wanting to grow your business, Workwise is here to help. We simplify the process and support you every step of the way, making us your trusted growth partner.</p>
                </div>
            </section>

            <section className="solution-section-7 py-5" aria-label="solutions-conclusion" style={{ backgroundColor: '#eef3f5' }} >
                <div className="container text-center">
                    <div className="col-sm-12 col-md-8 mx-auto rounded-4 p-3 p-lg-5 mb-5" style={{ borderStyle: 'solid', borderColor: 'var(--secondary-color)', borderWidth: "2px" }}>
                        <p className="fw-medium mb-4">Find the right vendors. Get the best rates. Streamline your process. </p>
                        <h2 className="h3 mb-4">All in one place</h2>
                        <Link
                            href="/vandor/all"
                            target="_blank"
                            className="btn btn-primary border-0 fw-semibold"
                            style={{ width: "250px" }}
                        >
                            Get Started Now
                        </Link>
                    </div>

                    <p className="fw-semibold text-primary my-5">
                        Proudly Made in India ❤️
                        <br />
                        <span className="d-block mb-2"></span>
                        Let’s grow together with Workwise
                    </p>
                </div>
            </section>
        </>
    )
}

export default React.memo(SolutionsCategory)
