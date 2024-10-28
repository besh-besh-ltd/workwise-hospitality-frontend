import React from "react";
import ForVendorsPage from "@/components/forVendors";
import Head from "next/head";

const ForVendors = (props) => {
	return (
		<>
			<Head>
				<title>Workwise | For Vendors</title>
				<meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />
			</Head>
			<ForVendorsPage />
		</>
	);
};

export default ForVendors;
