import React, { useRef } from 'react';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { FiArrowRight } from 'react-icons/fi';
import Reveal from './Reveal';
import useCardStepper from './useCardStepper';
import useMediaQuery from './useMediaQuery';
import { NAVY, GOLD } from './theme';

const JourneySection = ({ content }) => {
  const isMobile = useMediaQuery('(max-width: 991.98px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isPinnedActive = !isMobile && !prefersReducedMotion;

  const sectionRef = useRef(null);
  const activeIndex = useCardStepper({
    sectionRef,
    cardCount: content.steps.length,
    enabled: isPinnedActive,
  });

  const headingMarkup = (
    <>
      <span className="lh-eyebrow">{content.eyebrow}</span>
      <h2 className="lh-heading">{content.heading}</h2>
      <p className="lh-subheading">{content.subheading}</p>
    </>
  );

  const activeStep = content.steps[activeIndex] || content.steps[0];

  return (
    <section id="lh-journey" ref={sectionRef} className={`lh-section ${isPinnedActive ? 'lh-pinned-section' : ''}`}>
      {isPinnedActive ? (
        <div className="lh-timeline-wrap">
          <div className="lh-section-head lh-timeline-head">{headingMarkup}</div>

          <div className="lh-timeline">
            {content.steps.map((step, index) => (
              <React.Fragment key={step.step}>
                <div
                  className={`lh-timeline-marker ${index === activeIndex ? 'lh-timeline-marker-active' : ''} ${
                    index < activeIndex ? 'lh-timeline-marker-done' : ''
                  }`}
                >
                  {step.step}
                </div>
                {index < content.steps.length - 1 && (
                  <div className={`lh-timeline-line ${index < activeIndex ? 'lh-timeline-line-done' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div key={activeIndex} className="lh-timeline-active">
            <h3 className="lh-timeline-title">{activeStep.title}</h3>
            <p className="lh-timeline-desc">{activeStep.description}</p>
          </div>
        </div>
      ) : (
        <div className="lh-section-inner">
          <Reveal className="lh-section-head">{headingMarkup}</Reveal>
          <div className="lh-journey-track">
            {content.steps.map((step, index) => (
              <React.Fragment key={step.step}>
                <Reveal className="lh-journey-item" delay={index * 80}>
                  <FeatureCard
                    isStep
                    stepNumber={step.step}
                    title={step.title}
                    description={step.description}
                  />
                </Reveal>
                {index < content.steps.length - 1 && (
                  <div className="lh-journey-arrow">
                    <FiArrowRight size={20} />
                  </div>
                )}
              </React.Fragment>
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
        }
        :global(.lh-section-head) {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 48px;
        }
        .lh-timeline-wrap {
          max-width: 1100px;
          height: 100vh;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .lh-timeline-head {
          margin-bottom: 56px;
        }
        .lh-timeline {
          width: 100%;
          display: flex;
          align-items: center;
        }
        .lh-timeline-marker {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--light-grey-bg, #f8f9fa);
          border: 2px solid var(--dark-grey-color, #d3d3d3);
          color: var(--dark-grey-color, #d3d3d3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }
        .lh-timeline-marker-done {
          background: ${NAVY};
          border-color: ${NAVY};
          color: #fff;
        }
        .lh-timeline-marker-active {
          width: 64px;
          height: 64px;
          background: ${GOLD};
          border-color: ${GOLD};
          color: ${NAVY};
          font-size: 1.3rem;
          box-shadow: 0 0 0 8px ${GOLD}24;
        }
        .lh-timeline-line {
          flex: 1;
          height: 3px;
          background: var(--light-grey-color, #f3f3f3);
          transition: background 0.3s ease;
        }
        .lh-timeline-line-done {
          background: ${NAVY};
        }
        .lh-timeline-active {
          text-align: center;
          max-width: 640px;
          margin-top: 48px;
          animation: lh-active-card-in 0.4s ease;
        }
        .lh-timeline-title {
          font-weight: 800;
          font-size: 1.8rem;
          color: var(--dark-color);
          margin-bottom: 14px;
        }
        .lh-timeline-desc {
          color: var(--text-color);
          font-size: 1.05rem;
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
        .lh-journey-track {
          display: flex;
          align-items: stretch;
          gap: 0;
        }
        :global(.lh-journey-item) {
          flex: 1;
          min-width: 0;
        }
        .lh-journey-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--dark-grey-color);
          flex-shrink: 0;
          padding: 0 6px;
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
          .lh-journey-track {
            flex-direction: column;
            gap: 8px;
          }
          .lh-journey-arrow {
            transform: rotate(90deg);
            padding: 2px 0;
          }
        }
        @media (max-width: 576px) {
          .lh-section {
            padding: 48px 16px;
          }
        }
      `}</style>
    </section>
  );
};

export default JourneySection;
