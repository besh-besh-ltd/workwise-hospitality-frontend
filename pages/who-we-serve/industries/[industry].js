import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaWrench, FaPhone } from 'react-icons/fa';
import { FaUsers, FaFileAlt, FaSitemap, FaClipboardCheck } from 'react-icons/fa';
import { FaBolt, FaBuilding, FaCogs } from 'react-icons/fa';
import { FaCog, FaExchangeAlt, FaThermometerHalf, FaFireExtinguisher, FaFan } from 'react-icons/fa';
import { GiPipes } from 'react-icons/gi';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { CtaSection } from '@/components/ui/CtaSection';
import { HeroSection } from '@/components/ui/HeroSection';
import Layout from '@/components/layout';

// Import default data (Power). Additional industries can be added to this map.
import { industryPageData as powerData, industriesPageData } from '@/components/constants/industryPageData';

const dataMap = industriesPageData || { power: powerData };

const PowerTeamsFaq = ({ className = '', faqs, title }) => (
  <section className={`py-5 bg-light ${className}`}>
    <div className="container">
      <h2 className="h4 fw-bold text-center mb-4">{title}</h2>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <FaqAccordion questions={faqs} />
        </div>
      </div>
    </div>
  </section>
);

const WorkwiseModules = ({ className = '', title, modules, onLearnMore }) => {
  const displayModules = modules || [];
  return (
    <section className={`py-5 bg-light ${className}`}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="h4 fw-bold text-dark d-inline-flex align-items-center gap-2">
            <FaCog className="text-secondary" />
            {title}
          </h2>
        </div>
        <div className="row g-4">
          {displayModules.map((mod) => (
            <div key={mod.id} className="col-lg-4 col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body p-4">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{ width: '48px', height: '48px', backgroundColor: '#e9effa', color: '#3466d3' }}
                  >
                    {mod.icon === 'file-invoice' && <FaFileAlt size={20} />}
                    {mod.icon === 'search' && <FaExchangeAlt size={20} />}
                    {mod.icon === 'chart-bar' && <FaClipboardCheck size={20} />}
                  </div>
                  <h5 className="fw-semibold mb-3 text-dark">{mod.name}</h5>
                  <p className="text-muted small mb-4" style={{ minHeight: '64px' }}>{mod.description}</p>
                  <a
                    href={mod.link || '#'}
                    onClick={(e) => {
                      if (onLearnMore) {
                        e.preventDefault();
                        onLearnMore(mod.id);
                      }
                    }}
                    className="text-primary small fw-medium text-decoration-none"
                  >
                    Learn more →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const TestimonialsSection = ({ className = '', title, testimonials }) => {
  const displayTestimonials = testimonials || [];
  return (
    <section className={`py-5 bg-light ${className}`}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="h4 fw-bold text-dark">{title}</h2>
        </div>
        <div className="d-flex justify-content-center align-items-center gap-4 mb-5 flex-wrap">
          {[1, 2, 3, 4, 5].map((logo) => (
            <div
              key={logo}
              className="bg-white rounded shadow-sm d-flex align-items-center justify-content-center"
              style={{ width: '100px', height: '60px', backgroundColor: '#f8f9ff' }}
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{ width: '40px', height: '40px', backgroundColor: '#6c63ff', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
              />
            </div>
          ))}
        </div>
        <div className="row g-4">
          {displayTestimonials.map((t) => (
            <div key={t.id} className="col-lg-4 col-md-6">
              <TestimonialCard quote={t.quote} authorName={t.authorName} authorTitle={t.authorTitle} authorImage={t.authorImage} className="h-100">
                <div className="position-absolute top-0 end-0 m-3">
                  <span className="badge rounded-pill px-3 py-2 small fw-medium" style={{ backgroundColor: '#e3f2fd', color: '#1976d2', fontSize: '0.75rem' }}>
                    {t.company}
                  </span>
                </div>
                {t.hasLink && (
                  <div className="mt-3 pt-3 border-top">
                    <a href="#" className="text-primary text-decoration-none small fw-medium" onClick={(e) => e.preventDefault()}>
                      {t.linkText}
                    </a>
                  </div>
                )}
              </TestimonialCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const AllDisciplines = ({ className = '', title, disciplines }) => {
  const displayDisciplines = disciplines || [];
  const slugify = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return (
    <section className={`py-5 bg-light ${className}`}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="h4 fw-bold text-dark">{title}</h2>
        </div>
        <div className="row g-3 justify-content-center">
          {displayDisciplines.map((d) => (
            <div key={d.id} className="col-lg-6 col-md-6 d-flex justify-content-center">
              <div className="bg-white rounded-3 shadow-sm p-4 d-flex align-items-center" style={{ minHeight: '90px', width: '100%', maxWidth: '300px' }}>
                <div className="me-3 flex-shrink-0">
                  {d.icon === 'bolt' && <FaBolt style={{ color: '#4285f4' }} size={24} />}
                  {d.icon === 'cog' && <FaCog style={{ color: '#4285f4' }} size={24} />}
                  {d.icon === 'building' && <FaBuilding style={{ color: '#4285f4' }} size={24} />}
                  {d.icon === 'pipes' && <GiPipes style={{ color: '#4285f4' }} size={24} />}
                  {d.icon === 'thermometer-half' && <FaThermometerHalf style={{ color: '#4285f4' }} size={24} />}
                  {d.icon === 'fire-extinguisher' && <FaFireExtinguisher style={{ color: '#4285f4' }} size={24} />}
                  {d.icon === 'fan' && <FaFan style={{ color: '#4285f4' }} size={24} />}
                </div>
                <div className="fw-semibold text-dark">
                  <Link href={`/disciplines/${slugify(d.label)}`}>{d.label}</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PowerProcurementChallenges = ({ className = '', title, challenges }) => {
  const displayChallenges = challenges || [];
  return (
    <section className={`py-5 bg-light ${className}`}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="h3 fw-bold text-dark">{title}</h2>
        </div>
        <div className="row g-4">
          {displayChallenges.map((c) => (
            <div key={c.id} className="col-lg-3 col-md-6">
              <div className="bg-white rounded-3 shadow-sm p-4 h-100 border-0">
                <div className="text-center mb-3">
                  {c.icon === 'users' && <FaUsers className="text-primary" size={32} />}
                  {c.icon === 'file-alt' && <FaFileAlt className="text-primary" size={32} />}
                  {c.icon === 'sitemap' && <FaSitemap className="text-primary" size={32} />}
                  {c.icon === 'clipboard-check' && <FaClipboardCheck className="text-primary" size={32} />}
                </div>
                <div className="text-center">
                  <h5 className="fw-bold text-dark mb-3">{c.title}</h5>
                  <p className="text-muted mb-0 small lh-base">{c.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CapexProjectsServed = ({ className = '', title, projects }) => {
  const displayProjects = projects || [];
  return (
    <section className={`py-5 bg-light ${className}`}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="h3 fw-bold text-dark">{title}</h2>
        </div>
        <div className="row g-4 justify-content-center">
          {displayProjects.map((project) => (
            <div key={project.id} className="col-lg-4 col-md-6">
              <div className="bg-white rounded-3 shadow-sm p-4 h-100 border-0">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="fw-bold text-dark mb-0 flex-grow-1 me-2">{project.name}</h5>
                  <span className="badge rounded-pill px-3 py-2 fw-bold" style={{ backgroundColor: '#ffc107', color: '#000', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {project.cost}
                  </span>
                </div>
                <div className="d-flex gap-2 mb-3 flex-wrap">
                  {project.categories.map((category, idx) => (
                    <span key={idx} className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-2 bg-light text-muted small" style={{ fontSize: '0.75rem' }}>
                      {category.icon === 'bolt' && <FaBolt className="text-secondary" size={14} />}
                      {category.icon === 'building' && <FaBuilding className="text-secondary" size={14} />}
                      {category.icon === 'cogs' && <FaCogs className="text-secondary" size={14} />}
                      <span className="fw-medium">{category.label}</span>
                    </span>
                  ))}
                </div>
                <p className="text-muted mb-0 small lh-base">{project.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const IndustryDynamicPage = () => {
  const router = useRouter();
  const { industry } = router.query;
  const key = typeof industry === 'string' ? industry.toLowerCase() : 'power';
  const data = (dataMap && dataMap[key]) || powerData;

  return (
    <Layout>
      <HeroSection
        title={data.hero.title}
        subtitle={data.hero.description}
        layout="centered"
        size="medium"
        showVisual={false}
        primaryButton={{ label: data.hero.buttonLabel, variant: 'black', onClick: () => console.log('Book a Call clicked') }}
      />
      <PowerProcurementChallenges title={data.challengesTitle || 'We Understand the Real-World Challenges of Industry Procurement'} challenges={data.challenges} />
      <CapexProjectsServed title={data.projectsTitle || "Capex Projects We've Served in Industry"} projects={data.projects} />
      <AllDisciplines title={data.disciplinesTitle || 'All Disciplines — One Platform'} disciplines={data.disciplines} />
      <TestimonialsSection title={data.testimonialsTitle || 'Used in Projects by Companies You Know'} testimonials={data.testimonials} />
      <WorkwiseModules title={data.modulesTitle || 'Top Workwise Modules for Industry Teams'} modules={data.modules} />
      <PowerTeamsFaq className="mt-5" title={data.faqsTitle || 'Questions Teams Ask Us'} faqs={data.faqs} />
      <CtaSection
        title={data.cta.title}
        description={data.cta.description}
        primaryButton={{ label: data.cta.primaryButton.label, variant: data.cta.primaryButton.variant, onClick: () => console.log('CTA clicked') }}
        secondaryButton={{ label: data.cta.secondaryButton.label, variant: data.cta.secondaryButton.variant, onClick: () => console.log('CTA secondary') }}
        className="mt-4"
      />
    </Layout>
  );
};

export default IndustryDynamicPage;


