import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faEnvelope } from '@fortawesome/free-solid-svg-icons';

// Import components
import { DynamicCard } from '@/components/ui/DynamicCard';
import { HeroSection } from '@/components/ui/HeroSection';

// Import data
import { newsData } from '@/components/constants/newsData';

const NewsPage = () => {
  const router = useRouter();
  const handleViewArticle = (url) => {
    window.open(url, '_blank');
  };

  const handleDownloadPressKit = () => {
    // Open the global contact/book-a-call modal used across the site
    const bookCallButton = document.querySelector('.btn-popup-form');
    if (bookCallButton) {
      bookCallButton.click();
      return;
    }
    // Fallback: navigate to contact page
    router.push('/contactus');
  };

  const handleMediaContact = () => {
    router.push('/contactus');
  };

  const [openYear, setOpenYear] = useState(2024);
  // Featured articles (first 2)
  const featuredArticles = newsData.newsCoverage[openYear].slice(0, 2);
  // Regular articles (rest) - commented out with coverage section
  // const regularArticles = newsData.newsCoverage[openYear].slice(2);

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      {/* Hero Section */}
      <HeroSection
        title={newsData.hero.title}
        subtitle={newsData.hero.subtitle}
        layout="centered"
        size="small"
        showVisual={false}
      />

      {/* Featured Coverage Section */}
      <section className="py-5 bg-white">
        <div className="container">
          {/* Section Header */}
          <div className="mb-5">
            <h2 className="fs-2 fw-bold text-dark mb-0">Featured Coverage</h2>
          </div>

          {/* Featured Articles Grid */}
          <div className="row g-4">
            {featuredArticles.map((article) => (
              <div key={article.id} className="col-lg-6">
                <DynamicCard
                  type="news"
                  size="large"
                  title={article.headline}
                  description={article.summary}
                  date={article.date}
                  publisher={article.publisher}
                  category={article.category}
                  image={article.image}
                  secondaryAction={{
                    id: `view_article_${article.id}-featured_insights_news_page`,
                    label: "View",
                    color: "var(--orange-color)",
                    showArrow: false
                  }}
                  onSecondaryAction={() => handleViewArticle(article.url)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Yearly Coverage Section with CSS-only dropdown (DOM always visible) */}
      {/* 
      <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between">
              <h2 className="fs-2 fw-bold text-dark mb-0">Coverage</h2>
              <div className="position-relative">
                <button className="btn btn-light dropdown-toggle" id="toggle_year-filter-insights_news_page" onClick={() => setOpenYear(openYear === 2024 ? 2023 : 2024)}>
                  {openYear}
                </button>
              </div>
            </div>
          </div>

          <div className={`row g-4 year-content ${openYear === 2024 ? 'expanded' : 'collapsed'}`}>
            {regularArticles.map((article) => (
              <div key={article.id} className="col-md-6 col-lg-4">
                <DynamicCard
                  type="news"
                  size="medium"
                  title={article.headline}
                  description={article.summary}
                  date={article.date}
                  publisher={article.publisher}
                  category={article.category}
                  image={article.image}
                  secondaryAction={{
                    label: "View",
                    color: "var(--primary-color)",
                    showArrow: true
                  }}
                  onSecondaryAction={() => handleViewArticle(article.url)}
                />
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          .year-content.collapsed { max-height: 0; overflow: hidden; opacity: 0; transition: all .3s ease; }
          .year-content.expanded { max-height: 4000px; opacity: 1; transition: all .3s ease; }
        `}</style>
      </section>
      */}

      {/* Press Kit & Media Resources Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row justify-content-center text-center">
            <div className="col-lg-8">
              <h2 className="fs-2 fw-bold text-dark mb-3">Press Kit & Media Resources</h2>
              <p className="text-muted mb-4" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                Download our press kit for high-resolution logos, company information, and media assets.
              </p>
              
              <div className="d-flex justify-content-center gap-3">
                <button
                  id="download_press_kit-press_kit-insights_news_page"
                  className="btn btn-primary px-4 py-2"
                  onClick={handleDownloadPressKit}
                  style={{
                    backgroundColor: 'var(--primary-color)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  <FontAwesomeIcon icon={faDownload} className="me-2" style={{ fontSize: '16px' }} />
                  Download Press Kit
                </button>
                
                <button
                  id="media_contact-press_kit-insights_news_page"
                  className="btn btn-outline-primary px-4 py-2"
                  onClick={handleMediaContact}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--primary-color)',
                    color: 'var(--primary-color)',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  <FontAwesomeIcon icon={faEnvelope} className="me-2" style={{ fontSize: '16px' }} />
                  Media Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};



export default NewsPage; 