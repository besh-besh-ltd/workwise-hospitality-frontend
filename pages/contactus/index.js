import React from "react";
import ContactUsPage from '../../components/contactus/index'
import Head from "next/head";

const Contactus = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | Contact Us</title>
            </Head>
            <ContactUsPage />
        </>
    )
}

export default Contactus;