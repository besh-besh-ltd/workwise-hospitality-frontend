import React from "react";
import ForVendorsPage from "@/components/forVendors";
import Head from "next/head";

const pageInfo = {
    title:"Workwise | For Vendors",
    description:"Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons",
    img: "https://api.letsworkwise.com/banner_image/1723181257132-3773bd09-2a7d-489a-981b-f11e94c2a55a.png"
}

const ForVendors = (props) => {
	return (
		<>
			<Head>
				<title>{pageInfo.title}</title>
				<meta name="description" content={pageInfo.description} />

				<meta property="og:title" content={pageInfo.title} />
                <meta property="og:description" content={pageInfo.description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/for-vendors`} />
                <meta property="og:image" content={pageInfo.img} />
                <meta property="og:site_name" content="Workwise" />
			</Head>
			<ForVendorsPage />
		</>
	);
};

export default ForVendors;
