import React from "react";
import Head from "next/head";
import AiToolsPage from "../../components/aiTools/aiToolsPage";

const pageInfo = {
    title: "Workwise | AI Tools",
    description:
        "Workwise AI Tools help you simplify procurement by automating tender summaries, BOQ simplification, cost estimation, and technical document analysis – saving time and reducing costs.",
    img: "https://api.letsworkwise.com/banner_image/ai-tools-banner.png",
};

const AiTools = () => {
    return (
        <>
            <Head>
                <title>{pageInfo.title}</title>
                <meta name="description" content={pageInfo.description} />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "http://schema.org",
                        "@type": "WebPage",
                        "name": "AI Tools - Workwise",
                        "description":
                            "Explore Workwise AI Tools designed for procurement teams, including Tender Summaries, BOQ Simplification, Cost Estimation, and Technical Document Summaries.",
                        "url": `${process.env.NEXT_PUBLIC_FRONTEND_URL}/ai-tools`,
                    })}
                </script>

                <meta property="og:title" content={pageInfo.title} />
                <meta property="og:description" content={pageInfo.description} />
                <meta property="og:type" content="website" />
                <meta
                    property="og:url"
                    content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/ai-tools`}
                />
                <meta property="og:image" content={pageInfo.img} />
                <meta property="og:site_name" content="Workwise" />
            </Head>
            <AiToolsPage />
        </>
    );
};

export default AiTools;