import React from 'react';
import useInView from './useInView';

const Reveal = ({ as: Tag = 'div', delay = 0, className = '', children, ...props }) => {
  const [ref, inView] = useInView();

  return (
    <Tag
      ref={ref}
      className={`lh-reveal ${inView ? 'lh-reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...props}
    >
      {children}
      <style jsx>{`
        .lh-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
          will-change: opacity, transform;
        }
        .lh-reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .lh-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </Tag>
  );
};

export default Reveal;
