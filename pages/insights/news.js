import React, { useState } from 'react';
import { 
  Download,
  Mail,
  ExternalLink,
  FileText
} from 'lucide-react';

// Import components
import { DynamicCard } from '@/components/ui/DynamicCard';
import { HeroSection } from '@/components/ui/HeroSection';

// Import data
import { newsData } from '@/components/constants/newsData';

const NewsPage = () => {
  const handleViewArticle = (url) => {
    window.open(url, '_blank');
  };

  const handleDownloadPressKit = () => {
    console.log('Download Press Kit clicked');
  };

  const handleMediaContact = () => {
    console.log('Media Contact clicked');
  };

  // Featured articles (first 2)
  const featuredArticles = newsData.newsCoverage[2024].slice(0, 2);
  // Regular articles (rest)
  const regularArticles = newsData.newsCoverage[2024].slice(2);

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
                    label: "Read Article →",
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

      {/* 2024 Coverage Section */}
      <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          {/* Section Header */}
          <div className="mb-5">
            <h2 className="fs-2 fw-bold text-dark mb-0">2024 Coverage</h2>
          </div>

          {/* Regular Articles Grid */}
          <div className="row g-4">
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
      </section>

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
                  <Download size={16} className="me-2" />
                  Download Press Kit
                </button>
                
                <button
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
                  <Mail size={16} className="me-2" />
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