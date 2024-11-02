import React from "react";
import AboutusPage from "../../components/aboutus/index";
import Head from "next/head";

const pageInfo = {
    title:"Workwise | About us",
    description:"Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons",
    img: "https://api.letsworkwise.com/banner_image/1722514602793-9572cf56-4f0b-498b-8154-b1eabcc126c3.png"
}

const Aboutus = (props) => {
    return (
        <>
            <Head>
                <title>{pageInfo.title}</title>
                <meta name="description" content={pageInfo.description} />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "http://schema.org",
                        "@type": "AboutPage",
                        "name": "About Us - Workwise",
                        "description": "Learn more about Workwise and how we're changing the procurement landscape with our innovative solutions.",
                        "url": `${process.env.NEXT_PUBLIC_FRONTEND_URL}/aboutus`
                    })}
                </script>

                <meta property="og:title" content={pageInfo.title} />
                <meta property="og:description" content={pageInfo.description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/aboutus`} />
                <meta property="og:image" content={pageInfo.img} />
                <meta property="og:site_name" content="Workwise" />
            </Head>
            <AboutusPage />
        </>
    );
};

export default Aboutus;
