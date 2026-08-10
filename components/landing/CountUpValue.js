import React, { useEffect, useRef, useState } from 'react';
import useInView from './useInView';
import useMediaQuery from './useMediaQuery';

// Splits a display value like "6-9%", "75%" or "12,500+" into its numeric and
// literal parts so every number animates while the separators ("-", "%", "+",
// thousands commas) stay exactly as authored in the content file.
const parseSegments = (value) =>
  String(value)
    .split(/(\d[\d,]*)/)
    .filter((part) => part !== '')
    .map((part) => {
      if (!/^\d[\d,]*$/.test(part)) return { text: part };
      return { target: Number(part.replace(/,/g, '')), grouped: part.includes(',') };
    });

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const CountUpValue = ({ value, duration = 1600 }) => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [ref, inView] = useInView({ threshold: 0.4, rootMargin: '0px' });
  const segments = parseSegments(value);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!inView) return undefined;

    if (prefersReducedMotion) {
      setProgress(1);
      return undefined;
    }

    let startTime = null;
    const tick = (now) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const linear = Math.min(elapsed / duration, 1);
      setProgress(easeOutCubic(linear));
      if (linear < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [inView, duration, prefersReducedMotion]);

  return (
    <span ref={ref} className="lh-countup">
      {segments.map((segment, index) => {
        if (segment.text !== undefined) {
          return <React.Fragment key={index}>{segment.text}</React.Fragment>;
        }
        const current = Math.round(segment.target * progress);
        return (
          <React.Fragment key={index}>
            {segment.grouped ? current.toLocaleString('en-US') : String(current)}
          </React.Fragment>
        );
      })}
      <style jsx>{`
        .lh-countup {
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </span>
  );
};

export default CountUpValue;
