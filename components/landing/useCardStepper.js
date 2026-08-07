import { useEffect, useState } from 'react';
import { gsap, ScrollTrigger } from './gsapConfig';

const useCardStepper = ({ sectionRef, cardCount, enabled }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;
    const sectionEl = sectionRef.current;
    if (!sectionEl || cardCount < 1) return;

    // `scrub` only smooths an attached animation's playhead against scroll —
    // without one, ScrollTrigger's onUpdate reports raw, un-eased scroll
    // progress, so a fast fling jumps straight past intermediate steps.
    // This proxy tween gives scrub something to actually ease, so the index
    // computed from it lags behind raw scroll instead of mirroring it 1:1.
    const progressProxy = { value: 0 };
    const progressTween = gsap.to(progressProxy, {
      value: 1,
      ease: 'none',
      paused: true,
    });

    const st = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top top',
      end: () => `+=${window.innerHeight * cardCount * 1.2}`,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      animation: progressTween,
      scrub: 0.6,
      snap:
        cardCount > 1
          ? {
              snapTo: Array.from({ length: cardCount }, (_, i) => i / (cardCount - 1)),
              duration: 0.35,
              ease: 'power1.inOut',
            }
          : undefined,
      onUpdate: () => {
        const idx = Math.min(cardCount - 1, Math.floor(progressProxy.value * cardCount));
        setActiveIndex(idx);
      },
    });

    return () => {
      st.kill();
      progressTween.kill();
      setActiveIndex(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cardCount]);

  return activeIndex;
};

export default useCardStepper;
