import ForBuyersPage from "@/components/forBuyers";
import Head from "next/head";

const ForBuyers = (props) => {
	return (
		<>
			<Head>
                <title>Workwise | For Buyers</title>
				<meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />
            </Head>
			<ForBuyersPage />
		</>
	);
};

export default ForBuyers;
