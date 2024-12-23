import { getPageBanner } from '@/services/cms';
import moment from 'moment';
import Image from 'next/image';
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify';

const BlogComponent = () => {
    const [bannerdata, setBanner] = useState(null);

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


    useEffect(() => {
        // getBanner();
    }, []);


    return (
        <>
            {/* <section
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
            </section> */}

            {/* <section className="breadcrumbs">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="breadcrumbs-con">
                                <a href="/" className="p-bread" >Home</a>
                                {" / "}
                                <a href="/blogs" className="c-bread" >Blogs</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section> */}

            <section className="about-sec-5 pt-4" aria-label="Why Limited Vendor Choices Are Costing Contractors in PSU Projects" >
                <div className="container">
                    <div className="about-sec-5-top">
                        <Image
                            src="/assets/images/blog-1.jpg"
                            alt="Haven’t made a Bid yet ONGC is Inviting Tenders"
                            className="mt-4"
                            layout="responsive"
                            width={2048}
                            height={866}
                        />

                        <div className="common-header mt-4">
                            <h2 className="h2 mb-3"><strong >Why Limited Vendor Choices Are Costing Contractors in PSU Projects<br /></strong></h2>
                            <span className="d-block fw-medium text-sm">{moment(new Date('Mon Dec 23 2024 15:52:14 GMT+0530')).format('MMMM DD, YYYY')}</span>
                            <hr />
                        </div>

                        <div className="row mb-5">
                            <p>Struggling with the stressful bidding process in PSU tenders due to delayed quotes and lack of data? The risk of underestimating costs and facing project losses, or overestimating and getting bid rejections, can be overwhelming. We understand. PSU tenders require accuracy, but outdated procurement practices make it harder. Let’s explore how to turn these challenges into opportunities
                            </p>
                            <p>Public tenders in India by PSUs constitute a significant portion of the nation's economy. Estimates suggest that tenders by these government bodies account for approximately ₹10 to 11 lakh crore annually, which means that there are significant opportunities available to contractors to compete in this segment.
                            </p>
                            <p> But, the competition for public sector tenders is intense, and contractors often face several hurdles. In this blog, we’ll discuss these hurdles in detail, how they affect contractors, and most importantly, practical steps you can take to overcome these challenges and make the most of public tenders.</p>

                            <h3 className="h4 mt-3">What are PSU-approved vendor lists, and why do they exist? </h3>
                            <p>PSU-approved vendor lists are pre-approved vendors or suppliers and manufacturers maintained by Public Sector Undertakings (PSUs). These lists consist of vendors who have met specific criteria set by the PSUs, such as quality standards, technical capabilities, and financial stability. Contractors bidding for tenders must procure materials or services only from these approved vendors to ensure compliance with PSU requirements.</p>

                            <h3 className="h4 mt-3">Why Do These Lists Exist?</h3>
                            <p>
                                Approved vendor lists are a cornerstone of procurement in Public Sector Undertakings (PSUs),
                                designed to bring transparency, structure, and reliability to all the projects under the organization.
                                These lists serve as a quality control mechanism, ensuring that only dependable vendors are entrusted
                                with supplying critical materials or services. Following are the major reasons why these lists of approved
                                vendors exist:
                            </p>
                            <ol className="mt-3 ps-5">
                                <li className="mb-2">
                                    <b>Quality Assurance:</b> The primary reason for these lists is to maintain consistency and ensure that
                                    only reliable vendors supply materials or services. This helps PSUs uphold quality standards in their projects.
                                </li>
                                <li className="mb-2">
                                    <b>Risk Mitigation:</b> By working with pre-approved vendors, PSUs minimize the risk of dealing with unreliable
                                    suppliers who might fail to deliver on time or provide subpar products.
                                </li>
                                <li className="mb-2">
                                    <b>Transparency and Compliance:</b> These lists aim to bring transparency to the procurement process by standardizing
                                    the vendor selection, ensuring fairness, and complying with government regulations.
                                </li>
                                <li className="mb-2">
                                    <b>Simplified Procurement:</b> Approved lists were created to streamline the procurement process by limiting the pool
                                    of suppliers, making it easier for contractors to identify suitable vendors.
                                </li>
                            </ol>
                            <p>
                                While these lists are intended to improve efficiency and reliability, they often create challenges for contractors,
                                such as limited options, outdated vendor information, and delays in securing materials, all of which impact project
                                timelines and profitability.
                            </p>


                            <h3 className="h4 mt-3">Challenges with Limited Vendor Options</h3>
                            <p>Limited vendor options in Public Sector Undertakings (PSUs) can significantly impede project timelines and efficiency. Here are some case studies and examples illustrating these challenges:
                            </p>
                            <ol className="mt-3 ps-5">
                                <li className="mb-4">
                                    <h4 className="h5 mb-3">Vendor Unavailability Leading to Project Delays</h4>
                                    <ul>
                                        <li className="mb-3"><b>Project-75 (India) Submarine Acquisition Project</b></li>
                                        <ul>
                                            <li>
                                                <b>Background:</b> The Indian Navy's Project-75 (I) aimed to acquire advanced submarines equipped with Air-Independent Propulsion (AIP) systems.
                                            </li>
                                            <li>
                                                <b>Challenge:</b>Stringent requirements led to the disqualification or withdrawal of several foreign vendors. For instance, in 2021, Germany's ThyssenKrupp Marine Systems (TKMS) withdrew, citing an inability to meet specific conditions, including liability and technology transfer clauses. This left only one eligible vendor, creating a "single-vendor situation," which is non-competitive and against procurement guidelines.
                                            </li>
                                            <li>
                                                <b>Impact:</b>The project faced significant delays due to the limited pool of qualified vendors, hindering the Navy's modernization efforts.
                                            </li>
                                        </ul>
                                    </ul>
                                </li>
                                <li className="mb-4">
                                    <h4 className="h5 mb-3">Communication Delays Due to Reliance on Few Vendors</h4>
                                    <ul>
                                        <li className="mb-3"><b>Renewable Energy Projects with MSEDCL</b></li>
                                        <ul>
                                            <li>
                                                <b>Background:</b> In 2024, renewable energy projects in collaboration with the Maharashtra State Electricity Distribution Company Limited (MSEDCL) encountered administrative delays.
                                            </li>
                                            <li>
                                                <b>Challenge:</b>Connectivity constraints and the need for substation upgrades required coordination with a limited number of approved vendors. The reliance on these vendors led to communication bottlenecks.
                                            </li>
                                            <li>
                                                <b>Impact:</b>Delays in project execution resulted in financial strain and potential disputes over contract terms.
                                            </li>
                                        </ul>
                                    </ul>
                                </li>
                                <li className="mb-2">
                                    <h4 className="h5 mb-3">Outdated Vendor Lists Affecting Project Efficiency</h4>
                                    <ul>
                                        <li className="mb-3"><b>Solar Module Procurement in India</b></li>
                                        <ul>
                                            <li>
                                                <b>Background:</b> The Ministry of New and Renewable Energy (MNRE) maintained an Approved List of Models and Manufacturers (ALMM) for solar modules.
                                            </li>
                                            <li>
                                                <b>Challenge:</b>Despite concerns over limited competition and potential profiteering, the ministry reimposed the ALMM, restricting procurement to a narrow list of domestic producers. This list was not regularly updated to reflect new entrants or advancements in technology.
                                            </li>
                                            <li>
                                                <b>Impact:</b>Contractors faced higher costs and limited access to advanced technologies, affecting the overall efficiency and cost-effectiveness of solar projects.
                                            </li>
                                        </ul>
                                    </ul>
                                </li>
                            </ol>
                            <p>These examples underscore the need to adopt more flexible and regularly updated procurement practices to enhance project efficiency and reduce delays.
                            </p>

                            <h3 className="h4 mt-3">The Cost Estimation Challenge</h3>
                            <p>Delays in getting vendor quotes often make cost estimation a big challenge for contractors, especially when they have to prepare bids overnight or within a very short time frame. Limited vendor options and the lack of proper contact information add to the difficulty. Without timely and accurate quotes, contractors struggle to find the best market rates, which impacts their ability to maximize profit margins.
                                <br />
                                <span className="d-block mb-3"></span>
                                If the costs are underestimated, it can lead to losses during project execution, while overestimating might result in bid rejection. This makes the entire process of preparing competitive bids even more stressful and risky.
                            </p>

                            <h3 className="h4 mt-3">Public Sector vs. Private Sector Opportunities</h3>
                            <p>Procurement in public and private sectors operates on fundamentally different principles, shaping how contractors approach projects in each domain. In public sector tenders, success largely depends on cost optimization, as the contractor who quotes the L1 (lowest) bid, after getting technically approved, is typically awarded the project. This makes public sector contracts highly cost-driven, leaving little room for flexibility or innovation in materials or methods. On the other hand, private sector tenders prioritize quality over cost, often giving an edge to contractors who can deliver superior workmanship and materials, even at a higher price.
                                <br />
                                <span className="d-block mb-3"></span>
                                While public sector projects are riskier in terms of profitability, given the thin margins and challenges of cost estimation, they also present broader opportunities due to their scale and frequency. Contractors who master efficient cost management in PSUs can unlock significant potential. However, incorporating elements of private-sector procurement practices, such as allowing flexibility in vendor selection or emphasizing quality metrics, could make public sector projects more balanced and rewarding for all stakeholders.
                            </p>

                            <h3 className="h4 mt-3">Why Digitisation Is the Need of the Hour</h3>
                            <p>Outdated procurement practices in the public sector are creating major inefficiencies and slowing down projects. For instance, vendor lists that are not regularly updated often include suppliers who are no longer active or fail to meet current standards. This leaves contractors with limited choices, causing delays in securing materials and driving up project costs. On top of that, poor communication between contractors and vendors makes the process even more complicated, especially when bids need to be prepared quickly.
                                <br />
                                <span className="d-block mb-3"></span>
                                To tackle these issues, modernization is key. Regularly updating vendor lists ensures that contractors have access to reliable, current suppliers. Introducing open vendor ecosystems, with validation mechanisms, can expand the supplier pool while maintaining quality and compliance. Digital platforms would also make vendor interactions smoother by allowing real-time communication, faster quotes, and streamlined documentation. By adopting these solutions, procurement processes in the public sector would become more efficient, transparent, and cost-effective.
                            </p>

                            <h3 className="h4 mt-3 fw-semibold">How Workwise is Bridging the Gap?</h3>
                            <p>Platforms like Workwise offer a modern solution to the challenges contractors face in procurement, especially when dealing with limited vendor options in public sector projects. We’ve compiled a comprehensive list of all the approved vendors for PSUs like IOCL, GAIL, and others, along with their contact information. This allows contractors to easily reach out to functional vendors and get the best rates available in the market.
                                <br />
                                <span className="d-block mb-3"></span>
                                Workwise also simplifies RFQ (Request for Quotation) generation, allowing contractors to quickly create and send out requests to multiple vendors. This streamlines the bidding process and saves time, ensuring that contractors can get accurate quotes fast. Additionally, our project management tools help contractors track progress, manage timelines, and stay on top of procurement activities. By offering easy RFQ generation and robust project management features, Workwise bridges the gap, enhancing procurement efficiency and improving overall project profitability.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>)
}

export default BlogComponent
