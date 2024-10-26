import React from "react";
import PrivacyPolicyPage from "../../components/privacypolicy/index";
import Head from "next/head";

const PrivacyPolicy = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | Privacy Policy</title>
                <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />

                <meta property="og:title" content="Workwise | Find Approved Vendors, Automate RFQs, Compare Rates" />
                <meta property="og:description" content="A brief description of privacy-policy page's content." />
                <meta property="og:url" content="https://letsworkwise.com/privacypolicy" />
            </Head>
            <PrivacyPolicyPage />
        </>
    );
};

export default PrivacyPolicy;
