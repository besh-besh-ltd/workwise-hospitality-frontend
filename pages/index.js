import Head from 'next/head'
import { Inter } from 'next/font/google'
import Homepage from '../components/home/home'

const inter = Inter({ subsets: ['latin'] })

const pageInfo = {
    title: "Workwise: Find Approved Vendors, Automate RFQs, Compare Rates",
    description: "Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons",
    img:"https://letsworkwise.com/_next/image?url=https%3A%2F%2Fapi.letsworkwise.com%2Fbanner_image%2F1722515545528-100eb1f7-5df2-4b2b-8ab6-5916654bdd67.jpg"
}

export default function Home() {
    return (
        <>
            <Head>
                <title> {pageInfo.title} </title>
                <meta name="description" content={pageInfo.description} />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "http://schema.org",
                        "@type": "Organization",
                        "name": "Workwise",
                        "description": pageInfo?.description,
                        "url": process.env.NEXT_PUBLIC_FRONTEND_URL,
                        "logo": "https://letsworkwise.com/_next/image?url=%2Fassets%2Fimages%2Flogo.png&w=256&q=75",
                        "foundingDate": "2023-08-01",
                        "keywords": "Procurement, Automation, Industrial Supplies",
                        "legalName": "Workwise Technologies Pvt. Ltd.",
                        "email": "hello@letsworkwise.com",
                        "telephone": "9930787798",
                        "areaServed": "Global",
                        "numberOfEmployees": "50+",
                        "slogan": "Maximise your profit through our AI-powered procurement solution",
                        "founder": [
                            {
                                "@type": "Person",
                                "name": "Siddharth Kothari"
                            }, {
                                "@type": "Person",
                                "name": "Dr. Pulak De"
                            }, {
                                "@type": "Person",
                                "name": "Siddharth Chaudhury"
                            },
                        ],
                        "location": {
                            "@type": "Place",
                            "name": "Headquarters",
                            "description": "Jbr Tech Park, Whitefield, Bengaluru, Karnataka 560066",
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": "Jbr Tech Park, Whitefield, Bengaluru, Karnataka 560066",
                                "addressLocality": "Bengaluru",
                                "addressRegion": "Karnataka",
                                "postalCode": "560066",
                                "addressCountry": {
                                    "@type": "Country",
                                    "name": "India"
                                }
                            }
                        },
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "contactType": "Customer Service",
                            "email": "hello@letsworkwise.com",
                            "telephone": "9930787798",
                            "hoursAvailable": [
                                {
                                    "@type": "OpeningHoursSpecification",
                                    "name": "24/7",
                                    "dayOfWeek": [
                                        "https://schema.org/Monday",
                                        "https://schema.org/Tuesday",
                                        "https://schema.org/Wednesday",
                                        "https://schema.org/Thursday",
                                        "https://schema.org/Friday",
                                        "https://schema.org/Saturday"
                                    ],
                                    "opens": "10:00",
                                    "closes": "20:00"
                                }
                            ]
                        }
                    })}
                </script>

                <meta property="og:title" content={pageInfo.title} />
                <meta property="og:description" content={pageInfo.description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}`} />
                <meta property="og:image" content={pageInfo.img} />
                <meta property="og:site_name" content="Workwise" />
            </Head>
            <Homepage />
        </>
    )
}
