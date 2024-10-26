import ForBuyersPage from "@/components/forBuyers";
import Head from "next/head";

const ForBuyers = (props) => {
	return (
		<>
			<Head>
                <title>Workwise | For Buyers</title>
				<meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />

                <meta property="og:title" content="Workwise | Find Approved Vendors, Automate RFQs, Compare Rates" />
                <meta property="og:description" content="A brief description of for-buyers page's content." />
                <meta property="og:url" content="https://letsworkwise.com/for-buyers" />
            </Head>
			<ForBuyersPage />
		</>
	);
};

export default ForBuyers;
