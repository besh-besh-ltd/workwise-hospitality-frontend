import React from "react";
import TermsOfUsePage from "../../components/terms-of-use/index";
import Head from "next/head";

const TermsOfUse = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | Terms of Use</title>
                <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />

                <meta property="og:title" content="Workwise | Find Approved Vendors, Automate RFQs, Compare Rates" />
                <meta property="og:description" content="A brief description of terms-of-use page's content." />
                <meta property="og:url" content="https://letsworkwise.com/terms-of-use" />
            </Head>
            <TermsOfUsePage />
        </>
    );
};

export default TermsOfUse;
