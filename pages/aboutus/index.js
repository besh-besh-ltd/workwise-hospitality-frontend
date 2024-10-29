import React from "react";
import AboutusPage from "../../components/aboutus/index";
import Head from "next/head";

const Aboutus = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | About us</title>
                <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "http://schema.org",
                        "@type": "AboutPage",
                        "name": "About Us - Workwise",
                        "description": "Learn more about Workwise and how we're changing the procurement landscape with our innovative solutions.",
                        "url": `${process.env.NEXT_PUBLIC_FRONTEND_URL}/aboutus`
                    })}
                </script>
            </Head>
            <AboutusPage />
        </>
    );
};

export default Aboutus;
