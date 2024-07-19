import React from "react";
import SendQuotePageComp from "@/components/dashboard/vendor/send-quote";
import Head from "next/head";
const SendQuote = () => {
    return (
        <>
            <Head>
                <title>Workwise | Send Quotation</title>
            </Head>
            <SendQuotePageComp />
        </>
    )
}

export default SendQuote;