import React, { useRef } from 'react';
import { FiClock, FiFileText, FiAlertTriangle, FiUsers } from 'react-icons/fi';
import { GiOilDrum } from 'react-icons/gi';
import Reveal from './Reveal';
import CardVisual from './CardVisual';
import useCardStepper from './useCardStepper';
import useMediaQuery from './useMediaQuery';
import { NAVY, GOLD } from './theme';

const ACCENT = NAVY;

// Renders a fully-formed icon element per branch (never a variable holding
// "one of several" component references) — Turbopack hangs indefinitely on
// dynamic icon-component resolution (object/switch lookup into react-icons).
const renderIcon = (key, size) => {
  if (key === 'clock') return <FiClock size={size} />;
  if (key === 'file') return <FiFileText size={size} />;
  if (key === 'users') return <FiUsers size={size} />;
  if (key === 'alert') return <GiOilDrum size={size} />;
  return <FiAlertTriangle size={size} />;
};

const ProblemSection = ({ content }) => {
  const isMobile = useMediaQuery('(max-width: 991.98px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isPinnedActive = !isMobile && !prefersReducedMotion;

  const sectionRef = useRef(null);
  const activeIndex = useCardStepper({
    sectionRef,
    cardCount: content.points.length,
    enabled: isPinnedActive,
  });

  const headingMarkup = (
    <>
      <h2 className="lh-heading">{content.heading}</h2>
      <p className="lh-subheading">{content.subheading}</p>
    </>
  );

  const activePoint = content.points[activeIndex] || content.points[0];

  return (
    <section id="lh-problem" ref={sectionRef} className={`lh-section ${isPinnedActive ? 'lh-pinned-section' : ''}`}>
      {isPinnedActive ? (
        <div className="lh-pinned-inner">
          <div className="lh-pinned-head">{headingMarkup}</div>

          <div className="lh-pinned-row">
            <div className="lh-pinned-left">
              <div key={activeIndex} className="lh-active-card">
                <div className="lh-problem-icon">{renderIcon(activePoint.icon, 22)}</div>
                <h3 className="lh-problem-title">{activePoint.title}</h3>
                <p className="lh-problem-desc">{activePoint.description}</p>
              </div>

              <div className="lh-step-dots">
                {content.points.map((point, index) => (
                  <span
                    key={point.title}
                    className={`lh-step-dot ${index === activeIndex ? 'lh-step-dot-active' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="lh-pinned-right">
              <CardVisual
                variant={activePoint.icon}
                iconElement={renderIcon(activePoint.icon, 56)}
                color={ACCENT}
                activeKey={activeIndex}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="lh-section-inner">
          <Reveal className="lh-section-head">{headingMarkup}</Reveal>
          <div className="lh-problem-grid">
            {content.points.map((point, index) => (
              <Reveal key={point.title} className="lh-problem-card" delay={index * 80}>
                <div className="lh-problem-icon">{renderIcon(point.icon, 22)}</div>
                <h3 className="lh-problem-title">{point.title}</h3>
                <p className="lh-problem-desc">{point.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .lh-section {
          padding: 72px 20px;
          background: #ffffff;
        }
        .lh-section-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .lh-pinned-section {
          padding: 0 20px;
          background: radial-gradient(120% 100% at 100% 0%, ${ACCENT}12 0%, ${ACCENT}05 45%, #ffffff 100%);
        }
        .lh-pinned-inner {
          max-width: 1280px;
          height: 100vh;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 36px;
        }
        .lh-pinned-head {
          text-align: center;
          max-width: 680px;
          margin: 0 auto;
        }
        .lh-pinned-row {
          display: flex;
          align-items: center;
          gap: 56px;
        }
        .lh-pinned-left {
          flex: 1 1 50%;
          min-width: 0;
          height: min(520px, 65vh);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .lh-pinned-right {
          flex: 1 1 50%;
          min-width: 0;
          height: min(520px, 65vh);
        }
        :global(.lh-section-head) {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 44px;
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
        .lh-problem-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        :global(.lh-problem-card) {
          background: var(--light-grey-bg, #f8f9fa);
          border-radius: 16px;
          padding: 28px 22px;
          text-align: left;
        }
        .lh-active-card {
          text-align: left;
          animation: lh-active-card-in 0.4s ease;
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
        .lh-problem-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: ${ACCENT}1a;
          color: ${ACCENT};
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .lh-active-card .lh-problem-icon {
          width: 56px;
          height: 56px;
          margin-bottom: 20px;
        }
        .lh-problem-title {
          font-weight: 700;
          font-size: 1.05rem;
          color: var(--dark-color);
          margin-bottom: 8px;
        }
        .lh-active-card .lh-problem-title {
          font-size: 1.5rem;
          margin-bottom: 14px;
        }
        .lh-problem-desc {
          color: var(--text-color);
          font-size: 0.9rem;
          line-height: 1.55;
          margin: 0;
        }
        .lh-active-card .lh-problem-desc {
          font-size: 1.05rem;
          line-height: 1.7;
          max-width: 480px;
        }
        .lh-step-dots {
          display: flex;
          gap: 8px;
          margin-top: 32px;
        }
        .lh-step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--dark-grey-color, #d3d3d3);
          transition: background 0.25s ease, transform 0.25s ease;
        }
        .lh-step-dot-active {
          background: ${GOLD};
          transform: scale(1.3);
        }

        @media (max-width: 991px) {
          .lh-problem-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 576px) {
          .lh-section {
            padding: 48px 16px;
          }
          .lh-problem-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
};

export default ProblemSection;
