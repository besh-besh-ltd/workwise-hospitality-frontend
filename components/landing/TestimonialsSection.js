import React from 'react';
import Slider from 'react-slick';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import Reveal from './Reveal';
import useMediaQuery from './useMediaQuery';
import { NAVY } from './theme';

const TestimonialsSection = ({ content }) => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const headingMarkup = (
    <>
      <span className="lh-eyebrow">{content.eyebrow}</span>
      <h2 className="lh-heading">{content.heading}</h2>
    </>
  );

  // With a single testimonial the marquee would just clone the same card across
  // every visible slot, so render it as one static centred card instead.
  const isSingle = content.items.length === 1;

  const sliderSettings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 6000,
    slidesToShow: Math.min(3, content.items.length),
    slidesToScroll: 1,
    autoplay: !prefersReducedMotion,
    autoplaySpeed: 0,
    cssEase: 'linear',
    pauseOnHover: true,
    swipeToSlide: true,
    responsive: [
      { breakpoint: 991, settings: { slidesToShow: Math.min(2, content.items.length) } },
      { breakpoint: 576, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <section id="lh-testimonials" className="lh-section">
      <div className="lh-section-inner">
        <Reveal className="lh-section-head">{headingMarkup}</Reveal>

        {isSingle ? (
          <div className="lh-testimonial-single">
            {content.items.map((item) => (
              <div key={item.author} className="lh-testimonial-slide">
                <TestimonialCard
                  quote={item.quote}
                  authorName={item.author}
                  authorTitle={item.position}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="lh-testimonial-marquee">
            <Slider {...sliderSettings}>
              {content.items.map((item) => (
                <div key={item.author} className="lh-testimonial-slide">
                  <TestimonialCard
                    quote={item.quote}
                    authorName={item.author}
                    authorTitle={item.position}
                  />
                </div>
              ))}
            </Slider>
          </div>
        )}
      </div>

      <style jsx>{`
        .lh-section {
          padding: 72px 20px;
          background: #ffffff;
          overflow: hidden;
        }
        .lh-section-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        :global(.lh-section-head) {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 44px;
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
          margin: 0;
        }
        .lh-testimonial-marquee :global(.slick-list) {
          margin: 0 -12px;
          overflow: visible;
        }
        .lh-testimonial-marquee :global(.slick-track) {
          display: flex;
          align-items: stretch;
        }
        .lh-testimonial-marquee :global(.slick-slide) {
          height: auto;
          display: flex;
        }
        .lh-testimonial-marquee :global(.slick-slide) > div {
          display: flex;
          width: 100%;
        }
        .lh-testimonial-slide {
          padding: 0 12px;
          width: 100%;
        }
        .lh-testimonial-single {
          display: flex;
          justify-content: center;
        }
        .lh-testimonial-single .lh-testimonial-slide {
          max-width: 620px;
          padding: 0;
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

export default TestimonialsSection;
