import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'

const inter = Inter({ subsets: ['latin'] })
import Homepage from '../components/home/home'

export default function Home() {
  return (
    <>
      <Head>
        <title>Workwise: Find Approved Vendors, Automate RFQs, Compare Rates</title>
        <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/fabicon.ico" />
      </Head>
      <Homepage />
    </>
  )
}
