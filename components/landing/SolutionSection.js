import React, { useRef } from 'react';
import { FiCheckCircle, FiZap, FiShield, FiBarChart2 } from 'react-icons/fi';
import Reveal from './Reveal';
import CardVisual from './CardVisual';
import useCardStepper from './useCardStepper';
import useMediaQuery from './useMediaQuery';
import { GOLD } from './theme';

const ACCENT = GOLD;

// See ProblemSection.js for why this returns literal JSX per branch rather
// than resolving a dynamic icon component reference.
const renderIcon = (key, size) => {
  if (key === 'chart') return <FiBarChart2 size={size} />;
  if (key === 'zap') return <FiZap size={size} />;
  if (key === 'shield') return <FiShield size={size} />;
  return <FiCheckCircle size={size} />;
};

const SolutionSection = ({ content }) => {
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
    <section id="lh-solution" ref={sectionRef} className={`lh-section ${isPinnedActive ? 'lh-pinned-section' : ''}`}>
      {isPinnedActive ? (
        <div className="lh-pinned-inner">
          <div className="lh-pinned-head">{headingMarkup}</div>

          <div className="lh-pinned-row">
            <div className="lh-visual-pane">
              <CardVisual
                variant={activePoint.icon}
                iconElement={renderIcon(activePoint.icon, 56)}
                color={ACCENT}
                activeKey={activeIndex}
              />
            </div>

            <div className="lh-text-pane">
              <div key={activeIndex} className="lh-active-card">
                <div className="lh-solution-icon">{renderIcon(activePoint.icon, 22)}</div>
                <h3 className="lh-solution-title">{activePoint.title}</h3>
                <p className="lh-solution-desc">{activePoint.description}</p>
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
          </div>
        </div>
      ) : (
        <div className="lh-section-inner">
          <Reveal className="lh-section-head">{headingMarkup}</Reveal>
          <div className="lh-solution-grid">
            {content.points.map((point, index) => (
              <Reveal key={point.title} className="lh-solution-card" delay={index * 80}>
                <div className="lh-solution-icon">{renderIcon(point.icon, 22)}</div>
                <h3 className="lh-solution-title">{point.title}</h3>
                <p className="lh-solution-desc">{point.description}</p>
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
        .lh-text-pane {
          flex: 1 1 50%;
          min-width: 0;
          height: min(520px, 65vh);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .lh-visual-pane {
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
        .lh-solution-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        :global(.lh-solution-card) {
          background: #fff;
          border-radius: 16px;
          padding: 32px 26px;
          text-align: left;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
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
        .lh-solution-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: ${ACCENT}20;
          color: ${ACCENT};
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .lh-active-card .lh-solution-icon {
          width: 60px;
          height: 60px;
          margin-bottom: 22px;
        }
        .lh-solution-title {
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--dark-color);
          margin-bottom: 10px;
        }
        .lh-active-card .lh-solution-title {
          font-size: 1.5rem;
          margin-bottom: 14px;
        }
        .lh-solution-desc {
          color: var(--text-color);
          font-size: 0.92rem;
          line-height: 1.6;
          margin: 0;
        }
        .lh-active-card .lh-solution-desc {
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
          background: ${ACCENT};
          transform: scale(1.3);
        }

        @media (max-width: 991px) {
          .lh-solution-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 576px) {
          .lh-section {
            padding: 48px 16px;
          }
          .lh-solution-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
};

export default SolutionSection;
