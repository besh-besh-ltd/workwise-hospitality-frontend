import React from "react";
import PrivacyPolicyPage from "../../components/privacypolicy/index";
import Head from "next/head";

const PrivacyPolicy = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | Privacy Policy</title>
                <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />
            </Head>
            <PrivacyPolicyPage />
        </>
    );
};

export default PrivacyPolicy;
