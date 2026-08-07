import React, { useRef } from 'react';
import { FiTrendingUp, FiClock, FiUsers, FiShield, FiFileText, FiCheckCircle } from 'react-icons/fi';
import Reveal from './Reveal';
import useCardStepper from './useCardStepper';
import useMediaQuery from './useMediaQuery';
import { NAVY, GOLD } from './theme';

// See ProblemSection.js for why this returns literal JSX per branch rather
// than resolving a dynamic icon component reference (avoids FeatureCard's
// `icon` prop, which expects a component type — the exact pattern that hangs
// Turbopack when the type can't be statically resolved).
const renderIcon = (key, size) => {
  if (key === 'trending-up') return <FiTrendingUp size={size} />;
  if (key === 'clock') return <FiClock size={size} />;
  if (key === 'users') return <FiUsers size={size} />;
  if (key === 'shield') return <FiShield size={size} />;
  if (key === 'file') return <FiFileText size={size} />;
  return <FiCheckCircle size={size} />;
};

const WhatYouGetSection = ({ content }) => {
  const isMobile = useMediaQuery('(max-width: 991.98px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isPinnedActive = !isMobile && !prefersReducedMotion;

  const sectionRef = useRef(null);
  const activeIndex = useCardStepper({
    sectionRef,
    cardCount: content.benefits.length,
    enabled: isPinnedActive,
  });

  const headingMarkup = (
    <>
      <span className="lh-eyebrow">{content.eyebrow}</span>
      <h2 className="lh-heading">{content.heading}</h2>
      <p className="lh-subheading">{content.subheading}</p>
    </>
  );

  const activeBenefit = content.benefits[activeIndex] || content.benefits[0];

  return (
    <section
      id="lh-what-you-get"
      ref={sectionRef}
      className={`lh-section ${isPinnedActive ? 'lh-pinned-section' : ''}`}
    >
      {isPinnedActive ? (
        <div className="lh-spotlight-wrap">
          <div className="lh-section-head lh-spotlight-head">{headingMarkup}</div>

          <div className="lh-spotlight-row">
            {content.benefits.map((benefit, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={benefit.title}
                  className={`lh-spotlight-chip ${isActive ? 'lh-spotlight-chip-active' : ''}`}
                >
                  {renderIcon(benefit.icon, isActive ? 28 : 18)}
                </div>
              );
            })}
          </div>

          <div key={activeIndex} className="lh-spotlight-active">
            <h3 className="lh-spotlight-title">{activeBenefit.title}</h3>
            <p className="lh-spotlight-desc">{activeBenefit.description}</p>
          </div>
        </div>
      ) : (
        <div className="lh-section-inner">
          <Reveal className="lh-section-head">{headingMarkup}</Reveal>
          <div className="lh-benefits-grid">
            {content.benefits.map((benefit, index) => (
              <Reveal key={benefit.title} className="lh-benefit-card" delay={index * 80}>
                <div className="lh-benefit-icon">{renderIcon(benefit.icon, 24)}</div>
                <h3 className="lh-benefit-title">{benefit.title}</h3>
                <p className="lh-benefit-desc">{benefit.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .lh-section {
          padding: 72px 20px;
          background: var(--light-grey-bg, #f8f9fa);
        }
        .lh-section-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .lh-pinned-section {
          padding: 0 20px;
        }
        :global(.lh-section-head) {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 44px;
        }
        .lh-spotlight-wrap {
          max-width: 900px;
          height: 100vh;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .lh-spotlight-head {
          margin-bottom: 8px;
        }
        .lh-spotlight-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin: 40px 0;
        }
        .lh-spotlight-chip {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #fff;
          color: var(--dark-grey-color, #d3d3d3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .lh-spotlight-chip-active {
          width: 76px;
          height: 76px;
          background: ${GOLD};
          color: ${NAVY};
          transform: translateY(-10px);
          box-shadow: 0 12px 24px ${GOLD}47;
        }
        .lh-spotlight-active {
          text-align: center;
          max-width: 560px;
          animation: lh-active-card-in 0.4s ease;
        }
        .lh-spotlight-title {
          font-weight: 800;
          font-size: 1.7rem;
          color: var(--dark-color);
          margin-bottom: 12px;
        }
        .lh-spotlight-desc {
          color: var(--text-color);
          font-size: 1.02rem;
          line-height: 1.7;
          margin: 0;
        }
        .lh-eyebrow {
          display: inline-block;
          color: ${NAVY};
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .lh-heading {
          font-weight: 800;
          font-size: clamp(1.6rem, 3.5vw, 2.3rem);
          color: var(--dark-color);
          margin-bottom: 12px;
        }
        .lh-subheading {
          color: var(--text-color);
          font-size: 1rem;
          line-height: 1.6;
        }
        .lh-benefits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        :global(.lh-benefit-card) {
          background: #fff;
          border-radius: 16px;
          padding: 28px 22px;
          text-align: left;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
        }
        .lh-benefit-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: ${NAVY}1a;
          color: ${NAVY};
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .lh-benefit-title {
          font-weight: 700;
          font-size: 1.05rem;
          color: var(--dark-color);
          margin-bottom: 8px;
        }
        .lh-benefit-desc {
          color: var(--text-color);
          font-size: 0.9rem;
          line-height: 1.55;
          margin: 0;
        }
        @keyframes lh-active-card-in {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 991px) {
          .lh-benefits-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 576px) {
          .lh-section {
            padding: 48px 16px;
          }
          .lh-benefits-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
};

export default WhatYouGetSection;
