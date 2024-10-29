import React from "react";
import ContactUsPage from '../../components/contactus/index'
import Head from "next/head";

const Contactus = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | Contact Us</title>
                <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />

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
            </Head>
            <ContactUsPage />
        </>
    )
}

export default Contactus;