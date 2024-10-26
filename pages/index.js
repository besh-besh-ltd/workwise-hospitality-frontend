import Head from 'next/head'
import { Inter } from 'next/font/google'
import Homepage from '../components/home/home'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
    return (
        <>
        <Head>
            <title>Workwise | Home</title>
            <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />        
            
            <meta property="og:title" content="Workwise | Find Approved Vendors, Automate RFQs, Compare Rates" />
            <meta property="og:description" content="A brief description of home page's content." />
            <meta property="og:url" content="https://letsworkwise.com" />
        </Head>
        <Homepage />
        </>
    )
}
