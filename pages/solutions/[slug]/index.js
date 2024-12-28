import SolutionsCategory from '@/components/solutions/solutions-category';
import { textCapitalize } from '@/utils/sharedFunctions';
import Head from 'next/head'
import { useRouter } from 'next/router';
import React from 'react'


const SolutionCategoryPage = () => {
    const router = useRouter();
    const { slug } = router.query;

    if (router.isFallback) {
        return <div>Loading...</div>;
    }

    const metaTitle = `Top ${textCapitalize(slug) || ''} Manufacturers, Suppliers & Vendors | Workwise`;
    const metaDescription = `Discover high-quality ${textCapitalize(slug) || ''} from trusted manufacturers and suppliers at Workwise. Your one-stop vendor for premium industrial products and solutions.`;

    return (
        <>
            <Head>
                <title>{metaTitle}</title>
                <meta name="description" content={metaDescription} />

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "http://schema.org",
                        "@type": "SolutionsCategory",
                        "name": `${textCapitalize(slug)} - Workwise`,
                        "description": "Learn more about Workwise and how we're changing the procurement landscape with our innovative solutions.",
                        "url": `${process.env.NEXT_PUBLIC_FRONTEND_URL}/solutions`
                    })}
                </script>

                <meta property="og:title" content={metaTitle} />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/solutions/${slug}`} />
                <meta property="og:image" content={"https://api.letsworkwise.com/banner_image/1722514602793-9572cf56-4f0b-498b-8154-b1eabcc126c3.png"} />
                <meta property="og:site_name" content="Workwise" />
            </Head>
            <SolutionsCategory pageTitle={textCapitalize(slug)} />
        </>
    )
}

export default SolutionCategoryPage
