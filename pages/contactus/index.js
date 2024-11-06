import React from "react";
import ContactUsPage from '../../components/contactus/index'
import Head from "next/head";

const pageInfo = {
    title:"Workwise | Contact us",
    description:"Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons",
    img:"https://api.letsworkwise.com/banner_image/1722514573447-a067f17b-6eac-4633-b5f2-f199e5edf45c.png"
}

const Contactus = (props) => {
    return (
        <>
            <Head>
                <title>{pageInfo.title}</title>
                <meta name="description" content={pageInfo.description} />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "http://schema.org",
                        "@type": "ContactPage",
                        "name": "Contact Us - Workwise",
                        "description": "Reach out to Workwise for any inquiries or support needed. Our team is ready to help you!",
                        "url": `${process.env.NEXT_PUBLIC_FRONTEND_URL}/contact`,
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "contactType": "Customer Support",
                            "email": "support@letsworkwise.com",
                            "telephone": "9930787798",
                            "hoursAvailable": {
                                "@type": "OpeningHoursSpecification",
                                "name": "Available 24/7",
                                "dayOfWeek": [
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday",
                                    "Sunday"
                                ]
                            }
                        }
                    })}
                </script>

                <meta property="og:title" content={pageInfo.title} />
                <meta property="og:description" content={pageInfo.description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/contactus`} />
                <meta property="og:image" content={pageInfo.img} />
                <meta property="og:site_name" content="Workwise" />
            </Head>
            <ContactUsPage />
        </>
    )
}

export default Contactus;