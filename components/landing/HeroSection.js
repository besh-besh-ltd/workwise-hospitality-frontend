import React from 'react';
import { FiPlay, FiZap } from 'react-icons/fi';
import Reveal from './Reveal';
import CountUpValue from './CountUpValue';
import { NAVY_DARK, NAVY, NAVY_SOFT, GOLD } from './theme';

const HeroSection = ({ content, onBookDemo }) => {
  const hasVideo = Boolean(content.watchVideo.videoUrl);

  return (
    <section id="lh-hero" className="lh-hero">
      <div className="lh-hero-inner">
        <div className="lh-hero-main">
          <Reveal className="lh-hero-copy">
            <h1 className="lh-hero-title">{content.title}</h1>
            <p className="lh-hero-desc">{content.description}</p>

            <div className="lh-hero-cta">
              <button type="button" className="lh-hero-btn-primary" onClick={onBookDemo}>
                {content.bookDemoLabel}
              </button>
            </div>

            <div className="lh-hero-usp">
              <span className="lh-hero-usp-icon">
                <FiZap size={18} />
              </span>
              <div>
                <div className="lh-hero-usp-heading">{content.usp.heading}</div>
                <div className="lh-hero-usp-desc">{content.usp.description}</div>
              </div>
            </div>
          </Reveal>

          <Reveal className="lh-hero-video" delay={150}>
            <div className="lh-hero-video-frame">
              {hasVideo ? (
                <iframe
                  src={content.watchVideo.videoUrl}
                  title="Workwise product video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="lh-hero-video-placeholder">
                  <span className="lh-hero-video-play">
                    <FiPlay size={22} />
                  </span>
                  <span>Video coming soon</span>
                </div>
              )}
            </div>
          </Reveal>
        </div>

        <Reveal as="div" className="lh-hero-stats" delay={280}>
          {content.stats.map((stat) => (
            <div key={stat.label} className="lh-hero-stat-card">
              <div className="lh-hero-stat-value">
                <CountUpValue value={stat.value} />
              </div>
              <div className="lh-hero-stat-label">{stat.label}</div>
            </div>
          ))}
        </Reveal>
      </div>

      <style jsx>{`
        .lh-hero {
          background: linear-gradient(135deg, ${NAVY_DARK} 0%, ${NAVY} 55%, ${NAVY_SOFT} 100%);
          padding: 64px 20px;
          min-height: calc(100vh - 65px);
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }
        .lh-hero-inner {
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 48px;
        }
        .lh-hero-main {
          display: flex;
          align-items: center;
          gap: 48px;
        }
        :global(.lh-hero-video) {
          flex: 1;
          min-width: 0;
        }
        .lh-hero-video-frame {
          position: relative;
          width: 100%;
          padding-top: 66%;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .lh-hero-video-frame iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        .lh-hero-video-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.9rem;
        }
        .lh-hero-video-play {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        :global(.lh-hero-copy) {
          flex: 1.1;
          min-width: 0;
        }
        .lh-hero-title {
          color: #fff;
          font-weight: 800;
          font-size: clamp(2.2rem, 5vw, 3.4rem);
          line-height: 1.15;
          margin-bottom: 18px;
        }
        .lh-hero-desc {
          color: rgba(255, 255, 255, 0.9);
          font-size: clamp(1rem, 1.6vw, 1.15rem);
          line-height: 1.6;
          margin-bottom: 28px;
          max-width: 560px;
        }
        .lh-hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 32px;
        }
        .lh-hero-btn-primary {
          background: ${GOLD};
          color: ${NAVY_DARK};
          border: none;
          border-radius: 999px;
          padding: 14px 30px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }
        .lh-hero-usp {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 16px 20px;
          max-width: 520px;
          backdrop-filter: blur(6px);
        }
        .lh-hero-usp-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: ${GOLD}26;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${GOLD};
        }
        .lh-hero-usp-heading {
          color: #fff;
          font-weight: 700;
          font-size: 0.95rem;
          margin-bottom: 4px;
        }
        .lh-hero-usp-desc {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.85rem;
          line-height: 1.4;
        }
        :global(.lh-hero-stats) {
          display: flex;
          gap: 16px;
          max-width: 640px;
        }
        .lh-hero-stat-card {
          flex: 1;
          min-width: 0;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid ${GOLD}3d;
          border-radius: 14px;
          padding: 14px 12px;
          text-align: center;
          backdrop-filter: blur(6px);
        }
        .lh-hero-stat-value {
          color: #fff;
          font-weight: 800;
          font-size: 1.3rem;
          white-space: nowrap;
          margin-bottom: 2px;
        }
        .lh-hero-stat-label {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.75rem;
        }

        @media (max-width: 991px) {
          .lh-hero-main {
            flex-direction: column-reverse;
            align-items: stretch;
            gap: 36px;
          }
          :global(.lh-hero-stats) {
            max-width: none;
          }
        }
        @media (max-width: 576px) {
          .lh-hero {
            padding: 40px 16px 48px;
          }
          .lh-hero-inner {
            gap: 32px;
          }
          .lh-hero-cta {
            flex-direction: column;
          }
          .lh-hero-btn-primary {
            width: 100%;
            justify-content: center;
          }
          :global(.lh-hero-stats) {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
