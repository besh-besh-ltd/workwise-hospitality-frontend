import React from "react";
import AboutusPage from "../../components/aboutus/index";
import Head from "next/head";

const Aboutus = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | About us</title>
                <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />

                <meta property="og:title" content="Workwise | Find Approved Vendors, Automate RFQs, Compare Rates" />
                <meta property="og:description" content="A brief description of about-us page's content." />
                <meta property="og:url" content="https://letsworkwise.com/aboutus" />
            </Head>
            <AboutusPage />
        </>
    );
};

export default Aboutus;
