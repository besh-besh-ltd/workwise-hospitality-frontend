import React from "react";
import IndustriesPage from '../../components/industries/index'
import Head from "next/head";

const Industries = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | Industries</title>
            </Head>
            <IndustriesPage />
        </>
    )
}

export default Industries;